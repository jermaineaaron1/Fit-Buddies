import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { colors, radius, type } from '../../constants/theme'
import type { ChampionshipRecord } from '../../types/app'

// Permanent career record — never reset by a cycle. Renders nothing until the
// user has actually held the belt, so it doesn't clutter a new profile.
export function ChampionshipRecordCard({ userId }: { userId: string }) {
  const [record, setRecord] = useState<ChampionshipRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('championship_records').select('*').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setRecord((data as ChampionshipRecord | null) ?? null) })
    return () => { cancelled = true }
  }, [userId])

  if (!record || record.total_reigns === 0) return null

  const since = record.first_won_at
    ? new Date(record.first_won_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="trophy" size={16} color={colors.gold} />
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>CAREER RECORD</Text>
          <Text style={styles.title}>Championship History</Text>
        </View>
        {record.current_streak_as_champion > 0 && (
          <View style={styles.holdingPill}><Text style={styles.holdingText}>HOLDING</Text></View>
        )}
      </View>
      <View style={styles.grid}>
        <Cell value={record.total_reigns} label="Reigns" />
        <Cell value={record.total_defenses} label="Defenses" />
        <Cell value={record.longest_reign_cycles} label="Longest run" />
        <Cell value={record.current_streak_as_champion} label="Current run" />
      </View>
      {since && <Text style={styles.since}>First won {since}</Text>}
    </View>
  )
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 12, padding: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#1A1508',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  flex1: { flex: 1 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase' },
  holdingPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, backgroundColor: colors.primary },
  holdingText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  grid: { flexDirection: 'row', gap: 8 },
  cell: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10,
    borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  cellValue: { color: colors.text, fontFamily: type.display, fontSize: 21, fontWeight: '900' },
  cellLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 },
  since: { color: colors.textMuted, fontSize: 11 },
})
