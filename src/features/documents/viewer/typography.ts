import { Platform } from 'react-native';

/**
 * Reading a statement, a log or a CSV depends on columns lining up, so the
 * text views use a monospace face on every platform.
 */
export const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
}) as string;

/** Comfortable base size for dense text; the zoom control scales from here. */
export const BASE_MONOSPACE_SIZE = 13;

/** Line box for that base size, scaled with the font. */
export const MONOSPACE_LINE_HEIGHT_RATIO = 1.5;

/**
 * Width of one monospace character, used to size a no-wrap text canvas and
 * table columns without measuring every string.
 *
 * 0.6 em is the advance width of the fixed-width faces above; a few percent
 * of slack is added so a long line never ends up a hair too wide to reach.
 */
export function monospaceCharWidth(fontSize: number): number {
  return fontSize * 0.62;
}

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2.4;
export const ZOOM_STEP = 0.2;

export function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}
