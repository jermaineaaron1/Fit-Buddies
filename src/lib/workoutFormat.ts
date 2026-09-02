import type { SetDraft, MeasurementSchema } from './measurementSchemas'
import { schemaFor } from './measurementSchemas'
import type { MeasurementType } from '../types/database'

/** "20kg assisted" reads clearly where "-20" does not. */
export function formatWeight(weightKg: number | null, weightMode: 'added' | 'assisted' | null): string {
  if (weightKg === null) return '—'
  if (weightKg === 0) return 'Bodyweight'
  return weightMode === 'assisted' ? `${trim(weightKg)}kg assisted` : `${trim(weightKg)}kg`
}

/** mm:ss under an hour, h:mm:ss above it. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return '—'
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours) return `${hours}:${pad(minutes)}:${pad(secs)}`
  return `${minutes}:${pad(secs)}`
}

/** Minutes per kilometre, the figure runners actually compare. */
export function formatPace(distanceKm: number | null, durationSeconds: number | null): string | null {
  if (!distanceKm || !durationSeconds || distanceKm <= 0) return null
  const secondsPerKm = durationSeconds / distanceKm
  return `${Math.floor(secondsPerKm / 60)}:${pad(Math.round(secondsPerKm % 60))} /km`
}

/**
 * The one-line summary of a completed set, used wherever a finished set
 * collapses to a compact row.
 */
export function formatSetSummary(set: SetDraft, type: MeasurementType): string {
  const schema = schemaFor(type)

  switch (type) {
    case 'strength':
      return `${formatWeight(set.weight_kg, set.weight_mode)} × ${set.reps ?? '—'}${set.rir !== null ? ` @ ${set.rir} RIR` : ''}`
    case 'bodyweight':
      return `${set.reps ?? '—'} reps${set.weight_kg ? ` · ${formatWeight(set.weight_kg, set.weight_mode)}` : ''}${set.rir !== null ? ` @ ${set.rir} RIR` : ''}`
    case 'isometric':
      return `${formatDuration(set.hold_seconds)}${set.joint_angle_degrees !== null ? ` at ${set.joint_angle_degrees}°` : ''}${set.weight_kg ? ` · ${trim(set.weight_kg)}kg` : ''}`
    case 'isometric_force':
      return `${set.peak_force_n ?? '—'}N peak · ${formatDuration(set.hold_seconds)}${set.force_device ? ` · ${set.force_device}` : ''}`
    case 'distance_cardio': {
      const pace = formatPace(set.distance_km, set.duration_seconds)
      return `${set.distance_km ?? '—'} km · ${formatDuration(set.duration_seconds)}${pace ? ` · ${pace}` : ''}`
    }
    case 'intervals':
      return `${set.rounds ?? '—'} × ${formatDuration(set.work_seconds)} on / ${formatDuration(set.recovery_seconds)} off${set.intensity ? ` · ${set.intensity}` : ''}`
    case 'mobility':
      return `${formatDuration(set.duration_seconds)}${set.range_rating !== null ? ` · ${rangeLabel(schema, set.range_rating)}` : ''}`
    default:
      return ''
  }
}

function rangeLabel(schema: MeasurementSchema, rating: number): string {
  const field = schema.fields.find((candidate) => candidate.key === 'range_rating')
  return field?.options?.find((option) => option.value === String(rating))?.label ?? String(rating)
}

/**
 * Summary values written back onto the `workout_exercises` row.
 *
 * This is what keeps every existing consumer working: the belt scoring
 * functions, the calorie estimator and the Tale of the Tape all read these
 * columns and know nothing about per-set rows. `weight_kg`/`reps` describe the
 * heaviest set rather than an average, matching what a single-row entry always
 * meant in practice — the working set, not a mean of warm-ups and top sets.
 */
export function rollupSets(sets: SetDraft[], type: MeasurementType): {
  sets: number | null
  reps: number | null
  weight_kg: number | null
  weight_mode: 'added' | 'assisted' | null
  duration_seconds: number | null
  distance_km: number | null
  cardio_intensity: 'low' | 'moderate' | 'high' | null
} {
  const counted = sets.filter((set) => set.completed) .length ? sets.filter((set) => set.completed) : sets
  const empty = {
    sets: null, reps: null, weight_kg: null, weight_mode: null,
    duration_seconds: null, distance_km: null, cardio_intensity: null,
  }
  if (!counted.length) return empty

  if (type === 'strength' || type === 'bodyweight') {
    // The heaviest set, with the reps that were done at that weight.
    const top = counted.reduce((best, set) =>
      (set.weight_kg ?? 0) > (best.weight_kg ?? 0) ? set : best, counted[0])
    return {
      ...empty,
      sets: counted.length,
      reps: top.reps,
      weight_kg: top.weight_kg,
      weight_mode: top.weight_mode,
    }
  }

  if (type === 'distance_cardio') {
    return {
      ...empty,
      sets: counted.length,
      duration_seconds: sum(counted.map((set) => set.duration_seconds)),
      distance_km: round2(sum(counted.map((set) => set.distance_km)) ?? 0) || null,
    }
  }

  if (type === 'intervals') {
    // Elapsed time for an interval block is (work + recovery) × rounds, which
    // is what the calorie estimator needs to credit the session correctly.
    const seconds = counted.reduce((total, set) => {
      const rounds = set.rounds ?? 1
      return total + ((set.work_seconds ?? 0) + (set.recovery_seconds ?? 0)) * rounds
    }, 0)
    return {
      ...empty,
      sets: counted.length,
      duration_seconds: seconds || null,
      cardio_intensity: modalIntensity(counted),
    }
  }

  if (type === 'isometric' || type === 'isometric_force') {
    return {
      ...empty,
      sets: counted.length,
      duration_seconds: sum(counted.map((set) => set.hold_seconds)),
      weight_kg: type === 'isometric' ? maxOf(counted.map((set) => set.weight_kg)) : null,
    }
  }

  // mobility
  return { ...empty, sets: counted.length, duration_seconds: sum(counted.map((set) => set.duration_seconds)) }
}

/** True training volume, which the rollup columns cannot express exactly. */
export function totalVolumeKg(sets: SetDraft[]): number {
  return sets
    .filter((set) => set.completed && set.weight_mode !== 'assisted')
    .reduce((total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0), 0)
}

function sum(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value))
  return present.length ? present.reduce((total, value) => total + value, 0) : null
}

function maxOf(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null && Number.isFinite(value))
  return present.length ? Math.max(...present) : null
}

function modalIntensity(sets: SetDraft[]): 'low' | 'moderate' | 'high' | null {
  const counts = new Map<string, number>()
  for (const set of sets) if (set.intensity) counts.set(set.intensity, (counts.get(set.intensity) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return (top?.[0] as 'low' | 'moderate' | 'high' | undefined) ?? null
}

function trim(value: number): string {
  return String(Math.round(value * 100) / 100)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
