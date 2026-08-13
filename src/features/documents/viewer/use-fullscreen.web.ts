import { useCallback, useEffect, useState } from 'react';

import type { FullscreenControls } from '@/features/documents/viewer/use-fullscreen';

/**
 * Distraction-free reading: expands the viewer pane itself, not the tab.
 *
 * Availability is read after mount rather than during render — the static web
 * export evaluates this module in Node, where there is no `document`, and a
 * value that differs between the server and the first client render would
 * fail hydration.
 */
export function useFullscreen(): FullscreenControls {
  const [available, setAvailable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    setAvailable(Boolean(document.fullscreenEnabled));

    // Covers the Escape key and the browser's own exit affordance, which
    // leave fullscreen without going through `toggle`.
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();

    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback((element: unknown) => {
    if (typeof document === 'undefined') return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
      return;
    }

    // On web a react-native View's ref *is* its DOM node.
    const node = element as HTMLElement | null;
    if (!node || typeof node.requestFullscreen !== 'function') return;

    void node.requestFullscreen().catch(() => undefined);
  }, []);

  return { available, isFullscreen, toggle };
}
