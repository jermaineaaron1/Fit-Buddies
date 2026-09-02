import React, { useEffect, useRef } from 'react'
import { View, Text, TextInput, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

interface NumericInputProps {
  value: string
  onChangeText: (value: string) => void
  label?: string
  placeholder?: string
  suffix?: string
  /** Adds −/+ steppers. Typing still works; the steppers are for small nudges. */
  step?: number
  min?: number
  max?: number
  /** Whole numbers only — reps and sets, as opposed to weight or distance. */
  integer?: boolean
  error?: string
  disabled?: boolean
  align?: 'left' | 'center'
  style?: StyleProp<ViewStyle>
  onBlur?: () => void
  accessibilityLabel?: string
}

/**
 * Numeric field with an optional stepper pair. Keyboard type is decimal or
 * numeric per `integer`, so a phone never offers a decimal point for reps.
 * The value stays a string throughout: clearing the box has to be possible,
 * and a half-typed "1." is not yet a number.
 */
export function NumericInput({
  value, onChangeText, label, placeholder, suffix, step, min, max,
  integer = false, error, disabled = false, align = 'left', style, onBlur, accessibilityLabel,
}: NumericInputProps) {
  // Holds the value this component last emitted, so consecutive stepper taps
  // chain instead of all recomputing from the same stale prop.
  const pending = useRef<number | null>(null)
  useEffect(() => { pending.current = null }, [value])

  function sanitise(next: string) {
    const cleaned = integer ? next.replace(/[^0-9]/g, '') : next.replace(/[^0-9.]/g, '')
    // Guard against "1.2.3" — keep the first decimal point only.
    const parts = cleaned.split('.')
    pending.current = null
    onChangeText(parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned)
  }

  function nudge(direction: 1 | -1) {
    if (step === undefined) return
    // Two quick taps both read the same `value` prop, because React has not
    // re-rendered between them — so the second increment was silently lost.
    // Chaining off the last emitted value fixes that; `pending` is cleared as
    // soon as the prop catches up, so an external change still wins.
    const fromProp = parseFloat(value)
    const base = pending.current ?? (Number.isFinite(fromProp) ? fromProp : 0)
    let next = base + direction * step
    if (min !== undefined) next = Math.max(min, next)
    if (max !== undefined) next = Math.min(max, next)
    // Floating point makes 2.5 + 0.1 into 2.5999999999999996; two decimals is
    // all any field here needs.
    const rounded = Math.round(next * 100) / 100
    pending.current = rounded
    onChangeText(String(rounded))
  }

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, error && styles.rowError, disabled && styles.disabled]}>
        {step !== undefined && (
          <AnimatedPressable
            onPress={() => nudge(-1)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label ?? accessibilityLabel ?? 'value'}`}
            style={styles.stepper}
          >
            <Ionicons name="remove" size={15} color={colors.textSecondary} />
          </AnimatedPressable>
        )}
        <TextInput
          value={value}
          onChangeText={sanitise}
          onBlur={onBlur}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.gold}
          keyboardType={integer ? 'number-pad' : 'decimal-pad'}
          inputMode={integer ? 'numeric' : 'decimal'}
          accessibilityLabel={accessibilityLabel ?? label}
          style={[
            styles.input,
            align === 'center' && styles.inputCentre,
            step !== undefined && styles.inputStepped,
          ]}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {step !== undefined && (
          <AnimatedPressable
            onPress={() => nudge(1)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label ?? accessibilityLabel ?? 'value'}`}
            style={styles.stepper}
          >
            <Ionicons name="add" size={15} color={colors.textSecondary} />
          </AnimatedPressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: {
    color: colors.textMuted, fontFamily: type.display, fontSize: 9.5,
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', minHeight: layout.touch,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    backgroundColor: colors.cardRaised, overflow: 'hidden',
  },
  rowError: { borderColor: colors.danger },
  disabled: { opacity: 0.45 },
  stepper: { width: 36, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: layout.touch },
  input: {
    flex: 1, minWidth: 0, color: colors.text, fontFamily: type.body, fontSize: 15, fontWeight: '700',
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'web' ? 9 : 8,
    // Web renders a focus ring that fights the border; the border is the signal.
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object,
  },
  inputStepped: { paddingHorizontal: 2, textAlign: 'center' },
  inputCentre: { textAlign: 'center' },
  suffix: { color: colors.textMuted, fontSize: 11, fontWeight: '700', paddingRight: 8 },
  error: { color: colors.danger, fontSize: 10.5 },
})
