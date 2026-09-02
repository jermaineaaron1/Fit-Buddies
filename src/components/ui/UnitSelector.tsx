import React, { useState } from 'react'
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'
import { Chip } from './Chip'
import { UNITS, COMMON_UNITS, unitLabel, type QuantityUnit } from '../../lib/units'

interface UnitSelectorProps {
  value: QuantityUnit
  onChange: (unit: QuantityUnit) => void
  /** Units shown inline before the overflow control. */
  common?: readonly QuantityUnit[]
  disabled?: boolean
}

const GROUP_LABEL: Record<string, string> = {
  weight: 'Weight',
  volume: 'Volume',
  household: 'Household',
}

/**
 * Six units inline, the remaining eight behind a sheet. Rendering all fourteen
 * as chips wrapped to four rows on a 375px phone and pushed the actual macro
 * fields off screen, which is exactly the density problem this redesign is for.
 */
export function UnitSelector({ value, onChange, common = COMMON_UNITS, disabled = false }: UnitSelectorProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  // A unit picked from the sheet stays visible inline afterwards, so the
  // selection never disappears behind "More".
  const inline = common.includes(value) ? common : [...common, value]

  return (
    <>
      <View style={styles.row}>
        {inline.map((unit) => (
          <Chip
            key={unit}
            label={unitLabel(unit)}
            tone="gold"
            selected={unit === value}
            disabled={disabled}
            onPress={() => onChange(unit)}
          />
        ))}
        <AnimatedPressable
          onPress={() => setSheetOpen(true)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="More units"
          hitSlop={{ top: 9, bottom: 9, left: 4, right: 4 }}
          style={styles.more}
        >
          <Text style={styles.moreText}>More</Text>
          <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} accessibilityLabel="Close unit picker">
          {/* Stops a tap inside the sheet from closing it. */}
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Choose a unit</Text>
              <AnimatedPressable onPress={() => setSheetOpen(false)} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </AnimatedPressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody}>
              {(['weight', 'volume', 'household'] as const).map((group) => (
                <View key={group} style={styles.group}>
                  <Text style={styles.groupLabel}>{GROUP_LABEL[group]}</Text>
                  {UNITS.filter((info) => info.group === group).map((info) => (
                    <AnimatedPressable
                      key={info.unit}
                      onPress={() => { onChange(info.unit); setSheetOpen(false) }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: info.unit === value }}
                      style={[styles.option, info.unit === value && styles.optionSelected]}
                    >
                      <Text style={styles.optionName}>{info.name}</Text>
                      <Text style={styles.optionMeta}>
                        {info.approxGrams === null
                          ? 'varies by food'
                          : `${info.approximate ? '≈' : '='} ${info.approxGrams} g`}
                      </Text>
                      {info.unit === value && <Ionicons name="checkmark" size={16} color={colors.gold} />}
                    </AnimatedPressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  more: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5, minHeight: 26,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  moreText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '76%', backgroundColor: colors.surface,
    borderTopWidth: 2, borderTopColor: colors.gold,
  },
  sheetHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase' },
  sheetBody: { padding: 16, paddingBottom: 34, gap: 18 },
  group: { gap: 4 },
  groupLabel: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46,
    paddingHorizontal: 12, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  optionSelected: { borderColor: colors.gold },
  optionName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  optionMeta: { color: colors.textMuted, fontSize: 11 },
})
