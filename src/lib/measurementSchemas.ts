import type { Ionicons } from '@expo/vector-icons'
import type { Database, MeasurementType } from '../types/database'

export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row']
export type SetDraft = Omit<WorkoutSet, 'id' | 'workout_exercise_id' | 'created_at'>

export type FieldKind = 'number' | 'integer' | 'duration' | 'text' | 'choice'

export interface FieldSpec {
  key: keyof SetDraft
  /** Column heading in the set table. Kept to 3–5 characters where possible. */
  short: string
  /** Full label, used by the editor and by screen readers. */
  label: string
  kind: FieldKind
  suffix?: string
  step?: number
  min?: number
  max?: number
  options?: { value: string; label: string }[]
  /**
   * Which unit a duration field is typed in. A 45-second plank and a 40-minute
   * run are both "seconds" in the database, but nobody types 2400 into a box.
   */
  durationUnit?: 'seconds' | 'minutes'
  /** Columns compete for a narrow phone row; heavier fields get more of it. */
  flex?: number
  /** Shown in the compact completed-set summary line. */
  summary?: boolean
}

export interface MeasurementSchema {
  type: MeasurementType
  label: string
  /** One line describing what this schema is for, shown when picking it. */
  blurb: string
  icon: keyof typeof Ionicons.glyphMap
  /** Fields rendered as columns of the set table. */
  fields: FieldSpec[]
  /** What a repetition of this is called: "set", "round", "hold". */
  unitNoun: string
  /** Rolls up to exercise_type = 'cardio' in the database. */
  isCardio: boolean
  /** Defaults applied to a freshly added set. */
  defaults?: Partial<SetDraft>
}

const RIR: FieldSpec = {
  key: 'rir', short: 'RIR', label: 'Reps in reserve', kind: 'integer', min: 0, max: 10, flex: 0.8, summary: true,
}

const EFFORT: FieldSpec = {
  key: 'rpe', short: 'RPE', label: 'Perceived effort', kind: 'number', min: 1, max: 10, step: 0.5, flex: 0.8, summary: true,
}

/**
 * The seven ways an exercise can be measured.
 *
 * The split exists because a plank, a treadmill run and a barbell squat share
 * almost no fields, and forcing all three through sets/reps/weight produces
 * either empty columns or dishonest numbers. Which schema an exercise uses is
 * always an explicit choice — never inferred from the exercise name or from
 * an external library's category, both of which get it wrong often enough to
 * corrupt someone's history.
 */
