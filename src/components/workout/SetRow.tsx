import React from 'react'
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { IconButton } from '../ui/IconButton'
import { schemaFor, type FieldSpec, type SetDraft } from '../../lib/measurementSchemas'
import { formatSetSummary } from '../../lib/workoutFormat'
import type { MeasurementType } from '../../types/database'

interface SetRowProps {
  set: SetDraft
  index: number
  measurementType: MeasurementType
  /** Only one set is the working set; it gets the strong treatment. */
  active: boolean
  onChange: (patch: Partial<SetDraft>) => void
  onToggleComplete: () => void
  onDelete?: () => void
  onFocus?: () => void
}

/**
 * The column headings for a set table. Rendered once above the rows so each
 * row does not repeat its own labels.
 */
export function SetHeader({ measurementType }: { measurementType: MeasurementType }) {
  const schema = schemaFor(measurementType)
  return (
    <View style={styles.header}>
      <Text style={[styles.headText, styles.indexCol]}>Set</Text>
      {schema.fields.map((field) => (
        <Text key={String(field.key)} style={[styles.headText, { flex: field.flex ?? 1 }]} numberOfLines={1}>
          {field.short}
        </Text>
      ))}
      <View style={styles.checkCol} />
    </View>
  )
}

/**
 * One set. Completed sets collapse to a single summary line so a finished
 * exercise reads as a short history rather than a wall of inputs; the working
 * set keeps its fields open and carries the only strong border in the card.
 */
export function SetRow({
  set, index, measurementType, active, onChange, onToggleComplete, onDelete, onFocus,
}: SetRowProps) {
  const schema = schemaFor(measurementType)
  const done = set.completed

  if (done && !active) {
    return (
      <AnimatedPressable
        style={styles.doneRow}
        onPress={onFocus}
        accessibilityRole="button"
        accessibilityLabel={`Set ${index + 1}, ${formatSetSummary(set, measurementType)}. Edit`}
      >
        <Text style={[styles.indexText, styles.indexCol, styles.indexDone]}>{index + 1}</Text>
        <Text style={styles.doneSummary} numberOfLines={1}>{formatSetSummary(set, measurementType)}</Text>
        <AnimatedPressable
          onPress={onToggleComplete}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: true }}
          accessibilityLabel={`Mark set ${index + 1} not done`}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.checkCol}
        >
          <Ionicons name="checkmark-circle" size={19} color={colors.cornerBlue} />
        </AnimatedPressable>
      </AnimatedPressable>
    )
  }

  return (
    <View style={[styles.row, active && styles.rowActive]}>
      <Text style={[styles.indexText, styles.indexCol, active && styles.indexActive]}>{index + 1}</Text>

      {schema.fields.map((field) => (
        <SetField
          key={String(field.key)}
          field={field}
          set={set}
          onChange={onChange}
          onFocus={onFocus}
          setNumber={index + 1}
        />
      ))}

      <AnimatedPressable
        onPress={onToggleComplete}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!set.completed }}
        accessibilityLabel={`Mark set ${index + 1} done`}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={styles.checkCol}
      >
        <Ionicons
          name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={19}
          color={set.completed ? colors.cornerBlue : active ? colors.gold : colors.textMuted}
        />
      </AnimatedPressable>

      {onDelete && (
        <IconButton
          icon="close"
          size="sm"
          tone="danger"
          onPress={onDelete}
          accessibilityLabel={`Delete set ${index + 1}`}
          style={styles.delete}
        />
      )}
    </View>
  )
}

function SetField({
  field, set, onChange, onFocus, setNumber,
}: {
  field: FieldSpec
  set: SetDraft
  onChange: (patch: Partial<SetDraft>) => void
  onFocus?: () => void
  setNumber: number
}) {
  const raw = set[field.key]

  if (field.kind === 'choice') {
    // Cycles rather than opening a picker — three or five options do not
    // warrant a modal inside a table row, and tapping through is one gesture.
    const options = field.options ?? []
    const currentIndex = options.findIndex((option) => option.value === String(raw ?? ''))
    const current = options[currentIndex]
    return (
      <AnimatedPressable
        style={[styles.cell, styles.choiceCell, { flex: field.flex ?? 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${field.label} for set ${setNumber}: ${current?.label ?? 'not set'}. Change`}
        onPress={() => {
          const next = options[(currentIndex + 1) % options.length]
          const value = field.key === 'range_rating' ? Number(next.value) : next.value
          onChange({ [field.key]: value } as Partial<SetDraft>)
          onFocus?.()
        }}
      >
        <Text style={[styles.choiceText, !current && styles.placeholder]} numberOfLines={1}>
          {current?.label ?? '—'}
        </Text>
      </AnimatedPressable>
    )
  }

  const isDuration = field.kind === 'duration'
  const divisor = isDuration && field.durationUnit === 'minutes' ? 60 : 1
  const display = raw === null || raw === undefined
    ? ''
    : isDuration
      ? String(Math.round((Number(raw) / divisor) * 100) / 100)
      : String(raw)

  return (
    <View style={[styles.cell, { flex: field.flex ?? 1 }]}>
      <TextInput
        value={display}
        onFocus={onFocus}
        onChangeText={(text) => {
          const cleaned = field.kind === 'integer' ? text.replace(/[^0-9]/g, '') : text.replace(/[^0-9.]/g, '')
          if (cleaned === '') { onChange({ [field.key]: null } as Partial<SetDraft>); return }
          const parsed = parseFloat(cleaned)
          if (!Number.isFinite(parsed)) return
          const value = isDuration ? Math.round(parsed * divisor) : parsed
          onChange({ [field.key]: value } as Partial<SetDraft>)
        }}
        placeholder="—"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.gold}
        keyboardType={field.kind === 'integer' ? 'number-pad' : 'decimal-pad'}
        inputMode={field.kind === 'integer' ? 'numeric' : 'decimal'}
        accessibilityLabel={`${field.label} for set ${setNumber}${field.durationUnit === 'minutes' ? ' in minutes' : isDuration ? ' in seconds' : ''}`}
        style={styles.input}
      />
      {field.suffix ? <Text style={styles.suffix}>{field.suffix}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingBottom: 4 },
  headText: {
    color: colors.textMuted, fontFamily: type.display, fontSize: 9,
    fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    minHeight: layout.touch, paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: radius.sm, borderWidth: 1, borderColor: 'transparent',
  },
  // Only the working set gets the gold plate; everything else stays quiet.
  rowActive: { borderColor: colors.gold, backgroundColor: colors.gold + '10' },
  doneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    minHeight: 34, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  indexCol: { width: 22, textAlign: 'center' },
  indexText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 13, fontWeight: '900' },
  indexActive: { color: colors.gold },
  indexDone: { color: colors.textMuted, fontSize: 11 },
  doneSummary: { flex: 1, color: colors.textSecondary, fontSize: 11.5 },
  cell: {
    flexDirection: 'row', alignItems: 'center', minWidth: 0,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  input: {
    flex: 1, minWidth: 0, textAlign: 'center',
    color: colors.text, fontFamily: type.body, fontSize: 14, fontWeight: '700',
    paddingVertical: Platform.OS === 'web' ? 8 : 7, paddingHorizontal: 2,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
  },
  suffix: { color: colors.textMuted, fontSize: 9, paddingRight: 4 },
  choiceCell: { justifyContent: 'center', minHeight: 34, paddingHorizontal: 4 },
  choiceText: { color: colors.text, fontFamily: type.display, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  placeholder: { color: colors.textMuted },
  checkCol: { width: 26, alignItems: 'center', justifyContent: 'center' },
  delete: { marginLeft: 2 },
})
