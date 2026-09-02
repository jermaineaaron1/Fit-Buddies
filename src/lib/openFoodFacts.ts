// Food/nutrition search backed by Open Food Facts — free, no auth required.
// Nutrition values come back per 100 g.
//
// Two endpoints, because neither works everywhere:
//   * search-a-licious is the modern one, but it sends no CORS headers, so a
//     browser blocks it outright (confirmed live: 200 via curl, "Failed to
//     fetch" from the page). Fine on iOS/Android, useless on web.
//   * the legacy cgi/search.pl DOES allow cross-origin requests (confirmed
//     live, 456 hits for "nasi"), so it's the web fallback.
// Whichever answers first wins; if both fail we fall back to the local list.

import { supabase } from './supabase'

const SEARCH_URL = 'https://search.openfoodfacts.org/search'
const LEGACY_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
import { searchMalaysianFoods } from '../constants/malaysianFoods'
import { toGrams, type QuantityUnit as UnitToken } from './units'

export interface FoodResult {
  code: string
  name: string
  brand: string | null
  imageUrl: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  fibrePer100g: number | null
  servingGrams: number | null
  source: 'myfcd' | 'open-food-facts'
}

export async function searchFoods(query: string): Promise<FoodResult[]> {
  const q = query.trim()
  if (!q) return []

  const local = searchMalaysianFoods(q)

  // Preference order, each falling through to the next:
  //   1. our Edge Function proxy — the only path that works on web, since
  //      Open Food Facts' CORS headers are absent or unreliable in a browser
  //   2. calling Open Food Facts directly — works on iOS/Android, and keeps
  //      the app functional if the proxy isn't deployed or is down
  //   3. the bundled local list alone
  const attempts = [searchViaProxy, searchModern, searchLegacy]

  for (const attempt of attempts) {
    try {
      const remote = await attempt(q)
      return sortByNutrition([...local, ...remote])
    } catch {
      // try the next source
    }
  }

  // Every remote source failed. The local list is still a usable answer, not
  // an error state — only throw when there's genuinely nothing to show.
  if (local.length) return sortByNutrition(local)
  throw new Error('Food search is unavailable right now.')
}

// Runs server-side, where CORS doesn't apply. Also returns an already-normalised
// payload, so there's no per-product mapping to do here.
async function searchViaProxy(q: string): Promise<FoodResult[]> {
  const { data, error } = await supabase.functions.invoke('food-search', { body: { q } })
  if (error) throw error
  if (!data || !Array.isArray(data.results)) throw new Error(data?.error ?? 'Bad proxy response')
  // An empty result set from a reachable upstream is a valid answer, but an
  // upstream failure reported alongside it is not — fall through to the direct
  // endpoints rather than silently showing only local foods.
  if (data.error) throw new Error(String(data.error))
  return data.results as FoodResult[]
}

// Both endpoints return the same nutriments shape; only the envelope and the
// `brands` type differ.
function mapProduct(raw: any): FoodResult {
  return {
    code: String(raw.code ?? raw.id ?? raw.product_name),
    name: raw.product_name,
    brand: Array.isArray(raw.brands) ? raw.brands[0] ?? null : raw.brands ?? null,
    imageUrl: raw.image_thumb_url ?? raw.image_small_url ?? null,
    caloriesPer100g: raw.nutriments?.['energy-kcal_100g'] ?? null,
    proteinPer100g: raw.nutriments?.proteins_100g ?? null,
    carbsPer100g: raw.nutriments?.carbohydrates_100g ?? null,
    fatPer100g: raw.nutriments?.fat_100g ?? null,
    fibrePer100g: raw.nutriments?.fiber_100g ?? null,
    servingGrams: null,
    source: 'open-food-facts' as const,
  }
}

async function searchModern(q: string): Promise<FoodResult[]> {
  const res = await fetch(`${SEARCH_URL}?q=${encodeURIComponent(q)}&page_size=25`)
  if (!res.ok) throw new Error(`Open Food Facts request failed (${res.status})`)
  const data = await res.json()
  return ((data.hits ?? []) as any[]).filter((h) => h.product_name).map(mapProduct)
}

async function searchLegacy(q: string): Promise<FoodResult[]> {
  // This endpoint rate-limits bursts hard, and a throttled response arrives
  // without CORS headers so it surfaces as an opaque "Failed to fetch" rather
  // than a 429. Keep calls well debounced; callers must treat failure as
  // "fall back to the local list", never as a hard error.
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '25',
  })
  const res = await fetch(`${LEGACY_SEARCH_URL}?${params.toString()}`)
  if (!res.ok) throw new Error(`Open Food Facts request failed (${res.status})`)
  const data = await res.json()
  return ((data.products ?? []) as any[]).filter((p) => p.product_name).map(mapProduct)
}

export function featuredFoods() { return sortByNutrition(searchMalaysianFoods('')).slice(0,20) }

function sortByNutrition(foods: FoodResult[]) {
  return foods.sort((a,b) => nutritionScore(b) - nutritionScore(a))
}

export function nutritionScore(food: FoodResult) {
  const calories = Math.max(food.caloriesPer100g ?? 100, 25)
  return ((food.proteinPer100g ?? 0) * 100 / calories) * 4 + (food.fibrePer100g ?? 0)
}

// Units live in one place. This module used to declare its own six-value list,
// which silently diverged from what meal_logs accepts once household measures
// were added.
export type { QuantityUnit } from './units'
export { UNITS, COMMON_UNITS } from './units'

export interface ScaledMacros {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fibre: number | null
}

function scale(per100g: number | null, factor: number): number | null {
  return per100g === null ? null : Math.round(per100g * factor * 10) / 10
}

/**
 * Scales per-100g values to the quantity actually eaten.
 *
 * Weight units are exact. Volume and household units go through the shared
 * gram estimates, which assume water-like density — good enough for soups and
 * cooked dishes, wrong for oils and dry flakes, and always shown to the user
 * as an estimate rather than applied silently. A unit with no gram basis at
 * all (a "piece" of an unknown food) returns the per-100g baseline unscaled,
 * which the caller is expected to correct by hand.
 */
export function scaleFoodMacros(food: FoodResult, quantity: number, unit: UnitToken): ScaledMacros {
  const grams = toGrams(quantity, unit, food.servingGrams)
  const factor = grams === null ? 1 : grams / 100

  return {
    calories: scale(food.caloriesPer100g, factor),
    protein: scale(food.proteinPer100g, factor),
    carbs: scale(food.carbsPer100g, factor),
    fat: scale(food.fatPer100g, factor),
    fibre: scale(food.fibrePer100g, factor),
  }
}
