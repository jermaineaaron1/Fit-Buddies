import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useCircleStore } from '../store/circleStore'
import { useXPStore } from '../store/xpStore'
import { awardXP, handleStreakAndComeback } from '../lib/xp'
import type { XPActionType } from '../types/app'

export function useXP() {
  const { user, profile, fetchProfile } = useAuthStore()
  const { circle } = useCircleStore()
  const { recentEvents, loading, fetchRecentEvents, triggerLevelUp } = useXPStore()

  useEffect(() => {
    if (user?.id && circle?.id) {
      fetchRecentEvents(user.id, circle.id)
    }
  }, [user?.id, circle?.id])

  async function earn(actionType: XPActionType, referenceId?: string, description?: string, overrideAmount?: number): Promise<number> {
    if (!user?.id || !circle?.id) return 0

    // Handle streak logic on first action of the day
    await handleStreakAndComeback(user.id, circle.id)

    const result = await awardXP({
      userId: user.id,
      circleId: circle.id,
      actionType,
      referenceId,
      description,
      overrideAmount,
    })

    // Refresh profile so XP bar updates
    await fetchProfile(user.id)
    fetchRecentEvents(user.id, circle.id)

    if (result.leveledUp) triggerLevelUp(result.newLevel)

    return result.xpEarned
  }

  return {
    recentEvents,
    loading,
    weeklyXP: profile?.weekly_xp ?? 0,
    totalXP: profile?.total_xp ?? 0,
    level: profile?.level ?? 1,
    streak: profile?.current_streak ?? 0,
    earn,
  }
}
