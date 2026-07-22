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
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
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

const palette = {
  white: '#FFFFFF',
  black: '#0A0A0A',
  gray50: '#F8F9FB',
  gray100: '#F1F3F6',
  gray200: '#E4E7EC',
  gray300: '#D0D5DD',
  gray400: '#98A2B3',
  gray500: '#667085',
  gray600: '#475467',
  gray700: '#344054',
  gray800: '#1D2939',
  gray900: '#101828',
  blue500: '#0B5FFF',
  blue600: '#0047D6',
  blue100: '#E5EEFF',
  green500: '#12805C',
  green100: '#E3F6EE',
  red500: '#D1293D',
  red100: '#FCE8EA',
  amber500: '#B25E09',
  amber100: '#FDF1E1',
};

export interface Theme {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textInverse: string;
    primary: string;
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
  };
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: palette.gray50,
    surface: palette.white,
    surfaceAlt: palette.gray100,
    border: palette.gray200,
    text: palette.gray900,
    textMuted: palette.gray500,
    textInverse: palette.white,
    primary: palette.blue500,
    primaryText: palette.white,
    accentSurface: palette.blue100,
    positive: palette.green500,
    positiveSurface: palette.green100,
    negative: palette.red500,
    negativeSurface: palette.red100,
    warning: palette.amber500,
    warningSurface: palette.amber100,
    focus: palette.blue500,
  },
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: palette.gray900,
    surface: '#161B26',
    surfaceAlt: '#1D2433',
    border: '#2A3345',
    text: palette.gray50,
    textMuted: palette.gray400,
    textInverse: palette.gray900,
    primary: '#5B93FF',
    primaryText: palette.gray900,
    accentSurface: '#1A2C52',
    positive: '#3DD68C',
    positiveSurface: '#0F2E22',
    negative: '#F27389',
    negativeSurface: '#3A1620',
    warning: '#F0A94E',
    warningSurface: '#3A2610',
    focus: '#5B93FF',
  },
};

export function getTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
