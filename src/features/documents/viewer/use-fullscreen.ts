export interface FullscreenControls {
  /** False on native and in browsers where the Fullscreen API is blocked. */
  available: boolean;
  isFullscreen: boolean;
  /** `element` is the view ref to expand; ignored where fullscreen is unavailable. */
  toggle: (element: unknown) => void;
}

/**
 * Native build: fullscreen is a browser concept. The reader already fills the
 * screen on a phone, so there is nothing to expand into.
 */
export function useFullscreen(): FullscreenControls {
  return { available: false, isFullscreen: false, toggle: () => undefined };
}
