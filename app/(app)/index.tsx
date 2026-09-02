import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { useCircleStore } from '../../src/store/circleStore'
import { useUIStore } from '../../src/store/uiStore'
import { useBreakpoint } from '../../src/hooks/useBreakpoint'
import { PageContainer } from '../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../src/components/ui/AnimatedScreen'
import { ChampionStrip } from '../../src/components/ui/ChampionStrip'
import { ContenderRow } from '../../src/components/ui/ContenderRow'
import { ActivityRow } from '../../src/components/ui/ActivityRow'
import { SectionHeader } from '../../src/components/ui/SectionHeader'
import { CompactCard } from '../../src/components/ui/CompactCard'
import { CompactButton } from '../../src/components/ui/CompactButton'
import { Chip } from '../../src/components/ui/Chip'
import { EmptyState } from '../../src/components/ui/EmptyState'
import { LoadingState } from '../../src/components/ui/LoadingState'
import { WeekSummaryStrip } from '../../src/components/home/WeekSummaryStrip'
import { UpcomingMatchCard } from '../../src/components/home/UpcomingMatchCard'
import { loadCircleSnapshot, timeAgo, EMPTY_SNAPSHOT, type CircleSnapshot } from '../../src/lib/circleSnapshot'
import { colors, type } from '../../src/constants/theme'

const ACTIVITY_ICON: Record<string, { icon: 'barbell' | 'restaurant' | 'footsteps' | 'moon' | 'chatbubble' | 'flame' | 'ribbon' | 'sparkles'; tone: 'red' | 'gold' | 'blue' | 'steel'; verb: string }> = {
  workout: { icon: 'barbell', tone: 'red', verb: 'logged a workout' },
  meal: { icon: 'restaurant', tone: 'gold', verb: 'logged a meal' },
  steps: { icon: 'footsteps', tone: 'blue', verb: 'logged steps' },
  sleep: { icon: 'moon', tone: 'steel', verb: 'logged sleep' },
  chat: { icon: 'chatbubble', tone: 'steel', verb: 'spoke up in the corner' },
  quest: { icon: 'sparkles', tone: 'gold', verb: 'completed a quest' },
  streak_bonus: { icon: 'flame', tone: 'gold', verb: 'kept a streak alive' },
  comeback: { icon: 'ribbon', tone: 'red', verb: 'made a comeback' },
  recipe: { icon: 'restaurant', tone: 'gold', verb: 'shared a recipe' },
  grocery_post: { icon: 'restaurant', tone: 'gold', verb: 'shared a grocery find' },
  supplement_post: { icon: 'sparkles', tone: 'gold', verb: 'shared a supplement' },
}

