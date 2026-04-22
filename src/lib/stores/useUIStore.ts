'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  notificationsPanelOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleNotifications: () => void;
  closeNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      notificationsPanelOpen: false,

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed,
      })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),

      toggleNotifications: () => set((state) => ({
        notificationsPanelOpen: !state.notificationsPanelOpen,
      })),
      closeNotifications: () => set({ notificationsPanelOpen: false }),
    }),
    {
      name: 'gecko-fleet-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
