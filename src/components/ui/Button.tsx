import React, { useState } from 'react'
import { Text, View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'
import { SparkBurst } from './SparkBurst'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  size?: 'sm' | 'md' | 'lg'
  celebrate?: boolean
}

type Variant = NonNullable<ButtonProps['variant']>

// Two-stop metallic ramps read as stamped plate rather than flat fill, which
// is what sells the arcade-fighter look.
const GRADIENTS: Record<Variant, [string, string]> = {
  primary: [colors.primary, colors.primaryDark],
  secondary: [colors.cardRaised, colors.card],
  danger: [colors.crimson, colors.primaryDark],
  ghost: ['transparent', 'transparent'],
}

const EDGE: Record<Variant, string> = {
  primary: colors.gold,
  secondary: colors.steel,
  danger: colors.gold,
  ghost: colors.primary,
}

export function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, style, size = 'md', celebrate = false,
}: ButtonProps) {
  const inert = disabled || loading
  const [burstKey, setBurstKey] = useState(0)

  function handlePress() {
    if (celebrate) setBurstKey((value) => value + 1)
    onPress()
  }

  return (
    <AnimatedPressable
      style={[styles.wrap, styles[`size_${size}`], inert && styles.disabled, style]}
      onPress={handlePress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading }}
    >
      {celebrate && <SparkBurst burstKey={burstKey} />}
      {/* Only the plate is sheared. Skewing the whole button would drag the
          label off-axis and wreck legibility, so the text sits above it. */}
      <View style={styles.plate} pointerEvents="none">
        <LinearGradient
          colors={GRADIENTS[variant]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderColor: EDGE[variant] }]}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} size="small" />
      ) : (
        <View style={styles.labelRow}>
          <View style={[styles.tick, { backgroundColor: EDGE[variant] }]} />
          <Text style={[styles.label, styles[`label_${variant}`]]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  )
}

const SKEW = '-9deg'

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    // The shear overflows the box horizontally; this inset stops the sheared
    // corners clipping against neighbouring content.
    marginHorizontal: 5,
  },
  plate: {
    position: 'absolute',
    top: 0, bottom: 0, left: -5, right: -5,
    transform: [{ skewX: SKEW }],
  },
  gradient: { flex: 1, borderWidth: 1, borderRadius: radius.sm },
  disabled: { opacity: 0.4 },

  size_sm: { paddingVertical: 9, paddingHorizontal: 18, minHeight: 38 },
  size_md: { paddingVertical: 14, paddingHorizontal: 22, minHeight: 50 },
  size_lg: { paddingVertical: 17, paddingHorizontal: 26, minHeight: 56 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tick: { width: 3, height: 15, transform: [{ skewX: SKEW }] },
  label: {
    fontFamily: type.display, fontSize: 16, fontWeight: '900',
    letterSpacing: 1.1, textTransform: 'uppercase',
  },
  label_primary: { color: '#fff' },
  label_secondary: { color: colors.text },
  label_danger: { color: '#fff' },
  label_ghost: { color: colors.gold },
})
