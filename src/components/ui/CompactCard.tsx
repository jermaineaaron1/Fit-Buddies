import React from 'react'
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

export type CardAccent = 'none' | 'red' | 'gold' | 'blue' | 'steel'

interface CompactCardProps {
  children: React.ReactNode
  /** The single strong accent border. One per important card, not per nesting level. */
  accent?: CardAccent
  /** Raised background, for a card that sits on top of another surface. */
  raised?: boolean
  onPress?: () => void
  disabled?: boolean
  selected?: boolean
  padded?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

const RAIL: Record<CardAccent, string | null> = {
  none: null,
  red: colors.primary,
  gold: colors.gold,
  blue: colors.cornerBlue,
  steel: colors.steel,
}

/**
 * The default container. A flat plate with one optional left rail — no corner
 * notches, no bracket ticks, no gradient. `CombatPanel` still exists for the
 * championship moments; using it everywhere is what made ordinary lists look
 * like promotional artwork.
 */
export function CompactCard({
  children, accent = 'none', raised = false, onPress, disabled = false,
  selected = false, padded = true, style, accessibilityLabel,
}: CompactCardProps) {
  const rail = RAIL[accent]
  const box = [
    styles.card,
    raised && styles.raised,
    padded && styles.padded,
    rail ? styles.withRail : null,
    selected && styles.selected,
    disabled && styles.disabled,
    style,
  ]

  const body = (
    <>
      {rail && <View style={[styles.rail, { backgroundColor: rail }]} />}
      {children}
    </>
  )

  if (!onPress) return <View style={box}>{body}</View>

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      style={box}
    >
      {body}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative', overflow: 'hidden',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  raised: { backgroundColor: colors.cardRaised },
  padded: { padding: 12 },
  withRail: { paddingLeft: 14, borderLeftWidth: 0 },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  selected: { borderColor: colors.gold },
  disabled: { opacity: 0.5 },
})
