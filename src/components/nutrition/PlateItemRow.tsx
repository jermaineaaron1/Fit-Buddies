import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactCard } from '../ui/CompactCard'
import { IconButton } from '../ui/IconButton'
import { ConfidenceChip } from '../ui/ConfidenceChip'
import { NumericInput } from '../ui/NumericInput'
import { TextField } from '../ui/TextField'
import { UnitSelector } from '../ui/UnitSelector'
import { SegmentedControl } from '../ui/SegmentedControl'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { gramHint } from '../../lib/units'
import { withQuantity, withMacro, type ReviewItem, type PreparationMethod } from '../../lib/plateReview'

interface PlateItemRowProps {
  item: ReviewItem
  onChange: (item: ReviewItem) => void
  onRemove: () => void
  onReplace: () => void
}

const PREPARATIONS: { value: PreparationMethod; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'restaurant', label: 'Eatery' },
  { value: 'packaged', label: 'Packaged' },
  { value: 'unknown', label: 'Unsure' },
]

/**
 * One detected food, fully editable. Everything the estimate got from the
 * photo is on show — the portion it was scaled against and the plausible gram
 * range — because portion size is where nearly all of the error lives and a
 * user who can see the assumption can correct it.
 */
export function PlateItemRow({ item, onChange, onRemove, onReplace }: PlateItemRowProps) {
  const [macrosOpen, setMacrosOpen] = useState(false)
  const hint = gramHint(item.quantity, item.unit)

  return (
    <CompactCard accent={item.confidence === 'low' ? 'red' : item.addedByUser ? 'blue' : 'gold'} style={styles.card}>
      <View style={styles.head}>
        <TextField
          value={item.name}
          onChangeText={(name) => onChange({ ...item, name })}
          placeholder="Food name"
          variant="plain"
          accessibilityLabel="Food name"
          containerStyle={styles.nameField}
        />
        <ConfidenceChip level={item.confidence} />
        <IconButton icon="swap-horizontal" size="sm" onPress={onReplace} accessibilityLabel={`Replace ${item.name}`} />
        <IconButton icon="trash-outline" size="sm" tone="danger" onPress={onRemove} accessibilityLabel={`Remove ${item.name}`} />
      </View>

      <View style={styles.quantityRow}>
        <NumericInput
          value={String(item.quantity)}
          onChangeText={(value) => onChange(withQuantity(item, Number(value) || 0, item.unit))}
          label="Quantity"
          step={item.unit === 'g' ? 10 : 0.5}
          min={0}
          style={styles.quantityField}
          accessibilityLabel={`Quantity of ${item.name}`}
        />
        <View style={styles.unitField}>
          <Text style={styles.fieldLabel}>Unit</Text>
          <UnitSelector value={item.unit} onChange={(unit) => onChange(withQuantity(item, item.quantity, unit))} />
        </View>
      </View>

      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {(item.sizeReference || item.gramsMin) && !item.addedByUser ? (
        <Text style={styles.reference} numberOfLines={2}>
          {item.sizeReference ? `Scaled against ${item.sizeReference}` : ''}
          {item.gramsMin && item.gramsMax
            ? `${item.sizeReference ? ' · ' : ''}likely ${Math.round(item.gramsMin)}–${Math.round(item.gramsMax)} g`
            : ''}
        </Text>
      ) : null}

      <View style={styles.prepRow}>
        <Text style={styles.fieldLabel}>Prepared</Text>
        <SegmentedControl
          segments={PREPARATIONS}
          value={item.preparation}
          onChange={(preparation) => onChange({ ...item, preparation })}
          tone="gold"
          scrollable
          accessibilityLabel={`How ${item.name} was prepared`}
        />
      </View>

      <AnimatedPressable
        style={styles.macroSummary}
        onPress={() => setMacrosOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: macrosOpen }}
        accessibilityLabel={`${item.macros.calories} calories. Edit macros`}
      >
        <Text style={styles.calories}>{item.macros.calories} kcal</Text>
        <Text style={styles.macroLine} numberOfLines={1}>
          P {item.macros.protein} · C {item.macros.carbs} · F {item.macros.fat}
          {item.matchedFood ? ' · from food table' : ''}
        </Text>
        <Ionicons name={macrosOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
      </AnimatedPressable>

      {macrosOpen && (
        <View style={styles.macroGrid}>
          <NumericInput
            label="Calories" value={String(item.macros.calories)} integer style={styles.macroField}
            onChangeText={(value) => onChange(withMacro(item, 'calories', Number(value) || 0))}
          />
          <NumericInput
            label="Protein g" value={String(item.macros.protein)} style={styles.macroField}
            onChangeText={(value) => onChange(withMacro(item, 'protein', Number(value) || 0))}
          />
          <NumericInput
            label="Carbs g" value={String(item.macros.carbs)} style={styles.macroField}
            onChangeText={(value) => onChange(withMacro(item, 'carbs', Number(value) || 0))}
          />
          <NumericInput
            label="Fat g" value={String(item.macros.fat)} style={styles.macroField}
            onChangeText={(value) => onChange(withMacro(item, 'fat', Number(value) || 0))}
          />
        </View>
      )}
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  card: { gap: 9 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameField: { flex: 1, minWidth: 0 },
  quantityRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  quantityField: { width: 132 },
  unitField: { flex: 1, gap: 4, minWidth: 0 },
  fieldLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  hint: { color: colors.cornerBlue, fontSize: 10.5 },
  reference: { color: colors.textMuted, fontSize: 10, fontStyle: 'italic', lineHeight: 14 },
  prepRow: { gap: 5 },
  macroSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 36, paddingHorizontal: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  calories: { color: colors.gold, fontFamily: type.display, fontSize: 15, fontWeight: '900' },
  macroLine: { flex: 1, color: colors.textMuted, fontSize: 10.5 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroField: { flexGrow: 1, flexBasis: 100 },
})
