import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Pure UI preference state — deliberately separate from server/domain data.
 * Business data (accounts, transactions, tasks, ...) must always go through
 * TanStack Query + the repository layer, never through a Zustand store; this
 * store exists only for ephemeral/local UI state like the theme choice.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'lifeos-theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
