import { supabase } from './supabase'
import type { Database } from '../types/database'

export type BodyMeasurement = Database['public']['Tables']['body_measurements']['Row']
export type MeasurementSource = BodyMeasurement['source']

/** Energy in a kilogram of body fat. The standard figure used for deficit maths. */
const KCAL_PER_KG_FAT = 7700

export async function loadMeasurements(userId: string, days = 120): Promise<BodyMeasurement[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .gte('measured_at', since)
    .order('measured_at', { ascending: true })
  return (data as BodyMeasurement[] | null) ?? []
}

export async function saveMeasurement(input: {
  userId: string
  measuredAt: string
  weightKg: number | null
  bodyFatPercentage: number | null
  muscleMassKg: number | null
  visceralFatRating: number | null
  source: MeasurementSource
  notes: string | null
  scanPath?: string | null
  /** InBody reports skeletal muscle mass; most scales report a larger total. */
  muscleMassBasis?: 'skeletal' | 'total' | null
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('body_measurements').upsert(
    {
      user_id: input.userId,
      measured_at: input.measuredAt,
      weight_kg: input.weightKg,
      body_fat_percentage: input.bodyFatPercentage,
      muscle_mass_kg: input.muscleMassKg,
      visceral_fat_rating: input.visceralFatRating,
      source: input.source,
      notes: input.notes,
      scan_path: input.scanPath ?? null,
      muscle_mass_basis: input.muscleMassBasis ?? null,
    },
    { onConflict: 'user_id,measured_at' },
  )
  return { error: error?.message ?? null }
}

export interface CompositionSummary {
  first: BodyMeasurement | null
  latest: BodyMeasurement | null
  days: number
  weightChangeKg: number | null
  /** Least-squares slope, which is far steadier than first-vs-last. */
  weightTrendKgPerWeek: number | null
  fatMassChangeKg: number | null
  leanMassChangeKg: number | null
  bodyFatChangePct: number | null
}

/** Fat mass from weight and body-fat percentage; the rest is lean. */
function fatMass(m: BodyMeasurement): number | null {
  if (m.weight_kg === null || m.body_fat_percentage === null) return null
  return m.weight_kg * (m.body_fat_percentage / 100)
}

function leanMass(m: BodyMeasurement): number | null {
  const fat = fatMass(m)
  if (fat === null || m.weight_kg === null) return null
  return m.weight_kg - fat
}

/**
 * Daily weight swings of a kilo or more are normal — water, food in transit,
 * time of day. Reporting first-vs-last treats that noise as signal, so the
 * headline number is a fitted slope across every point instead.
 */
function trendKgPerWeek(points: BodyMeasurement[]): number | null {
  const usable = points.filter((p) => p.weight_kg !== null)
  if (usable.length < 3) return null

  const origin = new Date(usable[0].measured_at).getTime()
  const xs = usable.map((p) => (new Date(p.measured_at).getTime() - origin) / 86400000)
  const ys = usable.map((p) => p.weight_kg as number)

  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY)
    denominator += (xs[i] - meanX) ** 2
  }
  if (denominator === 0) return null
  return (numerator / denominator) * 7
}

export function summarise(measurements: BodyMeasurement[]): CompositionSummary {
  const withWeight = measurements.filter((m) => m.weight_kg !== null)
  const first = withWeight[0] ?? null
  const latest = withWeight[withWeight.length - 1] ?? null

  const days = first && latest
    ? Math.max(1, Math.round((new Date(latest.measured_at).getTime() - new Date(first.measured_at).getTime()) / 86400000))
    : 0

  // Composition change needs body fat on BOTH ends, so use the earliest and
  // latest entries that actually have it rather than the weight-only bookends.
  const withComposition = measurements.filter((m) => fatMass(m) !== null)
  const firstComp = withComposition[0] ?? null
  const latestComp = withComposition[withComposition.length - 1] ?? null

  const fatChange = firstComp && latestComp && firstComp !== latestComp
    ? round1((fatMass(latestComp) as number) - (fatMass(firstComp) as number))
    : null
  const leanChange = firstComp && latestComp && firstComp !== latestComp
    ? round1((leanMass(latestComp) as number) - (leanMass(firstComp) as number))
    : null

  return {
    first,
    latest,
    days,
    weightChangeKg: first && latest && first !== latest
      ? round1((latest.weight_kg as number) - (first.weight_kg as number))
      : null,
    weightTrendKgPerWeek: trendKgPerWeek(measurements),
    fatMassChangeKg: fatChange,
    leanMassChangeKg: leanChange,
    bodyFatChangePct: firstComp && latestComp && firstComp !== latestComp
      ? round1((latestComp.body_fat_percentage as number) - (firstComp.body_fat_percentage as number))
      : null,
  }
}

/**
 * What the calorie balance predicts, next to what the scale actually did.
 *
 * A gap between the two is informative rather than embarrassing: intake is
 * usually under-reported, maintenance is an estimate, and glycogen and water
 * move weight around independently of fat. Presented as a sanity check, never
 * as a verdict.
 */
export function explainWeightChange(input: {
  actualChangeKg: number | null
  days: number
  averageDailyCalories: number | null
  maintenanceCalories: number | null
}): { expectedChangeKg: number; dailyBalance: number } | null {
  const { actualChangeKg, days, averageDailyCalories, maintenanceCalories } = input
  if (actualChangeKg === null || !days || averageDailyCalories === null || maintenanceCalories === null) return null
  if (averageDailyCalories <= 0) return null

  const dailyBalance = averageDailyCalories - maintenanceCalories
  return {
    expectedChangeKg: round1((dailyBalance * days) / KCAL_PER_KG_FAT),
    dailyBalance: Math.round(dailyBalance),
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
