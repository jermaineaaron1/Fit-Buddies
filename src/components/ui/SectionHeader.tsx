import React from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { colors, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

interface SectionHeaderProps {
  title: string
  /** Short right-aligned context: a count, a period, a status. */
  meta?: string
  /** Optional trailing text action. Kept small — never a full-width button. */
  actionLabel?: string
  onAction?: () => void
  children?: React.ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * One line of section identity. Deliberately has no eyebrow/subtitle pair —
 * the old screens stacked an eyebrow, a title, and a subtitle above every
 * list, which is three lines of chrome before any information.
 */
export function SectionHeader({ title, meta, actionLabel, onAction, children, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      <View style={styles.right}>
        {children}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        {actionLabel && onAction ? (
          <AnimatedPressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 24 },
  title: {
    flexShrink: 1, color: colors.text, fontFamily: type.display, fontSize: 13,
    fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  meta: { color: colors.textMuted, fontSize: 11 },
  action: { color: colors.cornerBlue, fontSize: 11.5, fontWeight: '700' },
})
