import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Pointer-hover state for `Pressable`.
 *
 * Hover is a web-only affordance — touch devices have no hover state and
 * firing one there produces "sticky" highlights that stay lit after a tap.
 * The returned props are therefore empty off web, and are deliberately typed
 * as `object` so they can be spread onto `Pressable` on every platform
 * regardless of whether the native typings expose `onHoverIn`/`onHoverOut`.
 */
export function useHover(): { hovered: boolean; hoverProps: object } {
  const [hovered, setHovered] = useState(false);

  const onHoverIn = useCallback(() => setHovered(true), []);
  const onHoverOut = useCallback(() => setHovered(false), []);

  const hoverProps = useMemo(
    () => (Platform.OS === 'web' ? { onHoverIn, onHoverOut } : {}),
    [onHoverIn, onHoverOut]
  );

  return { hovered: Platform.OS === 'web' && hovered, hoverProps };
}
