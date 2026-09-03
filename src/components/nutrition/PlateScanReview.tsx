import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactCard } from '../ui/CompactCard'
import { CompactButton } from '../ui/CompactButton'
import { SectionHeader } from '../ui/SectionHeader'
import { NumericInput } from '../ui/NumericInput'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Chip } from '../ui/Chip'
import { PlateItemRow } from './PlateItemRow'
import {
  blankReviewItem, calorieRange, needsReview, totals, perServing, type ReviewItem,
} from '../../lib/plateReview'

type DishBasis = 'as_shown' | 'recipe' | 'restaurant'

interface PlateScanReviewProps {
  photoUri: string | null
  items: ReviewItem[]
  onChange: (items: ReviewItem[]) => void
  onConfirm: (items: ReviewItem[]) => void
  onDiscard: () => void
  /** Nudges the user to correct rather than replace, when a match exists. */
  onReplace?: (item: ReviewItem) => void
  /** Opens the food database so a missed ingredient gets real values. */
  onAddFromDatabase?: () => void
}

const DISH_BASIS: { value: DishBasis; label: string }[] = [
  { value: 'as_shown', label: 'As shown' },
  { value: 'recipe', label: 'My recipe' },
  { value: 'restaurant', label: 'Restaurant' },
]

/**
 * Review before anything is logged.
 *
 * Nothing here is presented as a measurement. The headline is a range, the
 * doubtful rows say CHECK, and the missing-ingredient prompt exists because a
 * photo genuinely cannot see the oil a dish was cooked in. Confirming is an
 * explicit act — the estimate never becomes a log entry on its own.
 */