export const MEASUREMENT_SCHEMAS: Record<MeasurementType, MeasurementSchema> = {
  strength: {
    type: 'strength',
    label: 'Strength',
    blurb: 'External load for reps — barbell, dumbbell, machine.',
    icon: 'barbell',
    unitNoun: 'set',
    isCardio: false,
    defaults: { weight_mode: 'added' },
    fields: [
      { key: 'weight_kg', short: 'KG', label: 'Weight', kind: 'number', step: 2.5, min: 0, flex: 1.1, summary: true },
      { key: 'reps', short: 'Reps', label: 'Repetitions', kind: 'integer', step: 1, min: 0, flex: 1, summary: true },
      RIR,
    ],
  },

  bodyweight: {
    type: 'bodyweight',
    label: 'Bodyweight',
    blurb: 'Pull-ups, dips, push-ups — with added weight or machine assistance.',
    icon: 'body',
    unitNoun: 'set',
    isCardio: false,
    defaults: { weight_mode: 'added' },
    fields: [
      { key: 'reps', short: 'Reps', label: 'Repetitions', kind: 'integer', step: 1, min: 0, flex: 1, summary: true },
      // Magnitude only. The added/assisted direction is a toggle on the
      // exercise, because "20kg assisted" reads clearly where "−20" does not.
      { key: 'weight_kg', short: '± KG', label: 'Added or assisted weight', kind: 'number', step: 2.5, min: 0, flex: 1.1, summary: true },
      RIR,
    ],
  },

  isometric: {
    type: 'isometric',
    label: 'Isometric hold',
    blurb: 'Planks, wall sits, static holds — measured by time, not reps.',
    icon: 'hourglass',
    unitNoun: 'hold',
    isCardio: false,
    fields: [
      { key: 'hold_seconds', short: 'Hold', label: 'Hold duration', kind: 'duration', durationUnit: 'seconds', flex: 1.1, summary: true },
      { key: 'joint_angle_degrees', short: 'Angle', label: 'Joint angle', kind: 'integer', suffix: '°', min: 0, max: 180, flex: 0.9 },
      { key: 'weight_kg', short: 'Load', label: 'External load', kind: 'number', suffix: 'kg', step: 2.5, min: 0, flex: 0.9, summary: true },
      EFFORT,
    ],
  },

  isometric_force: {
    type: 'isometric_force',
    label: 'Force-measured hold',
    blurb: 'Isometric against a dynamometer or force plate. Device required.',
    icon: 'speedometer',
    unitNoun: 'effort',
    isCardio: false,
    fields: [
      // Newtons can only come off a device. Nothing in the app estimates
      // these, and the UI says so wherever they appear.
      { key: 'peak_force_n', short: 'Peak', label: 'Peak force', kind: 'number', suffix: 'N', min: 0, flex: 1, summary: true },
      { key: 'avg_force_n', short: 'Avg', label: 'Average force', kind: 'number', suffix: 'N', min: 0, flex: 1, summary: true },
      { key: 'hold_seconds', short: 'Hold', label: 'Hold duration', kind: 'duration', durationUnit: 'seconds', flex: 1, summary: true },
    ],
  },

  distance_cardio: {
    type: 'distance_cardio',
    label: 'Distance cardio',
    blurb: 'Running, cycling, rowing, swimming — distance over time.',
    icon: 'walk',
    unitNoun: 'effort',
    isCardio: true,
    fields: [
      { key: 'distance_km', short: 'KM', label: 'Distance', kind: 'number', step: 0.5, min: 0, flex: 1, summary: true },
      { key: 'duration_seconds', short: 'Time', label: 'Duration', kind: 'duration', durationUnit: 'minutes', flex: 1.1, summary: true },
      { key: 'incline_pct', short: 'Incl', label: 'Incline', kind: 'number', suffix: '%', step: 0.5, flex: 0.8 },
      { key: 'resistance_level', short: 'Res', label: 'Resistance', kind: 'integer', min: 0, max: 100, flex: 0.8 },
    ],
  },

  intervals: {
    type: 'intervals',
    label: 'Intervals',
    blurb: 'Work and recovery repeated for rounds — HIIT, sprints, circuits.',
    icon: 'timer',
    unitNoun: 'block',
    isCardio: true,
    defaults: { intensity: 'moderate' },
    fields: [
      { key: 'work_seconds', short: 'Work', label: 'Work duration', kind: 'duration', durationUnit: 'seconds', flex: 1, summary: true },
      { key: 'recovery_seconds', short: 'Rest', label: 'Recovery duration', kind: 'duration', durationUnit: 'seconds', flex: 1, summary: true },
      { key: 'rounds', short: 'Rnds', label: 'Rounds', kind: 'integer', step: 1, min: 1, max: 200, flex: 0.8, summary: true },
      {
        key: 'intensity', short: 'Int', label: 'Intensity', kind: 'choice', flex: 1,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'moderate', label: 'Mod' },
          { value: 'high', label: 'High' },
        ],
      },
    ],
  },

  mobility: {
    type: 'mobility',
    label: 'Mobility',
    blurb: 'Stretching and joint work — time held and how it felt.',
    icon: 'accessibility',
    unitNoun: 'movement',
    isCardio: false,
    fields: [
      { key: 'duration_seconds', short: 'Time', label: 'Duration', kind: 'duration', durationUnit: 'minutes', flex: 1.2, summary: true },
      {
        key: 'range_rating', short: 'Range', label: 'Range and comfort', kind: 'choice', flex: 1.4, summary: true,
        options: [
          { value: '1', label: 'Tight' },
          { value: '2', label: 'Stiff' },
          { value: '3', label: 'OK' },
          { value: '4', label: 'Free' },
          { value: '5', label: 'Full' },
        ],
      },
    ],
  },
}

export const MEASUREMENT_ORDER: MeasurementType[] = [
  'strength', 'bodyweight', 'distance_cardio', 'intervals', 'isometric', 'mobility', 'isometric_force',
]

export function schemaFor(type: MeasurementType): MeasurementSchema {
  return MEASUREMENT_SCHEMAS[type] ?? MEASUREMENT_SCHEMAS.strength
}

/** A blank set for this schema, carrying forward nothing. */
export function emptySet(type: MeasurementType, index: number): SetDraft {
  return {
    set_index: index,
    completed: false,
    weight_kg: null, weight_mode: null, reps: null, rir: null, rpe: null,
    position_label: null, joint_angle_degrees: null, hold_seconds: null,
    peak_force_n: null, avg_force_n: null, force_device: null,
    distance_km: null, duration_seconds: null, incline_pct: null, resistance_level: null,
    work_seconds: null, recovery_seconds: null, rounds: null, intensity: null,
    range_rating: null, notes: null,
    ...schemaFor(type).defaults,
  }
}

/**
 * A new set pre-filled from the previous one. Almost every set after the first
 * repeats the last one's numbers, so copying them and letting the user adjust
 * is far less typing than an empty row — but `completed` always resets, since
 * the new set has not happened yet.
 */
export function duplicateSet(previous: SetDraft, index: number): SetDraft {
  return { ...previous, set_index: index, completed: false, notes: null }
}
