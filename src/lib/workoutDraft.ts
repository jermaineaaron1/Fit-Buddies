import { supabase } from './supabase'
import { emptySet, schemaFor, type SetDraft } from './measurementSchemas'
import { rollupSets, formatSetSummary } from './workoutFormat'
import type { MeasurementType } from '../types/database'
import type { WorkoutWithExercises } from '../types/app'

export interface ExerciseDraft {
  /** Stable across reorders, so React keys survive a drag. */
  key: string
  exercise_name: string
  equipment: string | null
  measurement_type: MeasurementType
  /** Added vs assisted, held on the exercise so every set reads consistently. */
  weight_mode: 'added' | 'assisted' | null
  notes: string | null
  wger_exercise_id: number | null
  exercise_image_url: string | null
  equipment_photo_path: string | null
  rest_seconds: number | null
  avg_heart_rate_bpm: number | null
  /** Per-set detail. The `sets` column on the row is a count derived from this. */
  setRows: SetDraft[]
}

let keyCounter = 0
function nextKey(): string {
  keyCounter += 1
  return `draft-${keyCounter}`
}

export function newExerciseDraft(measurementType: MeasurementType = 'strength'): ExerciseDraft {
  return {
    key: nextKey(),
    exercise_name: '',
    equipment: null,
    measurement_type: measurementType,
    weight_mode: schemaFor(measurementType).defaults?.weight_mode ?? null,
    notes: null,
    wger_exercise_id: null,
    exercise_image_url: null,
    equipment_photo_path: null,
    rest_seconds: 90,
    avg_heart_rate_bpm: null,
    setRows: [emptySet(measurementType, 0)],
  }
}

/**
 * Rebuilds a draft from a logged workout, for "repeat" and "use as a base".
 *
 * The row ids are deliberately dropped: both flows create a brand-new workout
 * and leave the original untouched, and carrying a primary key through would
 * make the insert collide with the row it was copied from.
 */
export function draftFromWorkout(workout: WorkoutWithExercises, sets: Record<string, SetDraft[]> = {}): ExerciseDraft[] {
  return workout.exercises
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((exercise) => {
      const type = (exercise.measurement_type ?? 'strength') as MeasurementType
      const recorded = sets[exercise.id] ?? []
      return {
        key: nextKey(),
        exercise_name: exercise.exercise_name,
        equipment: exercise.equipment ?? null,
        measurement_type: type,
        weight_mode: exercise.weight_mode,
        notes: exercise.notes,
        wger_exercise_id: exercise.wger_exercise_id,
        exercise_image_url: exercise.exercise_image_url,
        // The photo belonged to that session, not to the plan.
        equipment_photo_path: null,
        rest_seconds: exercise.rest_seconds ?? 90,
        avg_heart_rate_bpm: null,
        setRows: recorded.length
          ? recorded.map((set, index) => ({ ...set, set_index: index, completed: false, notes: null }))
          // Older rows predate per-set logging, so reconstruct a plausible plan
          // from the summary columns rather than starting from nothing.
          : reconstructSets(exercise, type),
      }
    })
}

function reconstructSets(exercise: WorkoutWithExercises['exercises'][number], type: MeasurementType): SetDraft[] {
  const count = Math.max(1, Math.min(12, exercise.sets ?? 1))
  return Array.from({ length: count }, (_, index) => ({
    ...emptySet(type, index),
    weight_kg: exercise.weight_kg,
    weight_mode: exercise.weight_mode,
    reps: exercise.reps,
    duration_seconds: type === 'distance_cardio' && exercise.duration_seconds
      ? Math.round(exercise.duration_seconds / count)
      : null,
    distance_km: type === 'distance_cardio' && exercise.distance_km
      ? Math.round((exercise.distance_km / count) * 100) / 100
      : null,
    intensity: type === 'intervals' ? exercise.cardio_intensity : null,
  }))
}

export interface PreviousPerformance {
  loggedAt: string
  workoutTitle: string
  summary: string
}

/**
 * The last time this exercise was done, phrased the way the logger shows it.
 * Matched on name because that is what a person recognises; equipment is shown
 * alongside so a same-named movement on different kit is still distinguishable.
 */