export default function MainEventScreen() {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const openQuickLog = useUIStore((store) => store.openQuickLog)

  const [snapshot, setSnapshot] = useState<CircleSnapshot>(EMPTY_SNAPSHOT)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!circle?.id) { setLoading(false); return }
    const next = await loadCircleSnapshot(circle.id, profile?.id ?? null)
    setSnapshot(next)
    setLoading(false)
  }, [circle?.id, profile?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function shareCode() {
    if (!snapshot.inviteCode) return
    await Share.share({ message: `Join my Fit Buddies circle — Code: ${snapshot.inviteCode}` })
  }

  if (!circle) {
    return (
      <PageContainer>
        <CompactCard accent="red">
          <Text style={styles.emptyTitle}>No circle yet</Text>
          <Text style={styles.emptyCopy}>
            Fit Buddies is a private board for one small group. Join or create a circle to start
            competing on your own progress.
          </Text>
          <View style={styles.emptyActions}>
            <CompactButton label="Join a circle" tone="primary" icon="enter-outline" onPress={() => router.push('/(app)/circle/join' as never)} />
          </View>
        </CompactCard>
      </PageContainer>
    )
  }

  // The belt holder is shown once, in the strip. Everyone else is a numbered
  // contender starting at 1 — the champion never appears twice on one board.
  //
  // With no belt awarded yet there is no champion, so the strip shows the
  // vacant state and the whole circle is ranked. Promoting the week's leader
  // into that slot would call someone champion who has not won anything.
  const champion = snapshot.championId
    ? snapshot.stats.find((entry) => entry.user_id === snapshot.championId) ?? null
    : null
  const contenders = snapshot.stats
    .filter((entry) => entry.user_id !== champion?.user_id)
    .slice(0, 5)

  const sections = {
    champion: (
      <AnimatedScreen>
        <ChampionStrip
          name={champion?.display_name ?? null}
          avatarUrl={champion?.avatar_url}
          status={
            champion
              ? champion.user_id === profile?.id
                ? 'You hold the belt — defend it by beating your own baseline.'
                : 'Defending the title by beating their own baseline.'
              : 'Open a title challenge to crown one.'
          }
          points={champion?.weekly_xp ?? null}
          improvement={champion?.improvement_pct ?? null}
          onPress={() => router.push('/(app)/belt' as never)}
        />
      </AnimatedScreen>
    ),

    week: snapshot.myWeek ? (
      <AnimatedScreen delay={60}>
        <View style={styles.section}>
          <SectionHeader title="Your Week" meta={circle.name} />
          <WeekSummaryStrip summary={snapshot.myWeek} />
        </View>
      </AnimatedScreen>
    ) : null,

    logAction: (
      <AnimatedScreen delay={90}>
        <View style={styles.logRow}>
          <CompactButton label="Log Activity" icon="add" tone="primary" onPress={openQuickLog} style={styles.logButton} />
          {snapshot.inviteCode ? (
            <CompactButton label="Invite" icon="share-outline" onPress={shareCode} />
          ) : null}
        </View>
      </AnimatedScreen>
    ),

    standings: (
      <AnimatedScreen delay={120}>
        <View style={styles.section}>
          <SectionHeader
            title="Contenders"
            actionLabel={snapshot.stats.length > 6 ? 'View all' : undefined}
            onAction={snapshot.stats.length > 6 ? () => router.push('/(app)/belt' as never) : undefined}
          >
            <Chip label="Crew before ego" tone="gold" icon="shield-checkmark" />
          </SectionHeader>

          {loading ? (
            <LoadingState rows={4} rowHeight={54} />
          ) : contenders.length ? (
            <View style={styles.rows}>
              {contenders.map((entry, index) => (
                <ContenderRow
                  key={entry.user_id}
                  rank={index + 1}
                  name={entry.display_name}
                  avatarUrl={entry.avatar_url}
                  subtitle={`Lv. ${entry.level}${entry.badge ? ` · ${entry.badge}` : ''}`}
                  points={entry.weekly_xp}
                  improvement={entry.improvement_pct}
                  streakDays={entry.current_streak || null}
                  isSelf={entry.user_id === profile?.id}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="podium-outline"
              title="No contenders yet"
              message="Standings fill in as your circle logs activity."
              compact
            />
          )}
        </View>
      </AnimatedScreen>
    ),

    match: snapshot.upcomingMatch ? (
      <AnimatedScreen delay={150}>
        <UpcomingMatchCard
          match={snapshot.upcomingMatch}
          onPress={() => router.push(`/(app)/callouts/${snapshot.upcomingMatch!.id}` as never)}
        />
      </AnimatedScreen>
    ) : (
      <AnimatedScreen delay={150}>
        <EmptyState
          icon="flash-outline"
          title="No title match scheduled"
          message="Call someone out and put a date on it."
          actionLabel="Call out"
          onAction={() => router.push('/(app)/callouts/new' as never)}
          tone="red"
        />
      </AnimatedScreen>
    ),

    activity: (
      <AnimatedScreen delay={180}>
        <View style={styles.section}>
          <SectionHeader
            title="Recent Activity"
            actionLabel="Corner"
            onAction={() => router.push('/(app)/circle' as never)}
          />
          {loading ? (
            <LoadingState rows={3} rowHeight={48} />
          ) : snapshot.activity.length ? (
            <CompactCard padded={false} style={styles.feed}>
              {snapshot.activity.slice(0, 6).map((item) => {
                const meta = ACTIVITY_ICON[item.actionType] ?? { icon: 'sparkles' as const, tone: 'steel' as const, verb: item.actionType.replace(/_/g, ' ') }
                return (
                  <ActivityRow
                    key={item.id}
                    actorName={item.actorName === profile?.display_name ? 'You' : item.actorName}
                    actorAvatarUrl={item.avatarUrl}
                    action={meta.verb}
                    detail={item.description ?? undefined}
                    timeAgo={timeAgo(item.createdAt)}
                    icon={meta.icon}
                    tone={meta.tone}
                  />
                )
              })}
            </CompactCard>
          ) : (
            <EmptyState
              icon="pulse-outline"
              title="Quiet in here"
              message="Nothing logged in this circle yet. Be the first."
              compact
            />
          )}
        </View>
      </AnimatedScreen>
    ),
  }

  // Same elements either way — desktop splits them across a wide main column
  // and a narrow side column, phone stacks them in the order above.
  if (isDesktop) {
    return (
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.columns}>
          <View style={styles.main}>
            {sections.champion}
            {sections.week}
            {sections.standings}
            {sections.activity}
          </View>
          <View style={styles.side}>
            {sections.logAction}
            {sections.match}
          </View>
        </View>
      </PageContainer>
    )
  }

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {sections.champion}
      {sections.week}
      {sections.logAction}
      {sections.standings}
      {sections.match}
      {sections.activity}
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  rows: { gap: 6 },
  feed: { paddingHorizontal: 12, paddingVertical: 2 },
  logRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  logButton: { flex: 1 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  main: { flex: 1.9, gap: 20, minWidth: 0 },
  side: { flex: 1, gap: 12, minWidth: 260, maxWidth: 360 },
  emptyTitle: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  emptyCopy: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  emptyActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
})
