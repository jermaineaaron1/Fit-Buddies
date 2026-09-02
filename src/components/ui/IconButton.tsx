import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  /** Required — an icon alone never explains itself to a screen reader. */
  accessibilityLabel: string
  tone?: 'primary' | 'gold' | 'neutral' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  selected?: boolean
  style?: StyleProp<ViewStyle>
}

const INK = {
  primary: colors.primary,
  gold: colors.gold,
  neutral: colors.textSecondary,
  danger: colors.danger,
}

/**
 * Square icon affordance. The visual box can shrink to 32px, but the touch
 * target never does — hit slop pads it back out to 44 regardless.
 */
export function IconButton({
  icon, onPress, accessibilityLabel, tone = 'neutral', size = 'md', disabled = false, selected = false, style,
}: IconButtonProps) {
  const box = size === 'sm' ? 32 : 38
  const pad = Math.max(0, (layout.touch - box) / 2)

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      hitSlop={{ top: pad, bottom: pad, left: pad, right: pad }}
      style={[
        styles.base,
        { width: box, height: box },
        selected && { borderColor: INK[tone] },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View pointerEvents="none">
        <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={disabled ? colors.textMuted : INK[tone]} />
      </View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.cardRaised,
  },
  disabled: { opacity: 0.4 },
})
