import React from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactButton } from './CompactButton'

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  /** One sentence. Says what is missing and what fills it. */
  message?: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'neutral' | 'gold' | 'red'
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

const ACCENT = { neutral: colors.steel, gold: colors.gold, red: colors.primary }

/** Same footprint as the populated card it replaces, so nothing jumps. */
export function EmptyState({
  icon = 'ellipse-outline', title, message, actionLabel, onAction, tone = 'neutral', compact = false, style,
}: EmptyStateProps) {
  return (
    <View style={[styles.box, compact && styles.compact, { borderColor: ACCENT[tone] + '55' }, style]}>
      <Ionicons name={icon} size={compact ? 17 : 20} color={ACCENT[tone]} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <CompactButton label={actionLabel} onPress={onAction} size="sm" tone={tone === 'gold' ? 'gold' : 'neutral'} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    padding: 14, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed',
    backgroundColor: colors.card,
  },
  compact: { padding: 10 },
  copy: { flex: 1, gap: 2 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  message: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
})
