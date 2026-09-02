import React from 'react'
import { Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

export type CompactButtonTone = 'primary' | 'gold' | 'neutral' | 'quiet' | 'danger'
export type CompactButtonSize = 'sm' | 'md'

interface CompactButtonProps {
  label: string
  onPress: () => void
  tone?: CompactButtonTone
  size?: CompactButtonSize
  icon?: keyof typeof Ionicons.glyphMap
  iconAfter?: keyof typeof Ionicons.glyphMap
  loading?: boolean
  disabled?: boolean
  /** Selected state, for buttons used as a persistent toggle. */
  selected?: boolean
  /** Fills the row. Off by default — ordinary navigation should not be a slab. */
  block?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

const FILL: Record<CompactButtonTone, string> = {
  primary: colors.primary,
  gold: colors.gold,
  neutral: colors.cardRaised,
  quiet: 'transparent',
  danger: colors.primaryDark,
}

const EDGE: Record<CompactButtonTone, string> = {
  primary: colors.primary,
  gold: colors.gold,
  neutral: colors.borderLight,
  quiet: colors.border,
  danger: colors.primaryDark,
}

// Ink has to contrast the fill, not the page: the gold plate is light enough
// that cream text on it is unreadable.
const INK: Record<CompactButtonTone, string> = {
  primary: '#FFFFFF',
  gold: colors.bg,
  neutral: colors.text,
  quiet: colors.textSecondary,
  danger: '#FFFFFF',
}

/**
 * The everyday action control: a flat plate sized for a dense layout, not the
 * full-width sheared slab `Button` uses. `Button` is kept for the handful of
 * ceremonial moments (saving a workout, claiming a title) where the spectacle
 * is the point; everything routine uses this.
 */
export function CompactButton({
  label, onPress, tone = 'neutral', size = 'md', icon, iconAfter,
  loading = false, disabled = false, selected = false, block = false, style, accessibilityLabel,
}: CompactButtonProps) {
  const inert = disabled || loading
  const ink = selected && tone === 'neutral' ? colors.gold : INK[tone]

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert, busy: loading, selected }}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: FILL[tone], borderColor: EDGE[tone] },
        selected && styles.selected,
        block && styles.block,
        inert && styles.inert,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={ink} />
        : icon ? <Ionicons name={icon} size={size === 'sm' ? 13 : 15} color={ink} /> : null}
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: ink }]} numberOfLines={1}>{label}</Text>
      {iconAfter && !loading && <Ionicons name={iconAfter} size={size === 'sm' ? 13 : 15} color={ink} />}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: radius.sm, alignSelf: 'flex-start',
  },
  // Height floors keep the target tappable even where the visual is compact.
  sm: { paddingHorizontal: 10, paddingVertical: 7, minHeight: 34 },
  md: { paddingHorizontal: 14, paddingVertical: 9, minHeight: layout.touch },
  block: { alignSelf: 'stretch' },
  selected: { borderColor: colors.gold },
  inert: { opacity: 0.45 },
  label: { fontFamily: type.display, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  labelSm: { fontSize: 11.5 },
})
