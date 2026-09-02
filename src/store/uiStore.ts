import { create } from 'zustand'

interface UIState {
  /** Quick Log — a bottom sheet on phone, a right-side panel on desktop. */
  quickLogOpen: boolean
  openQuickLog: () => void
  closeQuickLog: () => void
  /** Overflow destinations that do not fit the five-item bottom bar. */
  moreMenuOpen: boolean
  setMoreMenuOpen: (open: boolean) => void
}

/**
 * Chrome that more than one component has to drive. Quick Log is opened from
 * the bottom bar on phone and from the header on desktop, and rendered once in
 * the app layout — so its open state cannot live in either of them.
 */
export const useUIStore = create<UIState>((set) => ({
  quickLogOpen: false,
  openQuickLog: () => set({ quickLogOpen: true, moreMenuOpen: false }),
  closeQuickLog: () => set({ quickLogOpen: false }),
  moreMenuOpen: false,
  setMoreMenuOpen: (moreMenuOpen) => set({ moreMenuOpen }),
}))
