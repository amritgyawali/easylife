/**
 * Universal design tokens shared by every platform (Android, iOS, web).
 * Deliberately framework-free (plain objects) so they work identically with
 * RN StyleSheet, inline styles, and react-native-web — no styling-library
 * lock-in. Financial screens lean on `semantic` colors so red/green usage
 * for money is centralized and consistent everywhere.
 */

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * 4pt spacing scale. Every gap, padding and margin in the app resolves to one
 * of these — arbitrary pixel values in feature code are what makes a UI look
 * subtly "off" even when nothing is obviously wrong.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Corner radii. The scale is deliberately generous: soft, large radii on
 * containers with tighter radii on the controls inside them is what reads as
 * "modern" rather than "bootstrap", and keeping the relationship consistent
 * (control radius ≈ container radius − padding) stops nested corners from
 * looking pinched.
 */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * System font stacks. No custom font is bundled on purpose — the platform UI
 * font is already optimised for each device's rendering pipeline, loads with
 * zero network cost, and respects the user's own font settings. On web the
 * stack prefers whatever the OS ships so the app matches its host.
 */
export const fontFamily = {
  sans: Platform.select({
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    default: undefined,
  }),
  /**
   * Monospace-ish stack for amounts in tables. Pair with `tabularNumbers`
   * below — figures that share a width keep decimal points aligned down a
   * column, which is the single biggest legibility win on a ledger.
   */
  mono: Platform.select({
    web: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    ios: 'Menlo',
    android: 'monospace',
    default: undefined,
  }),
} as const;

/**
 * Fixed-width digits. RN honours `fontVariant` on iOS and react-native-web
 * maps it to the CSS `font-variant-numeric` property; Android ignores it
 * harmlessly, so it is safe to apply everywhere money is rendered.
 */
export const tabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };

/** Minimum touch target size (Apple HIG / Material both recommend 44-48dp). */
export const minTouchTarget = 44;

/** Control heights, so inputs, buttons and selects line up on the same row. */
export const controlHeight = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

/**
 * Animation durations in ms. Kept short — interface feedback that outlasts
 * ~250ms reads as lag rather than polish.
 */
export const duration = {
  instant: 90,
  fast: 140,
  normal: 200,
  slow: 320,
} as const;

/** Layout constants shared by the shell and the page container. */
export const layout = {
  /** Content column cap on wide viewports, so a list never spans 2000px. */
  maxContentWidth: 1120,
  /** Narrower cap for reading-heavy and form-heavy screens. */
  maxProseWidth: 760,
  sidebarWidth: 268,
  sidebarCollapsedWidth: 76,
  topBarHeight: 60,
} as const;

const palette = {
  white: '#FFFFFF',
  black: '#05070C',

  /* Cool neutral ramp — a trace of blue keeps large surfaces from looking
     dingy next to the accent, which pure grey does. */
  gray0: '#FFFFFF',
  gray25: '#FBFCFE',
  gray50: '#F6F8FC',
  gray100: '#EFF2F7',
  gray150: '#E7EBF2',
  gray200: '#DFE4ED',
  gray300: '#CBD2E0',
  gray400: '#98A2B8',
  gray500: '#6B7590',
  gray600: '#4E5871',
  gray700: '#38415A',
  gray800: '#222A3D',
  gray900: '#131A2A',
  gray950: '#0B111C',

  indigo50: '#EEF1FE',
  indigo100: '#E0E5FD',
  indigo200: '#C6CEFB',
  indigo400: '#8B9CFF',
  indigo500: '#4F5AE8',
  indigo600: '#3F49D1',
  indigo700: '#333BAC',

  green500: '#0B7D5C',
  green400: '#3DD6A0',
  green50: '#E4F6EE',

  red500: '#CE2C41',
  red400: '#F87389',
  red50: '#FDEAEC',

  amber500: '#A8630A',
  amber400: '#F0A94E',
  amber50: '#FDF2E3',

  violet500: '#7A46D1',
  violet400: '#B48BF5',
  violet50: '#F2ECFD',
};

