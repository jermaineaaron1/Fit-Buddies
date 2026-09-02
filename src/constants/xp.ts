export const XP_VALUES = {
  WORKOUT: 50,
  MEAL_LOG: 15,
  STEPS_GOAL_HIT: 30,
  STEPS_LOGGED: 10,
  SLEEP: 20,
  QUEST_COMPLETE: 20,
  RECIPE_POST: 25,
  GROCERY_POST: 10,
  SUPPLEMENT_POST: 10,
  CHAT_MESSAGE: 5,      // capped at 5 messages/day
  STREAK_BONUS: 10,     // per day, multiplied below
  COMEBACK_BONUS: 40,
} as const

export const STREAK_MULTIPLIERS = {
  DEFAULT: 1.0,         // day 1–6
  WEEK: 1.5,            // day 7–29
  MONTH: 2.0,           // day 30+
} as const

export const LEVEL_THRESHOLDS = [
  { level: 1, min: 0,    label: 'Rookie' },
  { level: 2, min: 300,  label: 'Consistent' },
  { level: 3, min: 800,  label: 'Dedicated' },
  { level: 4, min: 1800, label: 'Unstoppable' },
  { level: 5, min: 3500, label: 'Legend' },
] as const

export function getLevelFromXP(totalXP: number): number {
  const thresholds = [...LEVEL_THRESHOLDS].reverse()
  for (const t of thresholds) {
    if (totalXP >= t.min) return t.level
  }
  return 1
}

export function getLevelLabel(level: number): string {
  return LEVEL_THRESHOLDS.find(t => t.level === level)?.label ?? 'Rookie'
}

export function getXPToNextLevel(totalXP: number): { current: number; next: number; progress: number } {
  const level = getLevelFromXP(totalXP)
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level)!
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === level + 1)

  if (!nextThreshold) {
    return { current: totalXP, next: currentThreshold.min, progress: 1 }
  }

  const range = nextThreshold.min - currentThreshold.min
  const earned = totalXP - currentThreshold.min
  return {
    current: earned,
    next: range,
    progress: Math.min(earned / range, 1),
  }
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return STREAK_MULTIPLIERS.MONTH
  if (streak >= 7) return STREAK_MULTIPLIERS.WEEK
  return STREAK_MULTIPLIERS.DEFAULT
}
