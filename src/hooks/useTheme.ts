import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/theme-store';
import { getTheme, type Theme } from '@/constants/theme';

/** Resolves the active theme from the user's preference + OS color scheme. */
export function useTheme(): Theme {
  const preference = useThemeStore((state) => state.preference);
  const systemScheme = useColorScheme();

  const mode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return getTheme(mode);
}