export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    /** App canvas, behind every surface. */
    background: string;
    /** Cards, sheets, inputs — the default raised plane. */
    surface: string;
    /** Subtle fills: table header rows, chips, pressed states. */
    surfaceAlt: string;
    /** A step further from the canvas, for popovers and menus above cards. */
    surfaceElevated: string;
    /** Recessed wells — code blocks, table bodies inside a card. */
    surfaceSunken: string;
    /** Navigation chrome (sidebar, tab bar). */
    surfaceNav: string;
    /** Hairline dividers and input outlines. */
    border: string;
    /** Higher-contrast outline for focused or emphasised containers. */
    borderStrong: string;
    /** Modal scrim. */
    scrim: string;
    text: string;
    textMuted: string;
    /** Third-level text: timestamps, table captions, helper copy. */
    textSubtle: string;
    textInverse: string;
    primary: string;
    primaryHover: string;
    primaryText: string;
    /** Tinted primary fill for selected chips, active nav, soft buttons. */
    accentSurface: string;
    /** Use for gains / income / credit — always pair with an icon or "+", never rely on color alone. */
    positive: string;
    positiveSurface: string;
    /** Use for losses / expense / debit — always pair with an icon or "-", never rely on color alone. */
    negative: string;
    negativeSurface: string;
    warning: string;
    warningSurface: string;
    /** Informational, non-urgent highlights (tips, "new" markers). */
    info: string;
    infoSurface: string;
    focus: string;
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: palette.gray50,
    surface: palette.white,
    surfaceAlt: palette.gray100,
    surfaceElevated: palette.white,
    surfaceSunken: palette.gray25,
    surfaceNav: palette.white,
    border: palette.gray200,
    borderStrong: palette.gray300,
    scrim: 'rgba(11, 17, 28, 0.45)',
    text: palette.gray900,
    textMuted: palette.gray500,
    textSubtle: palette.gray400,
    textInverse: palette.white,
    primary: palette.indigo500,
    primaryHover: palette.indigo600,
    primaryText: palette.white,
    accentSurface: palette.indigo50,
    positive: palette.green500,
    positiveSurface: palette.green50,
    negative: palette.red500,
    negativeSurface: palette.red50,
    warning: palette.amber500,
    warningSurface: palette.amber50,
    info: palette.violet500,
    infoSurface: palette.violet50,
    focus: palette.indigo500,
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: palette.gray950,
    surface: '#141B29',
    surfaceAlt: '#1D2536',
    surfaceElevated: '#212B3D',
    surfaceSunken: '#0F1623',
    surfaceNav: '#111827',
    border: '#28324A',
    borderStrong: '#3A4560',
    scrim: 'rgba(3, 6, 12, 0.66)',
    text: '#EAEEF7',
    textMuted: palette.gray400,
    textSubtle: '#78829B',
    textInverse: palette.gray950,
    primary: palette.indigo400,
    primaryHover: '#A5B2FF',
    primaryText: palette.gray950,
    accentSurface: '#1E2543',
    positive: palette.green400,
    positiveSurface: '#0D2C22',
    negative: palette.red400,
    negativeSurface: '#38151F',
    warning: palette.amber400,
    warningSurface: '#372510',
    info: palette.violet400,
    infoSurface: '#241A3D',
    focus: palette.indigo400,
  },
};

export function getTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export type ElevationLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Cross-platform elevation.
 *
 * The `shadow*` props cover iOS and — through react-native-web's
 * translation to `box-shadow` — the browser; `elevation` covers Android,
 * which ignores the rest. Dark mode needs its own opacities: a shadow tuned
 * for a white canvas is invisible on a near-black one, so dark surfaces lean
 * on deeper, tighter shadows to read as lifted at all.
 */
export function elevation(level: ElevationLevel, mode: Theme['mode'] = 'light'): ViewStyle {
  if (level === 'none') return {};

  const dark = mode === 'dark';
  const spec = {
    sm: { y: 1, blur: 3, opacity: dark ? 0.5 : 0.06, android: 1 },
    md: { y: 4, blur: 12, opacity: dark ? 0.55 : 0.08, android: 3 },
    lg: { y: 10, blur: 26, opacity: dark ? 0.62 : 0.1, android: 8 },
    xl: { y: 20, blur: 44, opacity: dark ? 0.7 : 0.14, android: 16 },
  }[level];

  return {
    shadowColor: dark ? '#000000' : '#0B111C',
    shadowOffset: { width: 0, height: spec.y },
    shadowOpacity: spec.opacity,
    shadowRadius: spec.blur,
    elevation: spec.android,
  };
}

/**
 * Keyboard focus ring for web. Native platforms draw their own focus
 * affordances, so this is a no-op there rather than a competing outline.
 */
export function focusRing(color: string): ViewStyle {
  if (Platform.OS !== 'web') return {};
  return {
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: color,
    outlineOffset: 2,
  } as ViewStyle;
}

/**
 * Applies a CSS transition on web only. Passing style properties through
 * `transitionProperty` keeps hover/press states from snapping, which is most
 * of what separates a polished web build from a ported mobile one.
 */
export function transition(properties = 'background-color, border-color, box-shadow, transform, opacity') {
  if (Platform.OS !== 'web') return {};
  return {
    transitionProperty: properties,
    transitionDuration: `${duration.fast}ms`,
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0.1, 1)',
  } as ViewStyle;
}
