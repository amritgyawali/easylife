import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface VisualViewportRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

type VisualViewportGeometry = Pick<
  VisualViewport,
  'width' | 'height' | 'offsetTop' | 'offsetLeft' | 'pageTop' | 'pageLeft'
>;

/**
 * Converts browser viewport readings into coordinates relative to the layout
 * viewport that contains react-native-web's fixed modal.
 */
export function resolveVisualViewportRect(
  viewport: VisualViewportGeometry,
  scrollX: number,
  scrollY: number
): VisualViewportRect {
  return {
    width: viewport.width,
    height: viewport.height,
    // These pairs normally agree. The page-relative values are a fallback
    // for WebKit transitions where offsetTop/offsetLeft briefly remain zero
    // even though the visual viewport has already panned.
    top: Math.max(0, viewport.offsetTop, viewport.pageTop - scrollY),
    left: Math.max(0, viewport.offsetLeft, viewport.pageLeft - scrollX),
  };
}

/**
 * The browser rectangle that is actually visible, in layout-viewport pixels.
 * Returns `null` on native and in browsers without Visual Viewport support.
 *
 * react-native-web's `Modal` renders as a fixed layout-viewport overlay. A
 * software keyboard can both shrink and pan the visual viewport without
 * changing that layout viewport. A height-only correction therefore still
 * leaves the sheet above the visible screen when Safari changes `offsetTop`.
 *
 * Safari can publish the final offset shortly after the first event, so
 * updates are coalesced into an animation frame and sampled again while the
 * keyboard animation settles.
 */
export function useVisualViewport(): VisualViewportRect | null {
  // Keep static rendering and the first browser render identical. Reading
  // `window` during initialization would create hydration mismatches.
  const [rect, setRect] = useState<VisualViewportRect | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.visualViewport) return undefined;

    const viewport = window.visualViewport;
    let animationFrame: number | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let lateSettleTimer: ReturnType<typeof setTimeout> | null = null;

    const read = () => {
      animationFrame = null;
      const next = resolveVisualViewportRect(viewport, window.scrollX, window.scrollY);

      // Ignore transient zero-sized frames emitted while Safari changes its
      // browser chrome or software keyboard.
      if (next.width <= 0 || next.height <= 0) return;

      setRect((current) =>
        current &&
        current.width === next.width &&
        current.height === next.height &&
        current.top === next.top &&
        current.left === next.left
          ? current
          : next
      );
    };

    const schedule = () => {
      if (animationFrame == null) animationFrame = window.requestAnimationFrame(read);

      if (settleTimer != null) clearTimeout(settleTimer);
      if (lateSettleTimer != null) clearTimeout(lateSettleTimer);
      settleTimer = setTimeout(read, 50);
      lateSettleTimer = setTimeout(read, 350);
    };

    read();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);

    return () => {
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      if (animationFrame != null) window.cancelAnimationFrame(animationFrame);
      if (settleTimer != null) clearTimeout(settleTimer);
      if (lateSettleTimer != null) clearTimeout(lateSettleTimer);
    };
  }, []);

  return rect;
}