export function PlateScanReview({
  photoUri, items, onChange, onConfirm, onDiscard, onReplace, onAddFromDatabase,
}: PlateScanReviewProps) {
  const [basis, setBasis] = useState<DishBasis>('as_shown')
  const [servings, setServings] = useState('1')

  const range = useMemo(() => calorieRange(items), [items])
  const summed = useMemo(() => totals(items), [items])
  const flagged = useMemo(() => needsReview(items), [items])

  const servingCount = Math.max(1, Number(servings) || 1)
  const final = basis === 'recipe' ? perServing(summed, servingCount) : summed

  function updateItem(key: string, next: ReviewItem) {
    onChange(items.map((item) => item.key === key ? next : item))
  }

  function removeItem(key: string) {
    onChange(items.filter((item) => item.key !== key))
  }

  function addMissing(name: string) {
    onChange([...items, blankReviewItem(name)])
  }

  function confirm() {
    if (basis !== 'recipe') { onConfirm(items); return }
    // A recipe logs one serving, so each row is divided by the serving count
    // before it becomes a meal entry.
    onConfirm(items.map((item) => ({
      ...item,
      macros: perServing(item.macros, servingCount),
      grams: item.grams === null ? null : Math.round(item.grams / servingCount),
      quantity: Math.round((item.quantity / servingCount) * 100) / 100,
    })))
  }

  return (
    <View style={styles.wrap}>
      {photoUri ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel="Your plate" />
        </View>
      ) : null}

      <CompactCard accent="gold">
        <Text style={styles.eyebrow}>ESTIMATED RANGE</Text>
        <Text style={styles.range}>
          {range.low.toLocaleString()}–{range.high.toLocaleString()} <Text style={styles.rangeUnit}>kcal</Text>
        </Text>
        <Text style={styles.caveat}>
          A photo cannot show hidden oil, sugar, coconut milk or gravy, and portion weight is judged
          from apparent size. Correct anything that looks wrong before saving.
        </Text>
        {flagged.length > 0 && (
          <View style={styles.flagRow}>
            <Chip label={`${flagged.length} to check`} tone="danger" icon="alert-circle" />
            <Text style={styles.flagText} numberOfLines={2}>
              {flagged.map((item) => item.name).join(', ')}
            </Text>
          </View>
        )}
      </CompactCard>

      <View style={styles.basisBlock}>
        <SectionHeader title="What is this" />
        <SegmentedControl
          segments={DISH_BASIS}
          value={basis}
          onChange={setBasis}
          tone="gold"
          scrollable
          accessibilityLabel="How this dish should be counted"
        />
        {basis === 'recipe' && (
          <View style={styles.recipeRow}>
            <NumericInput
              label="Servings the recipe makes"
              value={servings}
              onChangeText={setServings}
              integer
              step={1}
              min={1}
              style={styles.servingsField}
            />
            <Text style={styles.recipeNote}>
              The rows below describe the whole recipe. Logging records one serving:
              {' '}{final.calories.toLocaleString()} kcal.
            </Text>
          </View>
        )}
        {basis === 'restaurant' && (
          <Text style={styles.recipeNote}>
            Restaurant portions usually carry more oil and salt than the same dish cooked at home.
            If the estimate looks low, it probably is.
          </Text>
        )}
      </View>

      <SectionHeader title="Detected foods" meta={`${items.length} item${items.length === 1 ? '' : 's'}`} />

      {items.map((item) => (
        <PlateItemRow
          key={item.key}
          item={item}
          onChange={(next) => updateItem(item.key, next)}
          onRemove={() => removeItem(item.key)}
          onReplace={() => onReplace?.(item)}
        />
      ))}

      <View style={styles.missing}>
        <Text style={styles.missingLabel}>Add what the photo could not see</Text>
        <Text style={styles.missingHint}>
          Oil, sauce and sugar are invisible in a photograph and are the usual reason a scan reads low.
        </Text>
        <View style={styles.missingRow}>
          {['Cooking oil', 'Sauce', 'Dressing', 'Sugar', 'Butter'].map((name) => (
            <CompactButton key={name} label={name} icon="add" size="sm" onPress={() => addMissing(name)} />
          ))}
        </View>
        <View style={styles.missingRow}>
          {onAddFromDatabase && (
            <CompactButton label="Search food database" icon="search" size="sm" tone="gold" onPress={onAddFromDatabase} />
          )}
          <CompactButton label="Blank ingredient" icon="create-outline" size="sm" onPress={() => addMissing('')} />
        </View>
      </View>

      <CompactCard accent="blue" style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{basis === 'recipe' ? 'Per serving' : 'Meal total'}</Text>
          <Text style={styles.totalCalories}>{final.calories.toLocaleString()} kcal</Text>
        </View>
        <Text style={styles.totalMacros}>
          Protein {final.protein} g · Carbs {final.carbs} g · Fat {final.fat} g
        </Text>
      </CompactCard>

      <View style={styles.actions}>
        <CompactButton label="Discard" icon="close" onPress={onDiscard} />
        <CompactButton
          label={`Confirm ${items.length} item${items.length === 1 ? '' : 's'}`}
          icon="checkmark"
          tone="primary"
          disabled={!items.length}
          onPress={confirm}
          style={styles.confirm}
        />
      </View>

      <View style={styles.footnote}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
        <Text style={styles.footnoteText}>
          Estimates get you a consistent number to train against. They are not a measurement, and
          they do not need to be — what matters is that today is counted the same way as last week.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  photoWrap: {
    height: 180, borderRadius: radius.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  photo: { width: '100%', height: '100%' },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  range: { color: colors.text, fontFamily: type.display, fontSize: 27, fontWeight: '900', marginTop: 2 },
  rangeUnit: { fontSize: 14, color: colors.textMuted },
  caveat: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 16, marginTop: 6 },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  flagText: { flex: 1, color: colors.textMuted, fontSize: 10.5 },
  basisBlock: { gap: 8 },
  recipeRow: { gap: 6 },
  servingsField: { width: 172 },
  recipeNote: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  missing: { gap: 7 },
  missingLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  missingHint: { color: colors.textMuted, fontSize: 10.5, lineHeight: 15 },
  missingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  totals: { gap: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  totalLabel: { color: colors.textSecondary, fontFamily: type.display, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  totalCalories: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '900' },
  totalMacros: { color: colors.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8 },
  confirm: { flex: 1 },
  footnote: { flexDirection: 'row', gap: 7, paddingTop: 2 },
  footnoteText: { flex: 1, color: colors.textMuted, fontSize: 10.5, lineHeight: 15 },
})
