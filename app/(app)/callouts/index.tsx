import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { supabase } from '../../../src/lib/supabase'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { SectionHeader } from '../../../src/components/ui/SectionHeader'
import { Chip } from '../../../src/components/ui/Chip'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { LoadingState } from '../../../src/components/ui/LoadingState'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { VersusCard, type VersusParticipant } from '../../../src/components/ui/VersusCard'
import { getCalloutFormatForRank, getFormatInfo, type CalloutFormat } from '../../../src/lib/callouts'
import { loadContenderRanks } from '../../../src/lib/circleSnapshot'
import { colors, type } from '../../../src/constants/theme'
import type { Callout } from '../../../src/types/app'

type CalloutListItem = Callout & {
  issuer_name: string
  participants: VersusParticipant[]
  spectator_count: number
}

export default function VersusScreen() {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()

  const [callouts, setCallouts] = useState<CalloutListItem[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!circle?.id || !profile?.id) { setLoading(false); return }

    // Ranked by improvement against your own baseline, the same rule every
    // other board uses. This previously sorted on raw weekly XP, which decided
    // your title-match format by who logged most in absolute terms.
    const { ranks } = await loadContenderRanks(circle.id)
    setMyRank(ranks.get(profile.id) ?? null)

    const { data: calloutRows } = await supabase
      .from('callouts')
      .select('*, issuer:profiles!callouts_issuer_id_fkey(display_name), callout_participants(user_id, profile:profiles(display_name)), callout_spectators(user_id)')
      .eq('circle_id', circle.id)
      .in('status', ['pending', 'active'])
      .order('start_time', { ascending: true })

    setCallouts(
      (calloutRows ?? []).map((row: any) => ({
        ...row,
        issuer_name: row.issuer?.display_name ?? 'Unknown',
        participants: (row.callout_participants ?? []).map((participant: any) => ({
          user_id: participant.user_id,
          display_name: participant.profile?.display_name ?? 'Unknown',
        })),
        spectator_count: row.callout_spectators?.length ?? 0,
      })),
    )
    setLoading(false)
  }, [circle?.id, profile?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  if (!circle) {
    return <PageContainer><NoCircleBanner /></PageContainer>
  }

  const myFormat = myRank !== null ? getCalloutFormatForRank(myRank) : null

  const issueCard = (
    <AnimatedScreen>
      <CompactCard accent="red">
        <View style={styles.issueHead}>
          <View style={styles.issueCopy}>
            <Text style={styles.eyebrow}>ISSUE A CALLOUT</Text>
            <Text style={styles.issueTitle} numberOfLines={2}>
              {myFormat ? myFormat.label : 'Challenge a buddy'}
            </Text>
          </View>
          {myRank !== null && <Chip label={`No. ${myRank}`} tone="gold" />}
        </View>
        <Text style={styles.issueCopyText}>
          {myFormat
            ? myFormat.description
            : 'Standings decide which title match you qualify for. Log something to enter the ladder.'}
        </Text>
        <View style={styles.issueActions}>
          <CompactButton label="Call someone out" icon="flash" tone="primary" onPress={() => router.push('/(app)/callouts/new' as never)} />
        </View>
      </CompactCard>
    </AnimatedScreen>
  )

  const list = (
    <View style={styles.section}>
      <SectionHeader title="Active Callouts" meta={callouts.length ? `${callouts.length}` : undefined} />
      {loading ? (
        <LoadingState rows={2} rowHeight={92} />
      ) : callouts.length ? (
        <View style={styles.rows}>
          {callouts.map((callout, index) => {
            const live = callout.status === 'active'
            const info = getFormatInfo(callout.format as CalloutFormat)
            return (
              <AnimatedScreen key={callout.id} delay={Math.min(index * 40, 160)}>
                <CompactCard
                  accent={live ? 'red' : 'steel'}
                  onPress={() => router.push(`/(app)/callouts/${callout.id}` as never)}
                  accessibilityLabel={`${info.label}, ${callout.issuer_name}'s ${callout.activity_type} callout`}
                >
                  <View style={styles.calloutHead}>
                    <Chip
                      label={info.label}
                      tone={live ? 'primary' : 'neutral'}
                      icon={live ? 'radio' : 'time-outline'}
                    />
                    {live && callout.spectator_count > 0 && (
                      <View style={styles.watching}>
                        <Ionicons name="eye" size={11} color={colors.textMuted} />
                        <Text style={styles.watchingText}>{callout.spectator_count}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.calloutTitle} numberOfLines={2}>
                    {callout.issuer_name}&apos;s {callout.activity_type} callout
                  </Text>

                  {callout.participants.length > 0 && (
                    <View style={styles.versusWrap}>
                      <VersusCard participants={callout.participants} />
                    </View>
                  )}

                  <View style={styles.calloutMeta}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.calloutMetaText} numberOfLines={1}>
                      {new Date(callout.start_time).toLocaleString(undefined, {
                        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                      })}
                    </Text>
                    {callout.stakes ? (
                      <>
                        <Ionicons name="flame" size={12} color={colors.crimson} />
                        <Text style={styles.stakesText} numberOfLines={1}>{callout.stakes}</Text>
                      </>
                    ) : null}
                  </View>
                </CompactCard>
              </AnimatedScreen>
            )
          })}
        </View>
      ) : (
        <EmptyState
          icon="flash-outline"
          title="No callouts running"
          message="Challenge a buddy and put a date on it."
          actionLabel="Call out"
          onAction={() => router.push('/(app)/callouts/new' as never)}
          tone="red"
        />
      )}
    </View>
  )

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.main}>{list}</View>
          <View style={styles.side}>{issueCard}</View>
        </View>
      ) : (
        <>{issueCard}{list}</>
      )}
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  rows: { gap: 10 },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  issueHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  issueCopy: { flex: 1, minWidth: 0, gap: 2 },
  issueTitle: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  issueCopyText: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 16, marginTop: 6, marginBottom: 10 },
  issueActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calloutHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  watching: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  watchingText: { color: colors.textMuted, fontSize: 10.5 },
  calloutTitle: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 7 },
  versusWrap: { marginTop: 9 },
  calloutMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, flexWrap: 'wrap' },
  calloutMetaText: { color: colors.textSecondary, fontSize: 11, flexShrink: 1 },
  stakesText: { color: colors.crimson, fontSize: 11, flexShrink: 1 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  main: { flex: 1.9, gap: 20, minWidth: 0 },
  side: { flex: 1, gap: 12, minWidth: 260, maxWidth: 360 },
})
