import React from 'react'
import { View, StyleSheet, type ViewStyle } from 'react-native'
import { colors } from '../../constants/theme'

export type PanelTone = 'steel' | 'red' | 'gold'

const RAIL: Record<PanelTone, string> = {
  steel: colors.steel,
  red: colors.primary,
  gold: colors.gold,
}

const EDGE: Record<PanelTone, string> = {
  steel: colors.border,
  red: colors.primaryDark,
  gold: colors.goldDark,
}

interface CombatPanelProps {
  children: React.ReactNode
  tone?: PanelTone
  /** Background the corner notches punch through to. Defaults to the page bg. */
  cutColor?: string
  style?: ViewStyle
}

// The house panel shape: a hard-edged plate with its top-left and bottom-right
// corners notched out and a coloured rail down the left side. React Native has
// no clip-path, so the notches are squares rotated 45 degrees and painted in
// the surrounding background colour — which means `cutColor` must match
// whatever sits behind the panel or the cut will show as a floating diamond.
export function CombatPanel({ children, tone = 'steel', cutColor = colors.bg, style }: CombatPanelProps) {
  return (
    <View style={[styles.panel, { borderColor: EDGE[tone] }, style]}>
      <View style={[styles.rail, { backgroundColor: RAIL[tone] }]} />
      <View style={[styles.notch, styles.notchTL, { backgroundColor: cutColor }]} />
      <View style={[styles.notch, styles.notchBR, { backgroundColor: cutColor }]} />
      {/* Bracket ticks read as machined hardware rather than decoration. */}
      <View style={[styles.tick, styles.tickTR, { backgroundColor: RAIL[tone] }]} />
      <View style={[styles.tick, styles.tickBL, { backgroundColor: RAIL[tone] }]} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const NOTCH = 16

const styles = StyleSheet.create({
  panel: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
  },
  content: { paddingLeft: 6 },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    transform: [{ rotate: '45deg' }],
  },
  notchTL: { top: -NOTCH / 2, left: -NOTCH / 2 },
  notchBR: { bottom: -NOTCH / 2, right: -NOTCH / 2 },
  tick: { position: 'absolute', width: 10, height: 2 },
  tickTR: { top: 5, right: 4 },
  tickBL: { bottom: 5, left: 8 },
})
