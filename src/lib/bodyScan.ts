import { supabase } from './supabase'
import { describeInvokeError } from './edgeFunctionError'
import { readPhotoBytes, photoContentType } from './photoPicker'

export interface BodyScanResult {
  measured_on: string
  weight_kg: number | null
  units_were_pounds: boolean
  body_fat_percentage: number | null
  body_fat_mass_kg: number | null
  skeletal_muscle_mass_kg: number | null
  visceral_fat_level: number | null
  bmi: number | null
  device: string
  unreadable_fields: string[]
  notes: string
  scanPath: string
}

const LB_TO_KG = 0.45359237

/**
 * Uploads the printout to the caller's private folder, then transcribes it.
 *
 * Nothing is saved to the measurement history here — the result only prefills
 * the weigh-in form. A misread digit on a body-fat reading would quietly bend
 * the trend line, so a person confirms every value first.
 */
export async function analyseBodyScan(uri: string, userId: string): Promise<
  { ok: true; scan: BodyScanResult } | { ok: false; error: string }
> {
  const { contentType, extension } = photoContentType(uri)
  const scanPath = `${userId}/${Date.now()}.${extension}`

  let body: ArrayBuffer
  try {
    body = await readPhotoBytes(uri)
  } catch (error) {
    return { ok: false, error: `Could not read the image: ${String(error)}` }
  }

  const { error: uploadError } = await supabase.storage
    .from('body-scans').upload(scanPath, body, { contentType, upsert: false })
  if (uploadError) return { ok: false, error: `Upload failed: ${uploadError.message}` }

  const { data, error } = await supabase.functions.invoke('analyze-body-scan', {
    body: { scanPath },
  })
  if (error) return { ok: false, error: await describeInvokeError(error, 'Scan reading') }
  if (data?.error) return { ok: false, error: String(data.error) }

  // The function reports printed figures verbatim and flags the unit rather
  // than converting, so that a misread unit can't be mistaken for a real
  // 2.2x jump in weight. Converting here keeps that decision in one place.
  const pounds = Boolean(data.units_were_pounds)
  const toKg = (value: number | null) =>
    value === null ? null : pounds ? Math.round(value * LB_TO_KG * 10) / 10 : value

  return {
    ok: true,
    scan: {
      measured_on: String(data.measured_on ?? ''),
      weight_kg: toKg(data.weight_kg ?? null),
      units_were_pounds: pounds,
      body_fat_percentage: data.body_fat_percentage ?? null,
      body_fat_mass_kg: toKg(data.body_fat_mass_kg ?? null),
      skeletal_muscle_mass_kg: toKg(data.skeletal_muscle_mass_kg ?? null),
      visceral_fat_level: data.visceral_fat_level ?? null,
      bmi: data.bmi ?? null,
      device: String(data.device ?? ''),
      unreadable_fields: Array.isArray(data.unreadable_fields) ? data.unreadable_fields.map(String) : [],
      notes: String(data.notes ?? ''),
      scanPath,
    },
  }
}
