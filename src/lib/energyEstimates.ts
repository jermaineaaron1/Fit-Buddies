import type { Profile, ExerciseType, CardioIntensity } from '../types/app'

export type EnergyProfile = Pick<Profile, 'weight_kg' | 'height_cm' | 'age' | 'gender'>
export type FitnessGoal = 'lose_fat' | 'build_muscle' | 'recomposition' | 'maintain'

// The per-exercise fields that carry energy signal. Everything is nullable
// because a row may be a bare "I did squats" with nothing filled in.
export interface ExerciseEnergyInput {
  exercise_type: ExerciseType
  duration_seconds: number | null
  sets: number | null
  cardio_intensity: CardioIntensity | null
}

// Mifflin–St Jeor resting energy estimate. We use a sedentary 1.2 multiplier
// for base daily maintenance, then add logged exercise separately to avoid
// counting the same workout twice.
export function estimateBaseMaintenance(profile: EnergyProfile): number | null {
  if (!profile.weight_kg || !profile.height_cm || !profile.age || !profile.gender) return null
  const sexConstant = profile.gender === 'male' ? 5 : -161
  const resting = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age + sexConstant
  return Math.round(resting * 1.2)
}

// Session-level METs, keyed off the 1–5 effort flames.
const DIFFICULTY_METS = [3, 4, 5, 6.5, 8]
// Cardio METs from the intensity chips the user picks on a cardio row.
const INTENSITY_METS: Record<CardioIntensity, number> = { low: 4, moderate: 7, high: 10 }
// Resistance training, moderate effort.
const STRENGTH_METS = 5
// A working set plus its rest. Strength rows carry no clock of their own, so
// without this a sets/reps-only session would score zero burn.
const MINUTES_PER_SET = 3

// kcal/min = MET × 3.5 × body mass (kg) / 200.
function burn(mets: number, weightKg: number, minutes: number) {
  return mets * 3.5 * weightKg / 200 * minutes
}

function sessionMets(difficulty: number | null) {
  return DIFFICULTY_METS[Math.max(0, Math.min(4, (difficulty ?? 3) - 1))]
}

// Estimates a session's burn from the exercises actually logged, falling back
// to the session-level duration for whatever time those exercises don't
// account for (warm-up, rest between blocks). Minutes attributed to a specific
// exercise are never also counted at the session rate, so there's no
// double-dipping. With no exercises this reduces exactly to the old
// duration × difficulty estimate.
export function estimateWorkoutCalories(
  weightKg: number | null,
  durationMinutes: number | null,
  difficulty: number | null,
  exercises: ExerciseEnergyInput[] = [],
): number {
  if (!weightKg) return 0
  const mets = sessionMets(difficulty)

  let loggedMinutes = 0
  let kcal = 0
  for (const exercise of exercises) {
    if (exercise.exercise_type === 'cardio') {
      const minutes = (exercise.duration_seconds ?? 0) / 60
      if (minutes <= 0) continue
      loggedMinutes += minutes
      kcal += burn(exercise.cardio_intensity ? INTENSITY_METS[exercise.cardio_intensity] : mets, weightKg, minutes)
    } else {
      const minutes = (exercise.sets ?? 0) * MINUTES_PER_SET
      if (minutes <= 0) continue
      loggedMinutes += minutes
      kcal += burn(STRENGTH_METS, weightKg, minutes)
    }
  }

  kcal += burn(mets, weightKg, Math.max(0, (durationMinutes ?? 0) - loggedMinutes))
  return Math.round(kcal)
}

export function calorieTargetBand(baseMaintenance: number, exerciseCalories: number) {
  const adjustedMaintenance = baseMaintenance + exerciseCalories
  return { maintenance: adjustedMaintenance, lower: adjustedMaintenance - 200, upper: adjustedMaintenance - 100 }
}

export function recommendedNutritionTargets(profile: EnergyProfile, goal: FitnessGoal, exerciseCalories = 0) {
  const base = estimateBaseMaintenance(profile)
  if (base === null || !profile.weight_kg) return null
  const maintenance = base + exerciseCalories
  const calorieDelta = goal === 'lose_fat'
    ? -Math.min(450, Math.max(250, Math.round(maintenance * 0.15)))
    : goal === 'build_muscle'
      ? Math.min(300, Math.max(150, Math.round(maintenance * 0.08)))
      : goal === 'recomposition' ? -150 : 0
  const proteinPerKg = goal === 'lose_fat' || goal === 'recomposition' ? 1.8 : 1.6
  return {
    calories: Math.round((maintenance + calorieDelta) / 10) * 10,
    maintenance,
    proteinGrams: Math.round(profile.weight_kg * proteinPerKg),
    calorieDelta,
  }
}
