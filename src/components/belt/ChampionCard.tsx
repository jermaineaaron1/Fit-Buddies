import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { ChampionshipBelt } from '../ui/ChampionshipBelt'
import { colors, radius, type } from '../../constants/theme'
import { reignLength } from '../../lib/belt'
import type { ChampionSummary } from '../../lib/belt'
import type { ChampionshipRecord } from '../../types/app'

interface ChampionCardProps {
  champion: ChampionSummary | null
  record: ChampionshipRecord | null
  reignStartedAt: string | null
}

export function ChampionCard({ champion, record, reignStartedAt }: ChampionCardProps) {
  if (!champion) {
    return (
      <View style={[styles.card, styles.vacant]}>
        <ChampionshipBelt size={64} animated={false} />
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>THE TITLE IS</Text>
          <Text style={styles.vacantTitle}>Vacant</Text>
          <Text style={styles.muted}>No one holds the belt yet. Finish a title challenge to crown the first champion.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.beltRow}>
        <ChampionshipBelt size={76} />
      </View>
      <View style={styles.identity}>
        {champion.avatar_url
          ? <Image source={{ uri: champion.avatar_url }} style={styles.avatar} contentFit="cover" />
          : <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{champion.display_name.charAt(0).toUpperCase()}</Text>
            </View>}
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>REIGNING CHAMPION</Text>
          <Text style={styles.name}>{champion.display_name}</Text>
          <Text style={styles.muted}>{reignLength(reignStartedAt)}</Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <Stat icon="trophy" label="Reigns" value={record?.total_reigns ?? 0} />
        <Stat icon="shield-checkmark" label="Defenses" value={record?.total_defenses ?? 0} />
        <Stat icon="flame" label="Cycle streak" value={record?.current_streak_as_champion ?? 0} />
      </View>
    </View>
  )
}

function Stat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon as any} size={15} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 14, padding: 16, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#1A1508',
  },
  vacant: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vacantTitle: { color: colors.text, fontFamily: type.display, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' },
  beltRow: { alignItems: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.gold },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardRaised },
  avatarText: { color: colors.gold, fontFamily: type.display, fontSize: 20, fontWeight: '900' },
  flex1: { flex: 1 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  name: { color: colors.text, fontFamily: type.display, fontSize: 26, fontWeight: '900', textTransform: 'uppercase' },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10,
    borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.goldDark,
  },
  statValue: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 },
})