export async function loadPreviousPerformance(
  userId: string,
  exerciseName: string,
  measurementType: MeasurementType,
): Promise<PreviousPerformance | null> {
  const name = exerciseName.trim()
  if (!name) return null

  const { data: workouts } = await supabase
    .from('workouts').select('id, title, logged_at')
    .eq('user_id', userId).order('logged_at', { ascending: false }).limit(40)
  if (!workouts?.length) return null

  const { data: rows } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, measurement_type, sets, reps, weight_kg, weight_mode, duration_seconds, distance_km, cardio_intensity, equipment')
    .in('workout_id', workouts.map((workout) => workout.id))
    .ilike('exercise_name', name)

  const matching = (rows ?? []).filter((row: any) => (row.measurement_type ?? 'strength') === measurementType)
  if (!matching.length) return null

  const byWorkout = new Map(workouts.map((workout) => [workout.id, workout]))
  const latest = matching
    .map((row: any) => ({ row, workout: byWorkout.get(row.workout_id) }))
    .filter((entry) => entry.workout)
    .sort((a, b) => new Date(b.workout!.logged_at).getTime() - new Date(a.workout!.logged_at).getTime())[0]
  if (!latest) return null

  // Prefer the real top set when per-set rows exist; fall back to the summary
  // columns for anything logged before per-set tracking.
  const { data: setRows } = await supabase
    .from('workout_sets').select('*')
    .eq('workout_exercise_id', latest.row.id)
    .order('set_index', { ascending: true })

  const best = pickTopSet((setRows as SetDraft[] | null) ?? [], measurementType)
  const summary = best
    ? formatSetSummary(best, measurementType)
    : summaryFromRollup(latest.row, measurementType)

  return {
    loggedAt: latest.workout!.logged_at,
    workoutTitle: latest.workout!.title,
    summary: latest.row.sets && latest.row.sets > 1 ? `${summary} · ${latest.row.sets} sets` : summary,
  }
}

/**
 * The last few sessions of one exercise, in the shape Tale of the Tape wants.
 *
 * That component predates per-set logging and reads the rollup columns, which
 * is exactly what they are for — no rewrite needed, and its history stays
 * continuous across the schema change.
 */
