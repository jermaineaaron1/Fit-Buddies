import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

export interface ContenderRowProps {
  rank: number
  name: string
  avatarUrl?: string | null
  /** Secondary identity line: "Red corner · Lv. 2", or an eligibility note. */
  subtitle?: string
  points: number
  /** Signed fraction. Null while a baseline is still being established. */
  improvement?: number | null
  streakDays?: number | null
  isSelf?: boolean
  /** Marks the reigning champion where champion and contenders share a list. */
  isChampion?: boolean
  /** Right-hand status pill, e.g. "Eligible" or "1 more win". */
  badge?: string
  eliminated?: boolean
  onPress?: () => void
}

const RANK_INK = [colors.gold, '#ADA495', '#B8763D']

/**
 * One standings line. Dense by design: the previous card-per-member layout
 * fitted three people on a phone screen, which made a leaderboard unreadable
 * as a leaderboard.
 */
export function ContenderRow({
  rank, name, avatarUrl, subtitle, points, improvement, streakDays,
  isSelf = false, isChampion = false, badge, eliminated = false, onPress,
}: ContenderRowProps) {
  const rankInk = RANK_INK[rank - 1] ?? colors.textMuted
  const trendInk = improvement == null ? colors.textMuted
    : improvement >= 0 ? colors.cornerBlue : colors.crimson

  const body = (
    <>
      {isSelf && <View style={styles.selfRail} />}
      {/* A rank of 0 means "no longer ranked" — showing the digit reads as a
          real position above first place. */}
      <Text style={[styles.rank, { color: rankInk }]}>{rank > 0 ? rank : '—'}</Text>

      <View style={[styles.avatar, isSelf && styles.avatarSelf, isChampion && styles.avatarChampion]}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
          : <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>}
      </View>

      <View style={styles.copy}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, eliminated && styles.struck]} numberOfLines={1}>
            {name}{isSelf ? ' (you)' : ''}
          </Text>
          {isChampion && <Ionicons name="ribbon" size={12} color={colors.gold} />}
        </View>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      {streakDays ? (
        <View style={styles.streak}>
          <Ionicons name="flame" size={11} color={colors.gold} />
          <Text style={styles.streakText}>{streakDays}</Text>
        </View>
      ) : null}

      {improvement !== undefined ? (
        <View style={styles.trend}>
          {improvement === null ? (
            <Text style={styles.baseline}>base</Text>
          ) : (
            <>
              <Ionicons name={improvement >= 0 ? 'arrow-up' : 'arrow-down'} size={9} color={trendInk} />
              <Text style={[styles.trendText, { color: trendInk }]}>{Math.abs(Math.round(improvement * 100))}%</Text>
            </>
          )}
        </View>
      ) : null}

      <View style={styles.scoreBlock}>
        <Text style={[styles.points, isSelf && styles.pointsSelf]}>{points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>

      {/* Kept short by callers and capped here: at 375px a long badge starved
          the name column until it collapsed to an ellipsis. Anything longer
          than a word or two belongs in `subtitle`. */}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>{badge}</Text>
        </View>
      ) : null}

      {onPress ? <Ionicons name="chevron-forward" size={14} color={colors.textMuted} /> : null}
    </>
  )

  const label = `${rank > 0 ? `Rank ${rank}, ` : ''}${name}, ${points} points${eliminated ? ', eliminated' : ''}${badge ? `, ${badge}` : ''}`
  const box = [styles.row, isSelf && styles.rowSelf, eliminated && styles.rowEliminated]

  if (!onPress) return <View style={box} accessible accessibilityLabel={label}>{body}</View>
  return (
    <AnimatedPressable style={box} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  row: {
    position: 'relative', overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 9,
    minHeight: 54, paddingVertical: 7, paddingHorizontal: 10,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowSelf: { borderColor: colors.primary, backgroundColor: colors.cardRaised, paddingLeft: 12 },
  rowEliminated: { opacity: 0.55 },
  selfRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary },
  rank: { width: 17, textAlign: 'center', fontFamily: type.display, fontSize: 15, fontWeight: '900' },
  avatar: {
    width: 32, height: 32, borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  avatarSelf: { borderColor: colors.primary },
  avatarChampion: { borderColor: colors.gold, borderWidth: 1.5 },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 14, fontWeight: '900' },
  copy: { flex: 1, minWidth: 64, gap: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, color: colors.text, fontFamily: type.display, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  struck: { textDecorationLine: 'line-through', color: colors.textMuted },
  subtitle: { color: colors.textMuted, fontSize: 10 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakText: { color: colors.gold, fontSize: 10.5, fontWeight: '800' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 1, minWidth: 34, justifyContent: 'flex-end' },
  trendText: { fontSize: 10.5, fontWeight: '800' },
  baseline: { color: colors.textMuted, fontSize: 9.5, fontStyle: 'italic' },
  scoreBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  points: { color: colors.text, fontFamily: type.display, fontSize: 16, fontWeight: '900' },
  pointsSelf: { color: colors.primary },
  pointsLabel: { color: colors.textMuted, fontSize: 9 },
  badge: {
    maxWidth: 92, flexShrink: 0,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.gold + '1A',
  },
  badgeText: { color: colors.gold, fontFamily: type.display, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
})
