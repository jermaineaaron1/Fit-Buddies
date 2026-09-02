import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { useCircleStore } from '../../src/store/circleStore'
import { useBreakpoint } from '../../src/hooks/useBreakpoint'
import { PageContainer } from '../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../src/components/ui/AnimatedScreen'
import { ChampionStrip } from '../../src/components/ui/ChampionStrip'
import { ContenderRow } from '../../src/components/ui/ContenderRow'
import { CompactCard } from '../../src/components/ui/CompactCard'
import { CompactButton } from '../../src/components/ui/CompactButton'
import { SectionHeader } from '../../src/components/ui/SectionHeader'
import { StatItem } from '../../src/components/ui/StatItem'
import { Chip } from '../../src/components/ui/Chip'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { LoadingState } from '../../src/components/ui/LoadingState'
import { NoCircleBanner } from '../../src/components/ui/NoCircleBanner'
import { ChampionshipRules } from '../../src/components/belt/ChampionshipRules'
import { QualificationLadder } from '../../src/components/belt/QualificationLadder'
import { CrowningOverlay, type CrowningVariant } from '../../src/components/belt/CrowningOverlay'
import {
  loadBeltSnapshot, startTitleChallenge, parseWeights, totalWeight, daysRemaining,
  reignLength, CYCLE_LABEL, type BeltSnapshot,
} from '../../src/lib/belt'
import { ELIGIBILITY_LADDER } from '../../src/lib/callouts'
import { colors, type } from '../../src/constants/theme'

const ACK_KEY = 'belt:last_seen_resolution'

const ELIMINATION_COPY: Record<string, string> = {
  login_streak_broken: 'Streak broken',
  missed_weekly_sessions: 'Missed sessions',
}

