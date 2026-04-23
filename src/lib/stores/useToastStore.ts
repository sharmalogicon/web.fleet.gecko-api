import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastStore {
  toasts: ToastItem[]
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  dismiss: (id: string) => void
}

function addToast(
  set: (fn: (s: ToastStore) => Partial<ToastStore>) => void,
  type: ToastType,
  title: string,
  message?: string,
) {
  const id = `${Date.now()}-${Math.random()}`
  set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }))
  setTimeout(() => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }, 5000)
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  success: (title, message) => addToast(set, 'success', title, message),
  error: (title, message) => addToast(set, 'error', title, message),
  warning: (title, message) => addToast(set, 'warning', title, message),
  info: (title, message) => addToast(set, 'info', title, message),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
