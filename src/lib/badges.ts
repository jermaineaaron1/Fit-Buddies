import { colors } from '../constants/theme'
import type { LeaderboardBadge } from '../types/app'

export interface BadgeInput {
  user_id: string
  current_streak: number
  weekLogCount: number
  weekChatCount: number
  hasRecentComeback: boolean
}

const STREAK_LEGEND_THRESHOLD = 14
const MIN_STREAK_FOR_CONSISTENT = 3

// Assigns at most one badge per member, in priority order. Ties go to whoever
// sorts first, which is fine here since these are lighthearted weekly crowns.
export function getLeaderboardBadges(members: BadgeInput[]): Record<string, LeaderboardBadge> {
  const badges: Record<string, LeaderboardBadge> = {}
  if (members.length === 0) return badges

  const topStreak = [...members].sort((a, b) => b.current_streak - a.current_streak)[0]
  if (topStreak.current_streak >= MIN_STREAK_FOR_CONSISTENT) {
    badges[topStreak.user_id] = 'Most Consistent'
  }

  const topLogger = [...members].sort((a, b) => b.weekLogCount - a.weekLogCount)[0]
  if (topLogger.weekLogCount > 0 && !badges[topLogger.user_id]) {
    badges[topLogger.user_id] = 'Top Logger'
  }

  const topChatter = [...members].sort((a, b) => b.weekChatCount - a.weekChatCount)[0]
  if (topChatter.weekChatCount > 0 && !badges[topChatter.user_id]) {
    badges[topChatter.user_id] = 'Encourager'
  }

  for (const m of members) {
    if (m.current_streak >= STREAK_LEGEND_THRESHOLD && !badges[m.user_id]) {
      badges[m.user_id] = 'Streak Legend'
    }
  }

  for (const m of members) {
    if (m.hasRecentComeback && !badges[m.user_id]) {
      badges[m.user_id] = 'Comeback Kid'
    }
  }

  return badges
}

export const BADGE_COLORS: Record<LeaderboardBadge, string> = {
  'Most Consistent': colors.accent,
  'Comeback Kid': colors.primary,
  'Encourager': '#EC4899',
  'Top Logger': colors.crimson,
  'Streak Legend': '#9B6FD9',
}
