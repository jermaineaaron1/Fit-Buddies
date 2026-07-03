import { create } from 'zustand'
import type { Circle, CircleMemberWithProfile } from '../types/app'
import { supabase } from '../lib/supabase'

interface CircleState {
  circle: Circle | null
  members: CircleMemberWithProfile[]
  loading: boolean
  setCircle: (circle: Circle | null) => void
  fetchCircle: (userId: string) => Promise<void>
  fetchMembers: (circleId: string) => Promise<void>
  clearCircle: () => void
}

export const useCircleStore = create<CircleState>((set) => ({
  circle: null,
  members: [],
  loading: false,

  setCircle: (circle) => set({ circle }),

  fetchCircle: async (userId) => {
    set({ loading: true })
    // Get the first active circle the user belongs to
    const { data } = await supabase
      .from('circle_members')
      .select('circle_id, circles(*)')
      .eq('user_id', userId)
      .limit(1)
      .single()

    const circle = (data?.circles as unknown as Circle) ?? null
    set({ circle, loading: false })
  },

  fetchMembers: async (circleId) => {
    const { data } = await supabase
      .from('circle_members')
      .select('*, profile:profiles(*)')
      .eq('circle_id', circleId)

    set({ members: (data as unknown as CircleMemberWithProfile[]) ?? [] })
  },

  clearCircle: () => set({ circle: null, members: [] }),
}))
