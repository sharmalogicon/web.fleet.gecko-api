'use client';

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * The branch the user is working at, remembered per user id (two people on one PC keep
 * their own choice). Storage can be blocked (private window): then it is simply not remembered.
 */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // storage blocked: keep it in memory only
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // storage blocked
    }
  },
};

interface BranchState {
  /** userId → branchId */
  byUser: Record<string, string>;
  setBranch: (userId: string, branchId: string) => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      byUser: {},
      setBranch: (userId, branchId) => set((s) => ({ byUser: { ...s.byUser, [userId]: branchId } })),
    }),
    { name: 'gecko-fleet-branch', storage: createJSONStorage(() => safeStorage) },
  ),
);
