import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { supabase } from '../../../src/lib/supabase'
import { colors, radius, type } from '../../../src/constants/theme'
import { getCalloutFormatForRank } from '../../../src/lib/callouts'
import { VersusCard, type VersusParticipant } from '../../../src/components/ui/VersusCard'
import type { Callout } from '../../../src/types/app'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'


type CalloutListItem = Callout & {
  issuer_name: string
  participants: VersusParticipant[]
  spectator_count: number
}

export default function CalloutsIndexScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle, members } = useCircleStore()

  const [callouts, setCallouts] = useState<CalloutListItem[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!circle?.id || !profile?.id) return

    // Quick rank estimate (raw weekly XP) to preview what format issuing a callout would get.
    const { data: memberProfiles } = await supabase
      .from('circle_members')
      .select('user_id, profiles(weekly_xp)')
      .eq('circle_id', circle.id)
    if (memberProfiles) {
      const sorted = [...memberProfiles].sort((a: any, b: any) => (b.profiles?.weekly_xp ?? 0) - (a.profiles?.weekly_xp ?? 0))
      const idx = sorted.findIndex((m: any) => m.user_id === profile.id)
      setMyRank(idx === -1 ? null : idx + 1)
    }

    const { data: calloutRows } = await supabase
      .from('callouts')
      .select('*, issuer:profiles!callouts_issuer_id_fkey(display_name), callout_participants(user_id, profile:profiles(display_name)), callout_spectators(user_id)')
      .eq('circle_id', circle.id)
      .in('status', ['pending', 'active'])
      .order('start_time', { ascending: true })

    setCallouts(
      (calloutRows ?? []).map((c: any) => ({
        ...c,
        issuer_name: c.issuer?.display_name ?? 'Unknown',
        participants: (c.callout_participants ?? []).map((p: any) => ({
          user_id: p.user_id,
          display_name: p.profile?.display_name ?? 'Unknown',
        })),
        spectator_count: c.callout_spectators?.length ?? 0,
      }))
    )
  }, [circle?.id, profile?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  const myFormat = myRank !== null ? getCalloutFormatForRank(myRank) : null

  if (!circle) {
    return (
      <View style={styles.emptyScreen}>
        <Ionicons name="flash" size={40} color={colors.primary} />
        <Text style={styles.emptyTitle}>No Circle Yet</Text>
        <Text style={styles.emptySub}>Join a circle to issue and accept title callouts.</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kicker}>VERSUS · FRIENDLY FIRE</Text>
        <Text style={styles.title}>Book the Bout</Text>
        <Text style={styles.subtitle}>Challenge a buddy, chase your own baseline, and keep it friendly after the bell.</Text>
      </View>

      {myFormat && (
        <TouchableOpacity style={styles.issueBtn} onPress={() => router.push('/(app)/callouts/new' as any)} activeOpacity={0.85}>
          <View style={styles.issueIcon}>
            <Ionicons name="flash" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.issueTitle}>Issue a Callout</Text>
            <Text style={styles.issueSub}>Your rank #{myRank} qualifies you for a {myFormat.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}

      <FlatList
        data={callouts}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={callouts.length > 0 ? <Text style={styles.listHeader}>ACTIVE CALLOUTS</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.calloutCard} onPress={() => router.push(`/(app)/callouts/${item.id}` as any)} activeOpacity={0.85}>
            <View style={styles.calloutTop}>
              <View style={[styles.statusDot, item.status === 'active' && styles.statusDotActive]} />
              <Text style={styles.calloutFormat}>{formatLabel(item.format)}</Text>
              {item.status === 'active' && (
                <View style={styles.watchingPill}>
                  <Ionicons name="eye" size={11} color={colors.textSecondary} />
                  <Text style={styles.watchingText}>{item.spectator_count} watching</Text>
                </View>
              )}
            </View>
            <Text style={styles.calloutTitle}>{item.issuer_name}'s {item.activity_type} callout</Text>

            {item.participants.length > 0 && (
              <View style={styles.versusWrap}>
                <VersusCard participants={item.participants} />
              </View>
            )}

            {item.stakes && (
              <View style={styles.stakesPill}>
                <Ionicons name="flame" size={12} color={colors.crimson} />
                <Text style={styles.stakesText}>{item.stakes}</Text>
              </View>
            )}

            <View style={styles.calloutMeta}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={styles.calloutMetaText}>{new Date(item.start_time).toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No callouts yet. Issue the first one.</Text>
          </View>
        }
      />
    </View>
  )
}

function formatLabel(format: string) {
  const map: Record<string, string> = {
    '1v1': '1v1 CHAMPIONSHIP',
    triple_threat: 'TRIPLE THREAT',
    fatal_4way: 'FATAL 4-WAY',
    fatal_5way: 'FATAL 5-WAY',
    elimination: 'CHAMPIONSHIP ELIMINATION',
    open: 'OPEN CALLOUT',
  }
  return map[format] ?? format.toUpperCase()
}

const styles = StyleSheet.create({
  photoHero: { width: '100%', maxWidth: 1325, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24 },
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, gap: 4 },
  kicker: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 30, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 14 },

  issueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '100%', maxWidth: 1060, alignSelf: 'center', backgroundColor: colors.primaryGlow, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.borderLight, borderLeftWidth: 5, borderLeftColor: colors.gold,
    padding: 14, marginHorizontal: 20, marginTop: 16,
  },
  issueIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  issueTitle: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  issueSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  list: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  listHeader: { color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },

  calloutCard: {
    width: '100%', maxWidth: 820, backgroundColor: colors.card, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5, borderLeftColor: colors.primary, padding: 16, marginBottom: 10, gap: 8,
  },
  calloutTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textMuted },
  statusDotActive: { backgroundColor: colors.crimson },
  calloutFormat: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1, flex: 1 },
  watchingPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchingText: { color: colors.textSecondary, fontSize: 11 },
  calloutTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  versusWrap: { paddingVertical: 10 },
  stakesPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: colors.crimsonGlow, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  stakesText: { color: colors.crimson, fontSize: 11, fontWeight: '700' },
  calloutMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calloutMetaText: { color: colors.textMuted, fontSize: 12 },
  calloutMetaDot: { color: colors.textMuted, fontSize: 12 },

  empty: { paddingTop: 14, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  emptyScreen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  emptySub: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
})
