/**
 * Universal design tokens shared by every platform (Android, iOS, web).
 * Deliberately framework-free (plain objects) so they work identically with
 * RN StyleSheet, inline styles, and react-native-web — no styling-library
 * lock-in. Financial screens lean on `semantic` colors so red/green usage
 * for money is centralized and consistent everywhere.
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

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum touch target size (Apple HIG / Material both recommend 44-48dp). */
export const minTouchTarget = 44;

/**
 * Control heights. Every interactive control (button, input, select chip)
 * snaps to one of these so a row of mixed controls lines up perfectly instead
 * of each one sizing itself from its own padding.
 */
export const controlHeight = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

/**
 * Layout constants for the responsive shell. Breakpoints are deliberately few:
 * `md` switches mobile tabs for the desktop sidebar, `lg` expands the sidebar
 * from an icon rail to full labels, `xl` unlocks the widest content column.
 */
export const breakpoint = {
  sm: 480,
  md: 768,
  lg: 1080,
  xl: 1400,
} as const;

export const layout = {
  /** Max width of a reading/forms column — long lines are hard to scan. */
  narrow: 560,
  /** Default content column for list + detail screens. */
  content: 980,
  /** Dashboard-style screens that benefit from multiple columns. */
  wide: 1320,
  sidebarWidth: 260,
  sidebarRailWidth: 76,
  topBarHeight: 60,
  /** Floating quick-add button diameter. */
  fabSize: 56,
} as const;

/** Animation timings — kept short; anything longer feels laggy on mobile web. */
export const duration = {
  fast: 120,
  normal: 200,
  slow: 320,
} as const;

const palette = {
  white: '#FFFFFF',
  black: '#0A0A0A',
  gray50: '#F7F8FA',
  gray100: '#EFF1F5',
  gray200: '#E3E6EC',
  gray300: '#CFD4DE',
  gray400: '#98A2B3',
  gray500: '#667085',
  gray600: '#475467',
  gray700: '#344054',
  gray800: '#1D2939',
  gray900: '#101828',
  blue500: '#2563EB',
  blue600: '#1D4ED8',
  blue100: '#E6EEFF',
  green500: '#0F7B57',
  green100: '#E1F5EC',
  red500: '#C7283C',
  red100: '#FCE8EA',
  amber500: '#A85C08',
  amber100: '#FDF1E1',
};

export interface Elevation {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    /** Page background, behind all surfaces. */
    background: string;
    /** Cards, sheets, inputs — the raised plane. */
    surface: string;
    /** Subtle fills: secondary buttons, chips, hovered rows. */
    surfaceAlt: string;
    /** Recessed areas (table headers, code, inset panels). */
    surfaceSunken: string;
    /** Pressed / hovered state for rows and nav items. */
    surfaceHover: string;
    border: string;
    /** Higher-contrast border for focused or selected chrome. */
    borderStrong: string;
    text: string;
    textMuted: string;
    /** Even quieter than muted — timestamps, units, helper microcopy. */
    textSubtle: string;
    textInverse: string;
    primary: string;
    primaryHover: string;
    primaryText: string;
    accentSurface: string;
    /** Use for gains / income / credit — always pair with an icon or "+", never rely on color alone. */
    positive: string;
    positiveSurface: string;
    /** Use for losses / expense / debit — always pair with an icon or "-", never rely on color alone. */
    negative: string;
    negativeSurface: string;
    warning: string;
    warningSurface: string;
    focus: string;
    /** Modal scrim. */
    overlay: string;
  };
  /** Shadow presets. Dark mode leans on borders instead of large soft shadows. */
  elevation: {
    none: Elevation;
    sm: Elevation;
    md: Elevation;
    lg: Elevation;
  };
}

const noElevation: Elevation = {
  shadowColor: 'transparent',
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  elevation: 0,
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: palette.gray50,
    surface: palette.white,
    surfaceAlt: palette.gray100,
    surfaceSunken: palette.gray100,
    surfaceHover: palette.gray100,
    border: palette.gray200,
    borderStrong: palette.gray300,
    text: palette.gray900,
    textMuted: palette.gray500,
    textSubtle: palette.gray400,
    textInverse: palette.white,
    primary: palette.blue500,
    primaryHover: palette.blue600,
    primaryText: palette.white,
    accentSurface: palette.blue100,
    positive: palette.green500,
    positiveSurface: palette.green100,
    negative: palette.red500,
    negativeSurface: palette.red100,
    warning: palette.amber500,
    warningSurface: palette.amber100,
    focus: palette.blue500,
    overlay: 'rgba(16, 24, 40, 0.45)',
  },
  elevation: {
    none: noElevation,
    sm: {
      shadowColor: '#101828',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    md: {
      shadowColor: '#101828',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    lg: {
      shadowColor: '#101828',
      shadowOpacity: 0.14,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0C111C',
    surface: '#151B27',
    surfaceAlt: '#1D2534',
    surfaceSunken: '#111725',
    surfaceHover: '#222B3C',
    border: '#293346',
    borderStrong: '#3A465E',
    text: '#F2F4F8',
    textMuted: '#98A2B3',
    textSubtle: '#7A8598',
    textInverse: '#0C111C',
    primary: '#6D9DFF',
    primaryHover: '#8AB1FF',
    primaryText: '#0B1220',
    accentSurface: '#17264A',
    positive: '#43D6A0',
    positiveSurface: '#0E2E25',
    negative: '#FF8095',
    negativeSurface: '#3A1622',
    warning: '#F5B45C',
    warningSurface: '#3A2712',
    focus: '#6D9DFF',
    overlay: 'rgba(3, 7, 18, 0.66)',
  },
  elevation: {
    none: noElevation,
    sm: {
      shadowColor: '#000000',
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOpacity: 0.42,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    lg: {
      shadowColor: '#000000',
      shadowOpacity: 0.55,
      shadowRadius: 34,
      shadowOffset: { width: 0, height: 14 },
      elevation: 14,
    },
  },
};

export function getTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
