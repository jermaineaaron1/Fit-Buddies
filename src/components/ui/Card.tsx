import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { colors, radius } from '../../constants/theme'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  variant?: 'default' | 'highlight'
}

// Hard-edged plate with a notched top-left corner and a coloured rail, matching
// CombatPanel. React Native has no clip-path, so the notch is a square rotated
// 45 degrees painted in the page background — it only reads as a cut against
// colors.bg, which is what every screen using Card sits on.
export function Card({ children, style, variant = 'default' }: CardProps) {
  const highlight = variant === 'highlight'
  return (
    <View style={[styles.card, highlight && styles.highlight, style]}>
      <View style={[styles.rail, highlight && styles.railHighlight]} />
      <View style={styles.notch} />
      <View style={[styles.tick, highlight && styles.tickHighlight]} />
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const NOTCH = 15

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    paddingLeft: 19,
  },
  highlight: { borderColor: colors.goldDark, backgroundColor: '#1A1508' },
  content: { position: 'relative' },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.steel },
  railHighlight: { backgroundColor: colors.gold },
  notch: {
    position: 'absolute',
    top: -NOTCH / 2, left: -NOTCH / 2,
    width: NOTCH, height: NOTCH,
    backgroundColor: colors.bg,
    transform: [{ rotate: '45deg' }],
  },
  tick: { position: 'absolute', top: 6, right: 5, width: 11, height: 2, backgroundColor: colors.steel },
  tickHighlight: { backgroundColor: colors.gold },
})
