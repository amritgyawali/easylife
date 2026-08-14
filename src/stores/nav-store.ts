import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NavState {
  /** Desktop sidebar collapsed to icons only. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

/**
 * Pure UI preference state, like the theme store — never domain data.
 *
 * It has to live outside the component tree because every route segment
 * mounts its own `AppShell`; local state would reset the sidebar to expanded
 * on each navigation between sections.
 */
export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'lifeos-nav-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
