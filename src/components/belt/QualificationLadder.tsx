import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactCard } from '../ui/CompactCard'
import { ELIGIBILITY_LADDER } from '../../lib/callouts'

interface QualificationLadderProps {
  /** The viewer's own contender rank, excluding the champion. Null if unranked. */
  myRank: number | null
  /** True when the viewer already holds the belt — they defend rather than qualify. */
  isChampion?: boolean
}

/**
 * What each standing entitles you to. Published in full rather than showing
 * only your own rung, because the ladder is only motivating if you can see
 * what moving up one place would buy you.
 */
export function QualificationLadder({ myRank, isChampion = false }: QualificationLadderProps) {
  return (
    <CompactCard accent="gold" padded={false}>
      <View style={styles.head}>
        <Ionicons name="trending-up" size={14} color={colors.gold} />
        <Text style={styles.title}>Qualification</Text>
        <Text style={styles.status} numberOfLines={1}>
          {isChampion ? 'You hold the belt' : myRank === null ? 'Unranked' : `You are No. ${myRank}`}
        </Text>
      </View>

      <View style={styles.rungs}>
        {ELIGIBILITY_LADDER.map((rung) => {
          const mine = !isChampion && myRank === rung.rank
          return (
            <View key={rung.rank} style={[styles.rung, mine && styles.rungMine]}>
              <Text style={[styles.rank, mine && styles.rankMine]}>{rung.rank}</Text>
              <View style={styles.copy}>
                <Text style={[styles.label, mine && styles.labelMine]} numberOfLines={1}>{rung.label}</Text>
                <Text style={styles.field} numberOfLines={1}>{rung.field}</Text>
              </View>
              {mine && <Ionicons name="checkmark-circle" size={15} color={colors.gold} />}
            </View>
          )
        })}
      </View>

      {!isChampion && myRank !== null && myRank > ELIGIBILITY_LADDER.length && (
        <Text style={styles.note}>
          Outside the top {ELIGIBILITY_LADDER.length}, you can still issue an open callout to any
          contender — it just does not put the belt on the line.
        </Text>
      )}
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 12.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  status: { color: colors.gold, fontSize: 10.5, fontWeight: '700', flexShrink: 1 },
  rungs: { paddingHorizontal: 8, paddingVertical: 6, gap: 2 },
  rung: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 38, paddingHorizontal: 4, borderRadius: radius.sm },
  rungMine: { backgroundColor: colors.gold + '14', paddingHorizontal: 6 },
  rank: { width: 16, textAlign: 'center', color: colors.textMuted, fontFamily: type.display, fontSize: 13, fontWeight: '900' },
  rankMine: { color: colors.gold },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.textSecondary, fontFamily: type.display, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  labelMine: { color: colors.text },
  field: { color: colors.textMuted, fontSize: 10 },
  note: { color: colors.textMuted, fontSize: 10.5, lineHeight: 15, paddingHorizontal: 12, paddingBottom: 11 },
})