export async function loadExerciseHistory(
  userId: string,
  exerciseName: string,
  measurementType: MeasurementType,
  limit = 4,
): Promise<import('../components/workout/TaleOfTape').HistoryEntry[]> {
  const name = exerciseName.trim()
  if (!name) return []

  const { data: workouts } = await supabase
    .from('workouts').select('id, title, logged_at')
    .eq('user_id', userId).order('logged_at', { ascending: false }).limit(40)
  if (!workouts?.length) return []

  const { data: rows } = await supabase
    .from('workout_exercises')
    .select('id, workout_id, measurement_type, exercise_type, sets, reps, weight_kg, weight_mode, duration_seconds, distance_km, avg_heart_rate_bpm, cardio_intensity')
    .in('workout_id', workouts.map((workout) => workout.id))
    .ilike('exercise_name', name)

  const byWorkout = new Map(workouts.map((workout) => [workout.id, workout]))

  return ((rows as any[]) ?? [])
    .filter((row) => (row.measurement_type ?? 'strength') === measurementType)
    .map((row) => {
      const workout = byWorkout.get(row.workout_id)
      if (!workout) return null
      const weight = Number(row.weight_kg ?? 0)
      const reps = Number(row.reps ?? 0)
      const sets = Number(row.sets ?? 0)
      return {
        id: row.id,
        date: workout.logged_at,
        workoutTitle: workout.title,
        exerciseType: row.exercise_type as 'strength' | 'cardio',
        weight, reps, sets,
        volume: weight * reps * sets,
        weightMode: row.weight_mode,
        durationSeconds: row.duration_seconds ?? 0,
        distanceKm: row.distance_km,
        avgHeartRateBpm: row.avg_heart_rate_bpm,
        cardioIntensity: row.cardio_intensity,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}

function pickTopSet(sets: SetDraft[], type: MeasurementType): SetDraft | null {
  const done = sets.filter((set) => set.completed)
  const pool = done.length ? done : sets
  if (!pool.length) return null
  if (type === 'strength' || type === 'bodyweight') {
    return pool.reduce((best, set) => (set.weight_kg ?? 0) > (best.weight_kg ?? 0) ? set : best, pool[0])
  }
  if (type === 'distance_cardio') {
    return pool.reduce((best, set) => (set.distance_km ?? 0) > (best.distance_km ?? 0) ? set : best, pool[0])
  }
  return pool[0]
}

function summaryFromRollup(row: any, type: MeasurementType): string {
  return formatSetSummary(
    {
      ...emptySet(type, 0),
      weight_kg: row.weight_kg, weight_mode: row.weight_mode, reps: row.reps,
      duration_seconds: row.duration_seconds, distance_km: row.distance_km,
      hold_seconds: row.duration_seconds, intensity: row.cardio_intensity,
    },
    type,
  )
}

export interface SaveResult {
  workoutId: string | null
  error: string | null
}

/**
 * Writes a workout, its exercises and their sets.
 *
 * The exercise insert asks for the ids back, because the sets cannot be
 * written until their parent rows exist. Sets are best-effort: if that second
 * write fails the workout is still saved and still scores, so a transient
 * error costs the detail rather than the session.
 */
export async function saveWorkout(input: {
  userId: string
  circleId: string
  title: string
  notes: string | null
  difficulty: number
  durationMinutes: number | null
  exercises: ExerciseDraft[]
}): Promise<SaveResult> {
  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({
      user_id: input.userId,
      circle_id: input.circleId,
      title: input.title,
      notes: input.notes,
      difficulty: input.difficulty,
      duration_minutes: input.durationMinutes,
      xp_earned: 50,
    })
    .select()
    .single()

  if (error || !workout) return { workoutId: null, error: error?.message ?? 'Could not save workout.' }

  const valid = input.exercises.filter((exercise) => exercise.exercise_name.trim())
  if (!valid.length) return { workoutId: workout.id, error: null }

  const { data: insertedExercises, error: exerciseError } = await supabase
    .from('workout_exercises')
    .insert(valid.map((exercise, index) => {
      const rollup = rollupSets(exercise.setRows, exercise.measurement_type)
      return {
        workout_id: workout.id,
        exercise_name: exercise.exercise_name.trim(),
        equipment: exercise.equipment,
        measurement_type: exercise.measurement_type,
        notes: exercise.notes,
        sort_order: index,
        wger_exercise_id: exercise.wger_exercise_id,
        exercise_image_url: exercise.exercise_image_url,
        equipment_photo_path: exercise.equipment_photo_path,
        rest_seconds: exercise.rest_seconds,
        avg_heart_rate_bpm: exercise.avg_heart_rate_bpm,
        ...rollup,
        // The exercise-level mode is authoritative; the rollup only reports
        // what the top set happened to use.
        weight_mode: exercise.weight_mode ?? rollup.weight_mode,
      }
    }))
    .select('id')

  if (exerciseError || !insertedExercises) {
    return { workoutId: workout.id, error: exerciseError?.message ?? 'Exercises were not saved.' }
  }

  const setRows = valid.flatMap((exercise, index) => {
    const parentId = insertedExercises[index]?.id
    if (!parentId) return []
    return exercise.setRows
      .filter((set) => hasAnyValue(set))
      .map((set, setIndex) => ({
        ...set,
        set_index: setIndex,
        weight_mode: set.weight_mode ?? exercise.weight_mode,
        workout_exercise_id: parentId,
      }))
  })

  if (setRows.length) {
    const { error: setError } = await supabase.from('workout_sets').insert(setRows)
    if (setError) return { workoutId: workout.id, error: `Sets were not saved: ${setError.message}` }
  }

  return { workoutId: workout.id, error: null }
}

/** An untouched set is a placeholder, not a record of anything. */
function hasAnyValue(set: SetDraft): boolean {
  const ignored = new Set(['set_index', 'completed', 'weight_mode', 'intensity'])
  return Object.entries(set).some(([key, value]) =>
    !ignored.has(key) && value !== null && value !== undefined && value !== '')
}
