import { Platform, type ViewStyle } from 'react-native';

/**
 * Pressable state as react-native-web actually reports it.
 *
 * React Native's own types only declare `pressed`, but on web every Pressable
 * also receives `hovered` and `focused` — which is exactly what makes a
 * desktop UI feel alive (row highlights, button hovers, keyboard focus rings).
 * Rather than sprinkle `as any` across every component, callers take this
 * type and read the extra flags through `pressState`.
 */
export interface PressState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
}

export function pressState(state: unknown): PressState {
  const value = (state ?? {}) as Partial<PressState>;
  return {
    pressed: Boolean(value.pressed),
    hovered: Boolean(value.hovered),
    focused: Boolean(value.focused),
  };
}

/**
 * Styles that only exist in the browser (CSS outlines, transitions, cursors).
 * They are no-ops on native, so this keeps the platform check in one place
 * instead of a `Platform.select` at every call site.
 */
export function webStyle(style: Record<string, unknown>): ViewStyle {
  return Platform.OS === 'web' ? (style as ViewStyle) : {};
}

/**
 * Visible keyboard focus indicator. Browsers draw a default outline, but it
 * lands on the wrong element (the inner text node) and is invisible on dark
 * backgrounds, so every interactive component in the app draws its own.
 */
export function focusRing(color: string, visible: boolean, offset = 2): ViewStyle {
  return webStyle({
    outlineStyle: visible ? 'solid' : 'none',
    outlineWidth: visible ? 2 : 0,
    outlineColor: color,
    outlineOffset: offset,
  });
}

/** Smooth hover/press feedback on web; native uses its own press ripple/opacity. */
export function transition(
  properties = 'background-color, border-color, color, transform, opacity, box-shadow',
  ms = 140
): ViewStyle {
  return webStyle({
    transitionProperty: properties,
    transitionDuration: `${ms}ms`,
    transitionTimingFunction: 'ease-out',
  });
}

/** Pointer cursor for anything clickable that isn't a native <button>/<a>. */
export function clickable(enabled = true): ViewStyle {
  return webStyle({ cursor: enabled ? 'pointer' : 'default', userSelect: 'none' });
}
