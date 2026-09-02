import { create } from 'zustand'
import type { XPEvent } from '../types/app'
import { supabase } from '../lib/supabase'

interface XPState {
  recentEvents: XPEvent[]
  weeklyXP: number
  totalXP: number
  level: number
  loading: boolean
  levelUpPending: number | null
  fetchRecentEvents: (userId: string, circleId: string) => Promise<void>
  triggerLevelUp: (newLevel: number) => void
  clearLevelUp: () => void
}

export const useXPStore = create<XPState>((set) => ({
  recentEvents: [],
  weeklyXP: 0,
  totalXP: 0,
  level: 1,
  loading: false,
  levelUpPending: null,

  fetchRecentEvents: async (userId, circleId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('xp_events')
      .select('*')
      .eq('user_id', userId)
      .eq('circle_id', circleId)
      .order('created_at', { ascending: false })
      .limit(20)

    set({ recentEvents: data ?? [], loading: false })
  },

  triggerLevelUp: (newLevel) => set({ levelUpPending: newLevel }),
  clearLevelUp: () => set({ levelUpPending: null }),
}))
