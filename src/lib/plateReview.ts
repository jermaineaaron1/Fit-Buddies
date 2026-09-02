import { toGrams, type QuantityUnit } from './units'
import type { EstimatedItem } from './mealPhoto'

export type PreparationMethod = 'home' | 'restaurant' | 'packaged' | 'unknown'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface ReviewItem {
  key: string
  name: string
  quantity: number
  unit: QuantityUnit
  /** What the quantity works out to in grams, or null for a portion unit. */
  grams: number | null
  preparation: PreparationMethod
  macros: Macros
  confidence: ConfidenceLevel
  /** Set when macros were recomputed from the bundled food table. */
  matchedFood: string | null
  /** How the model judged the portion, kept visible because that is the error. */
  sizeReference: string | null
  gramsMin: number | null
  gramsMax: number | null
  cookingMethod: string | null
  /**
   * Per-100g basis for rescaling. Null for items with no weight basis, whose
   * macros are then edited directly rather than derived.
   */
  per100g: Macros | null
  /** Distinguishes what came out of the photo from what the user added after. */
  addedByUser: boolean
}

let keySeed = 0
function nextKey(): string {
  keySeed += 1
  return `item-${keySeed}`
}

/** Photo estimate → editable review rows. */
export function toReviewItems(items: EstimatedItem[]): ReviewItem[] {
  return items.map((item) => {
    const grams = item.estimated_grams && item.estimated_grams > 0 ? item.estimated_grams : null
    const macros: Macros = {
      calories: Math.round(item.calories || 0),
      protein: round1(item.protein_g || 0),
      carbs: round1(item.carbs_g || 0),
      fat: round1(item.fat_g || 0),
    }
    return {
      key: nextKey(),
      name: item.name,
      quantity: grams ?? 1,
      unit: (grams ? 'g' : 'serving') as QuantityUnit,
      grams,
      preparation: prepFromCookingMethod(item.cooking_method),
      macros,
      confidence: item.confidence,
      matchedFood: item.matchedFood ?? null,
      sizeReference: item.size_reference ?? null,
      gramsMin: item.grams_min ?? null,
      gramsMax: item.grams_max ?? null,
      cookingMethod: item.cooking_method ?? null,
      per100g: grams ? scaleTo100g(macros, grams) : null,
      addedByUser: false,
    }
  })
}

/** A blank row for "add a missing ingredient" — oil, sauce, dressing. */
export function blankReviewItem(name = ''): ReviewItem {
  return {
    key: nextKey(),
    name,
    quantity: 1,
    unit: 'tbsp',
    grams: 15,
    preparation: 'home',
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    // Anything typed in by hand is known, not guessed.
    confidence: 'high',
    matchedFood: null,
    sizeReference: null,
    gramsMin: null,
    gramsMax: null,
    cookingMethod: null,
    per100g: null,
    addedByUser: true,
  }
}

/**
 * Applies a quantity or unit change and rescales the macros from the per-100g
 * basis. Editing the number is the single most common correction, so it has to
 * carry the macros with it — leaving them stale is how a "corrected" entry ends
 * up more wrong than the estimate was.
 */
export function withQuantity(item: ReviewItem, quantity: number, unit: QuantityUnit): ReviewItem {
  const grams = toGrams(quantity, unit)
  if (!item.per100g || grams === null) return { ...item, quantity, unit, grams }
  const factor = grams / 100
  return {
    ...item,
    quantity,
    unit,
    grams,
    macros: {
      calories: Math.round(item.per100g.calories * factor),
      protein: round1(item.per100g.protein * factor),
      carbs: round1(item.per100g.carbs * factor),
      fat: round1(item.per100g.fat * factor),
    },
  }
}

/**
 * Applies a hand-edited macro. This also resets the per-100g basis so a later
 * quantity change scales from the corrected figures rather than reverting to
 * the estimate the user just overrode.
 */
export function withMacro(item: ReviewItem, field: keyof Macros, value: number): ReviewItem {
  const macros = { ...item.macros, [field]: field === 'calories' ? Math.round(value) : round1(value) }
  return { ...item, macros, per100g: item.grams ? scaleTo100g(macros, item.grams) : null }
}

export function totals(items: ReviewItem[]): Macros {
  return items.reduce<Macros>((sum, item) => ({
    calories: sum.calories + item.macros.calories,
    protein: round1(sum.protein + item.macros.protein),
    carbs: round1(sum.carbs + item.macros.carbs),
    fat: round1(sum.fat + item.macros.fat),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

/**
 * The plausible calorie range for the whole plate, shown before review.
 *
 * A photo cannot reveal hidden oil, sugar, coconut milk or gravy, and portion
 * weight is a judgement from apparent size. Reporting one number implies a
 * precision that does not exist, so the range is derived from the model's own
 * gram bounds where it gave them, and widened by confidence where it did not.
 */
export function calorieRange(items: ReviewItem[]): { low: number; high: number } {
  let low = 0
  let high = 0

  for (const item of items) {
    const { calories } = item.macros
    if (item.grams && item.gramsMin && item.gramsMax && item.grams > 0) {
      low += calories * (item.gramsMin / item.grams)
      high += calories * (item.gramsMax / item.grams)
      continue
    }
    // No stated bounds: widen by how sure the item is.
    const spread = item.addedByUser ? 0 : item.confidence === 'high' ? 0.15 : item.confidence === 'medium' ? 0.28 : 0.45
    low += calories * (1 - spread)
    high += calories * (1 + spread)
  }

  return { low: Math.round(low), high: Math.round(high) }
}

/**
 * A homemade recipe logged as one serving. The whole recipe's macros are
 * divided by how many servings it makes — logging the entire batch because it
 * was cooked in one pot is one of the easiest ways to record a wildly wrong
 * day.
 */
export function perServing(recipeTotals: Macros, servings: number): Macros {
  const divisor = Math.max(1, servings)
  return {
    calories: Math.round(recipeTotals.calories / divisor),
    protein: round1(recipeTotals.protein / divisor),
    carbs: round1(recipeTotals.carbs / divisor),
    fat: round1(recipeTotals.fat / divisor),
  }
}

/** Any item the user should look at before saving. */
export function needsReview(items: ReviewItem[]): ReviewItem[] {
  return items.filter((item) => !item.addedByUser && item.confidence !== 'high')
}

function scaleTo100g(macros: Macros, grams: number): Macros {
  const factor = 100 / grams
  return {
    calories: macros.calories * factor,
    protein: macros.protein * factor,
    carbs: macros.carbs * factor,
    fat: macros.fat * factor,
  }
}

function prepFromCookingMethod(method: string | undefined): PreparationMethod {
  if (!method || method === 'unclear') return 'unknown'
  const lower = method.toLowerCase()
  if (lower.includes('restaurant') || lower.includes('takeaway')) return 'restaurant'
  if (lower.includes('packaged') || lower.includes('processed')) return 'packaged'
  return 'home'
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}
