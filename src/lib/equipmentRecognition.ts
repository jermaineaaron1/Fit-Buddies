import { supabase } from './supabase'
import { readPhotoBytes, photoContentType } from './photoPicker'
import { COMMON_EXERCISES } from '../constants/commonExercises'
import type { MeasurementType } from '../types/database'

export interface EquipmentSuggestion {
  /** What the machine or implement appears to be. */
  equipment: string
  /** The exercise it is most commonly used for. */
  exerciseName: string
  measurementType: MeasurementType
  confidence: 'high' | 'medium' | 'low'
  /** Why it might be wrong, in the user's words, not the model's. */
  caveat?: string
}

export interface EquipmentAnalysis {
  photoPath: string
  suggestions: EquipmentSuggestion[]
  /**
   * True when these came from the built-in sample list rather than an actual
   * look at the photo. The UI must say so — a fabricated identification
   * presented as a real one is worse than no feature at all.
   */
  isMock: boolean
  notes: string
}

export type EquipmentResult =
  | { ok: true; analysis: EquipmentAnalysis }
  | { ok: false; error: string }

/**
 * Equipment identification from a photo.
 *
 * Treated as a suggestion throughout, never an answer: two machines that look
 * nearly identical can have different movement paths, cam profiles and
 * resistance curves, so the number on the stack is not comparable between
 * them. The user always confirms or corrects before anything is logged.
 *
 * The service boundary is real; the backend behind it may not be deployed. If
 * the `analyze-equipment-photo` function is missing, this falls back to clearly
 * labelled sample suggestions so the flow is complete and testable, and the UI
 * marks them as samples.
 */
export async function analyseEquipmentPhoto(uri: string, userId: string): Promise<EquipmentResult> {
  const { contentType, extension } = photoContentType(uri)
  const photoPath = `${userId}/${Date.now()}.${extension}`

  let body: ArrayBuffer
  try {
    body = await readPhotoBytes(uri)
  } catch (error) {
    return { ok: false, error: `Could not read the photo: ${String(error)}` }
  }

  const { error: uploadError } = await supabase.storage
    .from('equipment-photos').upload(photoPath, body, { contentType, upsert: false })
  if (uploadError) return { ok: false, error: `Upload failed: ${uploadError.message}` }

  try {
    const { data, error } = await supabase.functions.invoke('analyze-equipment-photo', {
      body: { photoPath },
    })
    if (error) throw error
    if (data?.error) throw new Error(String(data.error))

    const suggestions = ((data?.suggestions ?? []) as EquipmentSuggestion[]).filter((item) => item?.exerciseName)
    if (!suggestions.length) throw new Error('empty')

    return {
      ok: true,
      analysis: { photoPath, suggestions, isMock: false, notes: String(data?.notes ?? '') },
    }
  } catch {
    // Not deployed, or it returned nothing usable. Fall through to samples.
    return {
      ok: true,
      analysis: {
        photoPath,
        suggestions: mockSuggestions(),
        isMock: true,
        notes: 'Photo recognition is not connected yet, so these are common starting points rather than a reading of your photo.',
      },
    }
  }
}

/**
 * Sample starting points, drawn from the bundled exercise list rather than
 * invented. Deliberately generic — they make no claim about the photo.
 */
function mockSuggestions(): EquipmentSuggestion[] {
  const picks = COMMON_EXERCISES.slice(0, 3)
  return picks.map((exercise) => ({
    equipment: 'Not identified',
    exerciseName: exercise.name,
    measurementType: (exercise.type === 'cardio' ? 'distance_cardio' : 'strength') as MeasurementType,
    confidence: 'low' as const,
    caveat: 'Sample suggestion — not based on your photo.',
  }))
}

/** Signed because the bucket is private; equipment photos can show a gym floor. */
export async function signedEquipmentUrl(photoPath: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from('equipment-photos').createSignedUrl(photoPath, seconds)
  return data?.signedUrl ?? null
}
