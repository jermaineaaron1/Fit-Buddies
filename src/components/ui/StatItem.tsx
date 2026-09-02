import React from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, type } from '../../constants/theme'

export type TrendDirection = 'up' | 'down' | 'flat'

interface StatItemProps {
  label: string
  value: string
  /** Small qualifier under the value: "This week", "Daily average". */
  caption?: string
  icon?: keyof typeof Ionicons.glyphMap
  /** Gold for championship, blue for personal progress, red for live/competitive. */
  tone?: 'gold' | 'blue' | 'red' | 'plain'
  trend?: { direction: TrendDirection; label: string }
  style?: StyleProp<ViewStyle>
}

const TONE = {
  gold: colors.gold,
  blue: colors.cornerBlue,
  red: colors.primary,
  plain: colors.text,
}

/**
 * One figure in a weekly summary strip. Deliberately unboxed — the strip
 * itself carries the single border, so five of these do not become five
 * nested bordered containers.
 */
export function StatItem({ label, value, caption, icon, tone = 'plain', trend, style }: StatItemProps) {
  // Down is not automatically bad (body weight, resting heart rate), so the
  // colour follows the caller's stated direction rather than the sign.
  const trendColor = trend?.direction === 'up' ? colors.cornerBlue
    : trend?.direction === 'down' ? colors.crimson
    : colors.textMuted

  return (
    <View style={[styles.item, style]}>
      <View style={styles.labelRow}>
        {icon && <Ionicons name={icon} size={11} color={colors.textMuted} />}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: TONE[tone] }]} numberOfLines={1}>{value}</Text>
      {trend ? (
        <View style={styles.trendRow}>
          <Ionicons
            name={trend.direction === 'up' ? 'arrow-up' : trend.direction === 'down' ? 'arrow-down' : 'remove'}
            size={10}
            color={trendColor}
          />
          <Text style={[styles.trend, { color: trendColor }]} numberOfLines={1}>{trend.label}</Text>
        </View>
      ) : caption ? (
        <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  item: { gap: 2, minWidth: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  label: { color: colors.textMuted, fontFamily: type.display, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 1 },
  value: { fontFamily: type.display, fontSize: 19, fontWeight: '900', letterSpacing: 0.2 },
  caption: { color: colors.textMuted, fontSize: 9.5 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trend: { fontSize: 9.5, fontWeight: '700' },
})
