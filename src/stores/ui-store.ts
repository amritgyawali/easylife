import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UiState {
  /** Desktop sidebar shown as a narrow icon rail instead of full labels. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

/**
 * Chrome-level UI preferences that must survive navigation.
 *
 * Each route segment mounts its own `AppShell`, so component state would reset
 * the sidebar every time you moved between sections — the collapse choice has
 * to live outside the tree. Like the theme store this is pure UI state; domain
 * data always goes through TanStack Query and the repository layer.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    {
      name: 'lifeos-ui-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
