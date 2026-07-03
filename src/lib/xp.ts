import { supabase } from './supabase'
import { XP_VALUES, getStreakMultiplier, getLevelFromXP } from '../constants/xp'
import type { XPActionType } from '../types/app'

interface AwardXPParams {
  userId: string
  circleId: string
  actionType: XPActionType
  referenceId?: string
  description?: string
  overrideAmount?: number
}

export async function awardXP(params: AwardXPParams): Promise<number> {
  const { userId, circleId, actionType, referenceId, description, overrideAmount } = params

  let baseXP = overrideAmount ?? getBaseXP(actionType)

  // Apply streak multiplier to streak_bonus only
  if (actionType === 'streak_bonus') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', userId)
      .single()

    const multiplier = getStreakMultiplier(profile?.current_streak ?? 0)
    baseXP = Math.round(baseXP * multiplier)
  }

  // Insert XP event
  await supabase.from('xp_events').insert({
    user_id: userId,
    circle_id: circleId,
    action_type: actionType,
    xp_amount: baseXP,
    description: description ?? actionType,
    reference_id: referenceId ?? null,
  })

  // Update profile totals
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, weekly_xp')
    .eq('id', userId)
    .single()

  const newTotal = (profile?.total_xp ?? 0) + baseXP
  const newWeekly = (profile?.weekly_xp ?? 0) + baseXP
  const newLevel = getLevelFromXP(newTotal)

  await supabase
    .from('profiles')
    .update({
      total_xp: newTotal,
      weekly_xp: newWeekly,
      level: newLevel,
      last_active_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', userId)

  return baseXP
}

function getBaseXP(actionType: XPActionType): number {
  const map: Record<XPActionType, number> = {
    workout: XP_VALUES.WORKOUT,
    meal: XP_VALUES.MEAL_LOG,
    steps: XP_VALUES.STEPS_LOGGED,
    quest: XP_VALUES.QUEST_COMPLETE,
    chat: XP_VALUES.CHAT_MESSAGE,
    streak_bonus: XP_VALUES.STREAK_BONUS,
    comeback: XP_VALUES.COMEBACK_BONUS,
    recipe: XP_VALUES.RECIPE_POST,
    grocery_post: XP_VALUES.GROCERY_POST,
    supplement_post: XP_VALUES.SUPPLEMENT_POST,
  }
  return map[actionType] ?? 0
}

export async function handleStreakAndComeback(userId: string, circleId: string): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date')
    .eq('id', userId)
    .single()

  if (!profile) return

  const today = new Date().toISOString().split('T')[0]
  const lastActive = profile.last_active_date

  if (lastActive === today) return // Already logged today

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const isConsecutive = lastActive === yesterday
  const isComebackEligible = lastActive !== null && lastActive < yesterday

  let newStreak = isConsecutive ? profile.current_streak + 1 : 1

  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, profile.longest_streak),
    })
    .eq('id', userId)

  // Award streak bonus
  await awardXP({ userId, circleId, actionType: 'streak_bonus', description: `Day ${newStreak} streak bonus` })

  // Award comeback bonus if returning after a gap
  if (isComebackEligible) {
    await awardXP({ userId, circleId, actionType: 'comeback', description: 'Comeback bonus' })
  }
}
