/**
 * Household measures for food logging.
 *
 * Grams are the only unit that is exact. Everything else here is a convenience
 * that has to be converted before it can be scored, and every conversion is
 * an assumption about density or portion size that the food itself can
 * invalidate — a cup of oil and a cup of cornflakes weigh very different
 * amounts. So conversions are exposed as *estimates* the user can see and
 * override, never applied silently.
 */

export type QuantityUnit =
  | 'g' | 'kg' | 'oz'
  | 'ml' | 'l'
  | 'tsp' | 'tbsp' | 'cup'
  | 'piece' | 'slice' | 'serving' | 'bowl' | 'plate' | 'ladle'

export interface UnitInfo {
  unit: QuantityUnit
  label: string
  /** Longer form, for the picker sheet. */
  name: string
  group: 'weight' | 'volume' | 'household'
  /**
   * Approximate grams for one of this unit, or null when it is entirely
   * food-dependent. Volume figures assume water-like density (1 g/ml), which
   * is close for soups, drinks, and most cooked mixed dishes, and wrong for
   * fats and dry flakes.
   */
  approxGrams: number | null
  /** True when the gram figure is a rule of thumb rather than a definition. */
  approximate: boolean
}

export const UNITS: readonly UnitInfo[] = [
  { unit: 'g', label: 'g', name: 'Grams', group: 'weight', approxGrams: 1, approximate: false },
  { unit: 'kg', label: 'kg', name: 'Kilograms', group: 'weight', approxGrams: 1000, approximate: false },
  { unit: 'oz', label: 'oz', name: 'Ounces', group: 'weight', approxGrams: 28.3495, approximate: false },
  { unit: 'ml', label: 'ml', name: 'Millilitres', group: 'volume', approxGrams: 1, approximate: true },
  { unit: 'l', label: 'L', name: 'Litres', group: 'volume', approxGrams: 1000, approximate: true },
  { unit: 'tsp', label: 'tsp', name: 'Teaspoons', group: 'volume', approxGrams: 5, approximate: true },
  { unit: 'tbsp', label: 'tbsp', name: 'Tablespoons', group: 'volume', approxGrams: 15, approximate: true },
  { unit: 'cup', label: 'cup', name: 'Cups', group: 'volume', approxGrams: 240, approximate: true },
  // Portion units: no useful default, because "a piece" of chicken and "a
  // piece" of bread share nothing. The photo estimator supplies a per-item
  // gram figure instead, and typing one by hand is always allowed.
  { unit: 'piece', label: 'pc', name: 'Pieces', group: 'household', approxGrams: null, approximate: true },
  { unit: 'slice', label: 'slice', name: 'Slices', group: 'household', approxGrams: null, approximate: true },
  { unit: 'serving', label: 'serving', name: 'Servings', group: 'household', approxGrams: null, approximate: true },
  { unit: 'bowl', label: 'bowl', name: 'Bowls', group: 'household', approxGrams: 250, approximate: true },
  { unit: 'plate', label: 'plate', name: 'Plates', group: 'household', approxGrams: 350, approximate: true },
  { unit: 'ladle', label: 'ladle', name: 'Ladles', group: 'household', approxGrams: 60, approximate: true },
] as const

/** Kept short for the inline row; the rest live behind "More units". */
export const COMMON_UNITS: readonly QuantityUnit[] = ['g', 'ml', 'piece', 'cup', 'bowl', 'serving']

const BY_UNIT = new Map(UNITS.map((info) => [info.unit, info]))

export function unitInfo(unit: QuantityUnit): UnitInfo {
  return BY_UNIT.get(unit) ?? UNITS[0]
}

export function unitLabel(unit: QuantityUnit): string {
  return unitInfo(unit).label
}

/**
 * Estimated grams for a quantity, or null when this unit carries no generic
 * conversion. `servingGrams` overrides the default when the food itself
 * declares a serving weight, which is always better than our rule of thumb.
 */
export function toGrams(
  quantity: number,
  unit: QuantityUnit,
  servingGrams?: number | null,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  if ((unit === 'serving' || unit === 'piece' || unit === 'slice') && servingGrams) {
    return Math.round(quantity * servingGrams)
  }
  const info = unitInfo(unit)
  if (info.approxGrams === null) return null
  return Math.round(quantity * info.approxGrams)
}

/**
 * The user-facing conversion hint, e.g. "≈ 360 g (estimate)". Returns null for
 * grams (where a conversion would be noise) and for units with no basis.
 */
export function gramHint(
  quantity: number,
  unit: QuantityUnit,
  servingGrams?: number | null,
): string | null {
  if (unit === 'g') return null
  const grams = toGrams(quantity, unit, servingGrams)
  if (grams === null) return null
  const info = unitInfo(unit)
  const exact = !info.approximate || Boolean(servingGrams && (unit === 'serving' || unit === 'piece' || unit === 'slice'))
  return exact ? `= ${grams} g` : `≈ ${grams} g estimate`
}