export default function BeltScreen() {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()

  const [snapshot, setSnapshot] = useState<BeltSnapshot | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)
  // Rendered inline, not via Alert.alert — Alert's dialog and its callbacks are
  // both no-ops on web, so an RPC failure would otherwise be invisible.
  const [startError, setStartError] = useState<string | null>(null)
  const [crowning, setCrowning] = useState<{ variant: CrowningVariant; name: string } | null>(null)

  const load = useCallback(async () => {
    if (!circle?.id) return
    const next = await loadBeltSnapshot(circle.id)
    setSnapshot(next)

    // Fire the crowning moment once per resolution, acknowledged by challenge
    // id so a resolved title never replays on every visit.
    if (next.challenge?.status === 'resolved' && next.challenge.winner_user_id) {
      const seen = await AsyncStorage.getItem(ACK_KEY)
      if (seen !== next.challenge.id) {
        const winnerName = next.standings.find((standing) => standing.user_id === next.challenge!.winner_user_id)?.display_name
          ?? next.champion?.display_name ?? 'The champion'
        const variant: CrowningVariant =
          (next.championRecord?.total_reigns ?? 0) <= 1 && (next.championRecord?.total_defenses ?? 0) === 0
            ? 'crowned'
            : (next.championRecord?.current_streak_as_champion ?? 0) > 1
              ? 'defended'
              : 'dethroned'
        setCrowning({ variant, name: winnerName })
      }
    }
  }, [circle?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function dismissCrowning() {
    if (snapshot?.challenge?.id) await AsyncStorage.setItem(ACK_KEY, snapshot.challenge.id)
    setCrowning(null)
  }

  async function handleStart() {
    if (!circle?.id) return
    setStarting(true)
    setStartError(null)
    const { error } = await startTitleChallenge(circle.id)
    setStarting(false)
    if (error) { setStartError(error); return }
    load()
  }

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  const challenge = snapshot?.challenge ?? null
  const isLive = challenge?.status === 'active' || challenge?.status === 'extended'
  const weights = parseWeights(challenge?.weights_snapshot ?? snapshot?.belt?.category_weights)
  const maxPoints = totalWeight(weights) || 1
  const cycleLabel = CYCLE_LABEL[snapshot?.belt?.defense_cycle ?? 'weekly']
  const record = snapshot?.championRecord ?? null
  const championId = snapshot?.belt?.current_champion_id ?? null
  const isChampion = !!championId && championId === profile?.id

  // The champion is shown once, in the strip above. The ladder below numbers
  // the contenders from 1, so nobody appears twice on the same screen.
  const contenders = (snapshot?.standings ?? []).filter((standing) => standing.user_id !== championId)
  const live = contenders.filter((standing) => !standing.is_eliminated)
  const myRank = profile?.id
    ? (() => {
      const index = live.findIndex((standing) => standing.user_id === profile.id)
      return index === -1 ? null : index + 1
    })()
    : null

  if (!circle) {
    return <PageContainer><NoCircleBanner /></PageContainer>
  }

  const sections = {
    champion: (
      <AnimatedScreen>
        <View style={styles.section}>
          <ChampionStrip
            name={snapshot?.champion?.display_name ?? null}
            avatarUrl={snapshot?.champion?.avatar_url}
            status={
              snapshot?.champion
                ? reignLength(snapshot.belt?.reign_started_at ?? null)
                : 'Finish a title challenge to crown the first champion.'
            }
          />
          {snapshot?.champion && (
            <CompactCard style={styles.recordStrip}>
              <StatItem label="Reigns" value={String(record?.total_reigns ?? 0)} icon="trophy" tone="gold" style={styles.stat} />
              <View style={styles.divider} />
              <StatItem label="Defences" value={String(record?.total_defenses ?? 0)} icon="shield-checkmark" style={styles.stat} />
              <View style={styles.divider} />
              <StatItem label="Cycle streak" value={String(record?.current_streak_as_champion ?? 0)} icon="flame" style={styles.stat} />
              <View style={styles.divider} />
              <StatItem label="Cycle" value={cycleLabel} icon="calendar-outline" style={styles.stat} />
            </CompactCard>
          )}
        </View>
      </AnimatedScreen>
    ),

    status: (
      <AnimatedScreen delay={60}>
        {challenge ? (
          <CompactCard accent={isLive ? 'red' : 'gold'}>
            <View style={styles.statusHead}>
              <Ionicons name={isLive ? 'stopwatch' : 'checkmark-done'} size={15} color={isLive ? colors.primary : colors.gold} />
              <Text style={styles.statusTitle}>
                {challenge.status === 'extended' ? 'Tie — running on'
                  : challenge.status === 'resolved' ? 'Challenge resolved'
                  : 'Title challenge live'}
              </Text>
              {isLive && <Chip label={`${daysRemaining(challenge.ends_at)}d left`} tone="primary" icon="time-outline" />}
            </View>
            <Text style={styles.statusCopy}>
              {isLive
                ? `Scored on a ${cycleLabel.toLowerCase()} defence cycle. Points update after the nightly scoring run.`
                : 'Scores below are the final result of the last cycle.'}
            </Text>
            {!isLive && (
              <View style={styles.statusActions}>
                <CompactButton label="Start next challenge" tone="gold" icon="flag" onPress={handleStart} loading={starting} />
              </View>
            )}
            {startError && (
              <View style={styles.error} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{startError}</Text>
              </View>
            )}
          </CompactCard>
        ) : (
          <CompactCard accent="gold">
            <Text style={styles.vacantTitle}>No title challenge running</Text>
            <Text style={styles.statusCopy}>
              Open a challenge to crown your circle&apos;s first champion. Everyone is scored on
              consistency, training progression, and nutrition — against their own baseline.
            </Text>
            <View style={styles.statusActions}>
              <CompactButton label="Start title challenge" tone="gold" icon="flag" onPress={handleStart} loading={starting} />
            </View>
            {startError && (
              <View style={styles.error} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{startError}</Text>
              </View>
            )}
          </CompactCard>
        )}
      </AnimatedScreen>
    ),

    ladder: (
      <AnimatedScreen delay={90}>
        <View style={styles.section}>
          <SectionHeader title="Contender Ladder" meta={`${live.length} in contention`} />

          {snapshot?.error && (
            <View style={styles.error} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.errorText}>Could not load standings: {snapshot.error}</Text>
            </View>
          )}

          {!snapshot ? (
            <LoadingState rows={4} rowHeight={54} message="Loading standings" />
          ) : contenders.length ? (
            <View style={styles.rows}>
              {contenders.map((standing) => {
                const rank = live.findIndex((entry) => entry.id === standing.id) + 1
                const rung = ELIGIBILITY_LADDER.find((entry) => entry.rank === rank)
                return (
                  <ContenderRow
                    key={standing.id}
                    rank={standing.is_eliminated ? 0 : rank}
                    name={standing.display_name}
                    avatarUrl={standing.avatar_url}
                    // Eligibility is the subtitle, not the pill: the pill sits
                    // in the same row as the name and points, and a phrase like
                    // "Championship Elimination" there squeezes the name out.
                    subtitle={
                      standing.is_eliminated
                        ? `Out · ${ELIMINATION_COPY[standing.eliminated_reason ?? ''] ?? 'Requirements not met'}`
                        : rung
                          ? `Eligible · ${rung.label}`
                          : `${Math.round(Number(standing.total_points))} of ${maxPoints} possible`
                    }
                    points={Math.round(Number(standing.total_points))}
                    streakDays={null}
                    isSelf={standing.user_id === profile?.id}
                    eliminated={standing.is_eliminated}
                    badge={standing.is_eliminated ? undefined : rung ? 'Eligible' : undefined}
                  />
                )
              })}
            </View>
          ) : (
            <EmptyState
              icon="podium-outline"
              title="No scores yet"
              message="Standings appear after the nightly scoring run."
              compact
            />
          )}
        </View>
      </AnimatedScreen>
    ),

    qualification: (
      <AnimatedScreen delay={120}>
        <QualificationLadder myRank={myRank} isChampion={isChampion} />
      </AnimatedScreen>
    ),

    history: (
      <AnimatedScreen delay={150}>
        <View style={styles.section}>
          <SectionHeader title="Match History" />
          {snapshot?.history.length ? (
            <CompactCard padded={false} style={styles.historyCard}>
              {snapshot.history.map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <Ionicons name="ribbon-outline" size={14} color={colors.gold} />
                  <Text style={styles.historyName} numberOfLines={1}>
                    {entry.winnerName ?? 'No winner — title held'}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(entry.endedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              ))}
            </CompactCard>
          ) : (
            <EmptyState
              icon="time-outline"
              title="No completed cycles"
              message="The first result lands when this challenge resolves."
              compact
            />
          )}
        </View>
      </AnimatedScreen>
    ),

    rules: (
      <AnimatedScreen delay={180}>
        <ChampionshipRules weights={weights} cycleLabel={cycleLabel} />
      </AnimatedScreen>
    ),
  }

  return <>
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.main}>
            {sections.champion}
            {sections.status}
            {sections.ladder}
          </View>
          <View style={styles.side}>
            {sections.qualification}
            {sections.history}
            {sections.rules}
          </View>
        </View>
      ) : (
        <>
          {sections.champion}
          {sections.status}
          {sections.ladder}
          {sections.qualification}
          {sections.history}
          {sections.rules}
        </>
      )}
    </PageContainer>

    <CrowningOverlay
      visible={crowning !== null}
      variant={crowning?.variant ?? 'crowned'}
      championName={crowning?.name ?? ''}
      onDismiss={dismissCrowning}
    />
  </>
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  rows: { gap: 6 },
  recordStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  stat: { flex: 1 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  statusHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusTitle: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  statusCopy: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 5 },
  statusActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  vacantTitle: { color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase' },
  historyCard: { paddingHorizontal: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 40, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyName: { flex: 1, color: colors.text, fontSize: 12.5, fontWeight: '700' },
  historyDate: { color: colors.textMuted, fontSize: 10.5 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, marginTop: 9,
    borderRadius: 2, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  main: { flex: 1.9, gap: 20, minWidth: 0 },
  side: { flex: 1, gap: 12, minWidth: 260, maxWidth: 360 },
})
