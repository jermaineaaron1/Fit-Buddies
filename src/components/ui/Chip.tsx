import React from 'react'
import { Text, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

export type ChipTone = 'neutral' | 'primary' | 'gold' | 'blue' | 'danger'

interface ChipProps {
  label: string
  tone?: ChipTone
  icon?: keyof typeof Ionicons.glyphMap
  /** Omit to render a static badge rather than a control. */
  onPress?: () => void
  selected?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

const ACCENT: Record<ChipTone, string> = {
  neutral: colors.steel,
  primary: colors.primary,
  gold: colors.gold,
  blue: colors.cornerBlue,
  danger: colors.danger,
}

/**
 * Small status badge, or a single-choice control when given `onPress`.
 * Selection is carried by fill AND border AND ink together — colour alone
 * would strand anyone who cannot separate red from gold at this size.
 */
export function Chip({ label, tone = 'neutral', icon, onPress, selected = false, disabled = false, style }: ChipProps) {
  const accent = ACCENT[tone]
  const ink = selected ? (tone === 'gold' ? colors.bg : '#FFFFFF') : accent

  const body = (
    <>
      {icon && <Ionicons name={icon} size={11} color={ink} />}
      <Text style={[styles.label, { color: ink }]} numberOfLines={1}>{label}</Text>
    </>
  )

  const boxStyle = [
    styles.base,
    { borderColor: accent, backgroundColor: selected ? accent : accent + '1A' },
    disabled && styles.disabled,
    style,
  ]

  if (!onPress) return <View style={boxStyle}>{body}</View>

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      // The visual pill is short; the hit area is not.
      hitSlop={{ top: 9, bottom: 9, left: 4, right: 4 }}
      style={boxStyle}
    >
      {body}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, minHeight: 26,
    borderRadius: radius.sm, borderWidth: 1, alignSelf: 'flex-start',
  },
  disabled: { opacity: 0.4 },
  label: { fontFamily: type.display, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
})
