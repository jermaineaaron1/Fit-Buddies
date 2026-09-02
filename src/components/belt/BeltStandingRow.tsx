import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { totalWeight } from '../../lib/belt'
import type { BeltStanding, CategoryWeights } from '../../types/app'

const ELIMINATION_COPY: Record<string, string> = {
  login_streak_broken: 'Streak broken',
  missed_weekly_sessions: 'Missed weekly sessions',
}

interface BeltStandingRowProps {
  standing: BeltStanding
  rank: number
  weights: CategoryWeights
  isSelf: boolean
}

export function BeltStandingRow({ standing, rank, weights, isSelf }: BeltStandingRowProps) {
  const max = totalWeight(weights) || 1
  const pct = Math.max(0, Math.min(1, Number(standing.total_points) / max))

  return (
    <View style={[styles.row, isSelf && styles.rowSelf, standing.is_eliminated && styles.rowOut]}>
      <View style={styles.header}>
        <Text style={styles.rank}>{standing.is_eliminated ? '—' : rank}</Text>
        <View style={styles.flex1}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{standing.display_name}</Text>
            {standing.is_champion && <Ionicons name="trophy" size={13} color={colors.gold} />}
            {isSelf && <Text style={styles.you}>YOU</Text>}
          </View>
          {standing.is_eliminated && (
            <Text style={styles.out}>
              ELIMINATED · {ELIMINATION_COPY[standing.eliminated_reason ?? ''] ?? 'Requirements not met'}
            </Text>
          )}
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.total}>{Math.round(Number(standing.total_points))}</Text>
          <Text style={styles.totalMax}>/ {max}</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>

      {/* Category breakdown — steps is omitted while its weight is 0. */}
      <View style={styles.breakdown}>
        <Category label="Streak" value={standing.login_streak_points} max={weights.login_streak} />
        <Category label="Training" value={standing.training_volume_points} max={weights.training_volume} />
        <Category label="Nutrition" value={standing.nutrition_points} max={weights.nutrition} />
        {weights.steps > 0 && <Category label="Steps" value={standing.steps_points} max={weights.steps} />}
      </View>
    </View>
  )
}

function Category({ label, value, max }: { label: string; value: number; max: number }) {
  if (max <= 0) return null
  return (
    <View style={styles.category}>
      <Text style={styles.categoryLabel}>{label}</Text>
      <Text style={styles.categoryValue}>{Math.round(Number(value))}<Text style={styles.categoryMax}>/{max}</Text></Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 9, padding: 13, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  rowSelf: { borderColor: colors.primary },
  rowOut: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rank: { color: colors.gold, fontFamily: type.display, fontSize: 19, fontWeight: '900', minWidth: 22 },
  flex1: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '800', textTransform: 'uppercase' },
  you: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  out: { color: colors.danger, fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.4 },
  totalWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  total: { color: colors.text, fontFamily: type.display, fontSize: 22, fontWeight: '900' },
  totalMax: { color: colors.textMuted, fontSize: 11 },
  track: { height: 6, borderRadius: radius.full, backgroundColor: colors.steelDark, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  breakdown: { flexDirection: 'row', gap: 8 },
  category: {
    flex: 1, gap: 1, paddingVertical: 6, paddingHorizontal: 8,
    borderRadius: radius.sm, backgroundColor: colors.surface,
  },
  categoryLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 },
  categoryValue: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  categoryMax: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
})
