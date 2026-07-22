import { create } from 'zustand';

interface AppLockState {
  isLocked: boolean;
  lastBackgroundedAt: number | null;
  lock: () => void;
  unlock: () => void;
  recordBackgrounded: () => void;
}

/**
 * Ephemeral (non-persisted) app-lock state. Deliberately not persisted to
 * storage — a fresh process launch should always re-evaluate whether to
 * lock based on the user's auto-lock preference, not resume an unlocked
 * state from before the app was killed.
 */
export const useAppLockStore = create<AppLockState>((set) => ({
  isLocked: false,
  lastBackgroundedAt: null,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false, lastBackgroundedAt: null }),
  recordBackgrounded: () => set({ lastBackgroundedAt: Date.now() }),
}));
