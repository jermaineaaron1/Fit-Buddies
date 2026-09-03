import { supabase } from './supabase'
import { describeInvokeError } from './edgeFunctionError'
import { pickPhoto, readPhotoBytes, photoContentType, type PhotoSource } from './photoPicker'
import { MALAYSIAN_FOODS } from '../constants/malaysianFoods'
import type { QuantityUnit } from './openFoodFacts'

export interface EstimatedItem {
  name: string
  matched_known_food?: boolean
  size_reference?: string
  portion_description: string
  estimated_grams: number
  grams_min?: number
  grams_max?: number
  cooking_method?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'high' | 'medium' | 'low'
  /** Set when the macros came from the bundled food table rather than the model. */
  matchedFood?: string
}

export interface PhotoAnalysis {
  items: EstimatedItem[]
  notes: string
  photoPath: string
}

export async function pickMealPhoto(source: PhotoSource) {
  return pickPhoto(source)
}

/**
 * Uploads to the private per-user folder the storage policies expect, then asks
 * the Edge Function for an estimate.
 */
export async function analyseMealPhoto(
  uri: string,
  userId: string,
  recentFoods: string[] = [],
): Promise<
  { ok: true; analysis: PhotoAnalysis } | { ok: false; error: string }
> {
  const { contentType, extension } = photoContentType(uri)
  const photoPath = `${userId}/${Date.now()}.${extension}`

  let body: ArrayBuffer
  try {
    body = await readPhotoBytes(uri)
  } catch (error) {
    return { ok: false, error: `Could not read the photo: ${String(error)}` }
  }

  const { error: uploadError } = await supabase.storage
    .from('meal-photos').upload(photoPath, body, { contentType, upsert: false })
  if (uploadError) return { ok: false, error: `Upload failed: ${uploadError.message}` }

  const { data, error } = await supabase.functions.invoke('analyze-meal-photo', {
    body: {
      photoPath,
      // Naming the dish in our own vocabulary is what lets us swap the model's
      // guessed macros for verified ones, so we hand it the vocabulary.
      knownFoods: MALAYSIAN_FOODS.map((food) => food.name),
      recentFoods,
    },
  })
  if (error) return { ok: false, error: describeInvokeError(error, 'Photo scanning') }
  if (data?.error) return { ok: false, error: String(data.error) }

  const items = ((data?.items ?? []) as EstimatedItem[]).map(groundAgainstKnownFoods)
  return { ok: true, analysis: { items, notes: String(data?.notes ?? ''), photoPath } }
}

/**
 * The model is good at naming a dish and judging portion size, and weak at
 * recalling exact nutrition. So where it names something the bundled table
 * knows, we keep its weight estimate and recompute macros from real per-100g
 * values. Unrecognised foods keep the model's own numbers.
 */
function groundAgainstKnownFoods(item: EstimatedItem): EstimatedItem {
  const match = findKnownFood(item.name)
  if (!match || !item.estimated_grams || item.estimated_grams <= 0) return item

  const factor = item.estimated_grams / 100
  const scale = (per100g: number | null) =>
    per100g === null ? 0 : Math.round(per100g * factor * 10) / 10

  return {
    ...item,
    name: match.name,
    matchedFood: match.name,
    calories: Math.round((match.caloriesPer100g ?? 0) * factor),
    protein_g: scale(match.proteinPer100g),
    carbs_g: scale(match.carbsPer100g),
    fat_g: scale(match.fatPer100g),
  }
}

/**
 * English names for dishes our table stores under a Malay name. Token overlap
 * can't bridge languages — "Beef rendang" shares no word with "Rendang daging"
 * — and the model won't always copy our vocabulary verbatim even when asked.
 */
const ALIASES: Record<string, string> = {
  'beef rendang': 'Rendang daging',
  'rendang beef': 'Rendang daging',
  'chicken rice': 'Nasi ayam',
  'hainanese chicken rice': 'Nasi ayam',
  'coconut rice': 'Nasi lemak',
  'fried rice': 'Nasi goreng kampung',
  'white rice': 'Nasi putih',
  'steamed rice': 'Nasi putih',
  'plain rice': 'Nasi putih',
  'brown rice': 'Nasi perang masak',
  'flatbread': 'Roti canai',
  'roti prata': 'Roti canai',
  'chicken satay': 'Ayam satay',
  'satay chicken': 'Ayam satay',
  'beef satay': 'Daging satay',
  'satay beef': 'Daging satay',
  'grilled fish': 'Ikan bakar',
  'steamed fish': 'Ikan kukus',
  'boiled egg': 'Telur rebus',
  'hard boiled egg': 'Telur rebus',
  'soft boiled egg': 'Telur separuh masak',
  'half boiled egg': 'Telur separuh masak',
  'fried tofu': 'Tauhu goreng',
  'fried tempeh': 'Tempeh goreng',
  'chicken soup': 'Sup ayam',
  'rice porridge': 'Bubur ayam',
  'congee': 'Bubur ayam',
  'chicken porridge': 'Bubur ayam',
  'water spinach': 'Kangkung belacan',
  'mixed vegetables': 'Sayur campur tumis',
  'soy milk': 'Susu soya tanpa gula',
  'iced milk tea': 'Teh tarik',
  'milk tea': 'Teh tarik',
  'black coffee': 'Kopi o kosong',
}

const NOISE_WORDS = new Set([
  'with', 'and', 'the', 'a', 'of', 'in', 'on', 'fried', 'grilled', 'steamed',
  'boiled', 'fresh', 'hot', 'cold', 'plate', 'bowl', 'cup', 'glass', 'serving', 'portion',
])

function normalise(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !NOISE_WORDS.has(word))
}

/**
 * Exact match first, then token overlap. The model is told to copy our names
 * verbatim, but it doesn't always — "Nasi Lemak (with fried egg)" and
 * "nasi-lemak" both need to reach the same row, and a pure prefix test misses
 * both. Requires at least two shared words, or one shared word that is the
 * whole of a short name, so "Ayam goreng" doesn't collide with "Ayam percik".
 */
function findKnownFood(rawName: string) {
  const name = rawName.trim().toLowerCase()
  if (!name) return null

  const exact = MALAYSIAN_FOODS.find((food) => food.name.toLowerCase() === name)
  if (exact) return exact

  const aliased = ALIASES[name]
  if (aliased) {
    const viaAlias = MALAYSIAN_FOODS.find((food) => food.name === aliased)
    if (viaAlias) return viaAlias
  }

  const tokens = normalise(rawName)
  if (!tokens.length) return null

  let best: { food: (typeof MALAYSIAN_FOODS)[number]; score: number } | null = null
  for (const food of MALAYSIAN_FOODS) {
    const foodTokens = normalise(food.name)
    if (!foodTokens.length) continue
    const shared = foodTokens.filter((word) => tokens.includes(word))
    if (!shared.length) continue

    // Proportion of the known food's own name that was matched — favours
    // "Nasi lemak" (2/2) over "Nasi goreng kampung" (1/3) for "nasi lemak".
    const score = shared.length / foodTokens.length
    const strong = shared.length >= 2 || (foodTokens.length === 1 && shared.length === 1)
    if (strong && (!best || score > best.score)) best = { food, score }
  }

  return best && best.score >= 0.5 ? best.food : null
}

/** Signed because the bucket is private — meal photos are personal. */
export async function signedPhotoUrl(photoPath: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabase.storage.from('meal-photos').createSignedUrl(photoPath, seconds)
  return data?.signedUrl ?? null
}

export const PHOTO_UNIT: QuantityUnit = 'g'
