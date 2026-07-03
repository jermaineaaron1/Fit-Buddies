import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { LeaderboardEntry } from '../../types/app'

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#B45309']
const BADGE_COLORS: Record<string, string> = {
  'Most Consistent': '#10B981',
  'Comeback Kid': '#F59E0B',
  'Encourager': '#EC4899',
  'Top Logger': '#6366F1',
  'Streak Legend': '#EF4444',
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  isCurrentUser: boolean
}

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const rankColor = RANK_COLORS[entry.rank - 1] ?? '#64748B'

  return (
    <View style={[styles.row, isCurrentUser && styles.highlighted]}>
      <Text style={[styles.rank, { color: rankColor }]}>
        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
      </Text>
      <View style={styles.info}>
        <Text style={styles.name}>
          {entry.display_name}
          {isCurrentUser ? ' (you)' : ''}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.streak}>🔥 {entry.current_streak}d</Text>
          {entry.badge && (
            <View style={[styles.badge, { backgroundColor: BADGE_COLORS[entry.badge] + '22' }]}>
              <Text style={[styles.badgeText, { color: BADGE_COLORS[entry.badge] }]}>{entry.badge}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.xpContainer}>
        <Text style={styles.xp}>{entry.weekly_xp}</Text>
        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  highlighted: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  rank: { fontSize: 18, fontWeight: '700', width: 36, textAlign: 'center' },
  info: { flex: 1, gap: 4 },
  name: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { color: '#94A3B8', fontSize: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  xpContainer: { alignItems: 'flex-end' },
  xp: { color: '#6366F1', fontSize: 18, fontWeight: '800' },
  xpLabel: { color: '#475569', fontSize: 11 },
})
