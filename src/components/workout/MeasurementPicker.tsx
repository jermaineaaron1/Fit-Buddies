import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { MEASUREMENT_ORDER, MEASUREMENT_SCHEMAS, schemaFor } from '../../lib/measurementSchemas'
import type { MeasurementType } from '../../types/database'

interface MeasurementPickerProps {
  value: MeasurementType
  onChange: (type: MeasurementType) => void
  disabled?: boolean
}

/**
 * Picks how an exercise is measured. Collapsed to the current choice until
 * tapped, because it is set once per exercise and then never touched again —
 * seven permanently-visible options would dominate a card whose real content
 * is the sets.
 */
export function MeasurementPicker({ value, onChange, disabled = false }: MeasurementPickerProps) {
  const [open, setOpen] = useState(false)
  const current = schemaFor(value)

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        style={[styles.trigger, open && styles.triggerOpen, disabled && styles.disabled]}
        onPress={() => setOpen((state) => !state)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        accessibilityLabel={`Measured as ${current.label}. Change`}
      >
        <Ionicons name={current.icon} size={15} color={colors.gold} />
        <Text style={styles.triggerText} numberOfLines={1}>{current.shortLabel}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
      </AnimatedPressable>

      {open && (
        <View style={styles.options}>
          {MEASUREMENT_ORDER.map((type) => {
            const schema = MEASUREMENT_SCHEMAS[type]
            const selected = type === value
            return (
              <AnimatedPressable
                key={type}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => { onChange(type); setOpen(false) }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${schema.label}. ${schema.blurb}`}
              >
                <Ionicons name={schema.icon} size={15} color={selected ? colors.gold : colors.textSecondary} />
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{schema.label}</Text>
                  <Text style={styles.optionBlurb} numberOfLines={2}>{schema.blurb}</Text>
                </View>
                {selected && <Ionicons name="checkmark" size={15} color={colors.gold} />}
              </AnimatedPressable>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: layout.touch, paddingHorizontal: 11,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  triggerOpen: { borderColor: colors.gold },
  triggerText: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 12.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  disabled: { opacity: 0.45 },
  options: {
    gap: 2, padding: 4,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: layout.touch, paddingHorizontal: 8, borderRadius: radius.sm,
  },
  optionSelected: { backgroundColor: colors.gold + '14' },
  optionCopy: { flex: 1, minWidth: 0 },
  optionLabel: { color: colors.textSecondary, fontFamily: type.display, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  optionLabelSelected: { color: colors.text },
  optionBlurb: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
})
