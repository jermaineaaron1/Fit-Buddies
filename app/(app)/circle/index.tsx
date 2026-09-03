import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, Share } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCircleStore } from '../../../src/store/circleStore'
import { useAuthStore } from '../../../src/store/authStore'
import { supabase } from '../../../src/lib/supabase'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { SectionHeader } from '../../../src/components/ui/SectionHeader'
import { Chip } from '../../../src/components/ui/Chip'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { LoadingState } from '../../../src/components/ui/LoadingState'
import { ProgressBar } from '../../../src/components/ui/ProgressBar'
import { colors, layout, radius, type } from '../../../src/constants/theme'
import type { DailyQuest, QuestCompletion } from '../../../src/types/app'

const QUEST_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  workout: 'barbell-outline',
  meal: 'nutrition-outline',
  steps: 'footsteps-outline',
  chat: 'chatbubble-outline',
  share: 'leaf-outline',
}

const QUEST_ROUTES: Record<string, string> = {
  workout: '/(app)/log/workout',
  meal: '/(app)/log/meal',
  steps: '/(app)/log/steps',
  chat: '/(app)/circle/chat',
  share: '/(app)/share',
}

const QUEST_CTA: Record<string, string> = {
  workout: 'Log a workout',
  meal: 'Log a meal',
  steps: 'Log your steps',
  chat: 'Say something',
  share: 'Share something',
}

export default function YourCornerScreen() {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle, members } = useCircleStore()

  const [quests, setQuests] = useState<DailyQuest[]>([])
  const [completions, setCompletions] = useState<string[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [{ data: questRows }, invite] = await Promise.all([
      supabase.from('daily_quests').select('*').eq('is_active', true),
      circle?.id
        ? supabase.from('invite_codes').select('code').eq('circle_id', circle.id).eq('is_active', true).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setQuests(questRows ?? [])
    setInviteCode((invite?.data as { code?: string } | null)?.code ?? null)

    if (profile?.id) {
      const today = new Date().toISOString().split('T')[0]
      const { data: done } = await supabase
        .from('quest_completions').select('quest_id')
        .eq('user_id', profile.id).eq('completed_date', today)
      setCompletions((done ?? []).map((row: Pick<QuestCompletion, 'quest_id'>) => row.quest_id))
    }
    setLoading(false)
  }, [profile?.id, circle?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  async function shareCode() {
    if (!inviteCode) return
    await Share.share({ message: `Join my Fit Buddies circle — Code: ${inviteCode}` })
  }

  if (!circle) {
    return (
      <PageContainer>
        <CompactCard accent="red">
          <Text style={styles.emptyTitle}>You are not in a circle</Text>
          <Text style={styles.emptyCopy}>
            Fit Buddies only works with people you know. Join or create one to see your corner.
          </Text>
          <View style={styles.emptyActions}>
            <CompactButton label="Join or create" tone="primary" icon="enter-outline" onPress={() => router.push('/(app)/circle/join' as never)} />
          </View>
        </CompactCard>
      </PageContainer>
    )
  }

  const done = completions.length
  const total = quests.length

  const questSection = (
    <AnimatedScreen delay={40}>
      <View style={styles.section}>
        <SectionHeader title="Today's Quests" meta={total ? `${done} of ${total}` : undefined} />
        {loading ? (
          <LoadingState rows={3} rowHeight={54} />
        ) : quests.length ? (
          <>
            <ProgressBar progress={total ? done / total : 0} color={colors.gold} trackColor={colors.surface} height={4} />
            <View style={styles.rows}>
              {quests.map((quest) => {
                const complete = completions.includes(quest.id)
                const route = QUEST_ROUTES[quest.quest_type]
                return (
                  <AnimatedPressable
                    key={quest.id}
                    style={[styles.questRow, complete && styles.questRowDone]}
                    onPress={() => { if (!complete && route) router.push(route as never) }}
                    disabled={complete || !route}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: complete, checked: complete }}
                    accessibilityLabel={`${quest.title}. ${complete ? 'Completed today' : `${quest.xp_reward} XP`}`}
                  >
                    <View style={[styles.questIcon, complete && styles.questIconDone]}>
                      <Ionicons
                        name={complete ? 'checkmark' : QUEST_ICONS[quest.quest_type] ?? 'star-outline'}
                        size={16}
                        color={complete ? colors.cornerBlue : colors.primary}
                      />
                    </View>
                    <View style={styles.questCopy}>
                      <Text style={[styles.questTitle, complete && styles.questTitleDone]} numberOfLines={1}>
                        {quest.title}
                      </Text>
                      <Text style={styles.questMeta} numberOfLines={1}>
                        {complete ? 'Completed today' : QUEST_CTA[quest.quest_type] ?? 'Tap to complete'}
                      </Text>
                    </View>
                    {complete
                      ? <Ionicons name="checkmark-circle" size={17} color={colors.cornerBlue} />
                      : <Chip label={`+${quest.xp_reward}`} tone="gold" />}
                  </AnimatedPressable>
                )
              })}
            </View>
          </>
        ) : (
          <EmptyState icon="sparkles-outline" title="No quests today" message="They refresh each morning." compact />
        )}
      </View>
    </AnimatedScreen>
  )

  const rosterSection = (
    <AnimatedScreen delay={70}>
      <View style={styles.section}>
        <SectionHeader
          title="Roster"
          meta={`${members.length} ${members.length === 1 ? 'contender' : 'contenders'}`}
        />
        {members.length ? (
          // Dense rows rather than a grid of profile tiles: a roster is read as
          // a list of people, and tiles fitted three across at the cost of the
          // avatar, the streak and any name longer than one word.
          <CompactCard padded={false} style={styles.rosterCard}>
            {members.map((member) => {
              const memberProfile = member.profile
              const avatarUrl = memberProfile?.avatar_source === 'ai'
                ? memberProfile?.ai_avatar_url ?? memberProfile?.avatar_url ?? null
                : memberProfile?.avatar_url ?? null
              const isSelf = member.user_id === profile?.id
              const streak = memberProfile?.current_streak ?? 0
              return (
                <View key={member.user_id} style={styles.rosterRow}>
                  <View style={[styles.avatar, isSelf && styles.avatarSelf]}>
                    {avatarUrl
                      ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                      : <Text style={styles.avatarText}>{(memberProfile?.display_name ?? '?').charAt(0).toUpperCase()}</Text>}
                  </View>
                  <View style={styles.rosterCopy}>
                    <Text style={styles.rosterName} numberOfLines={1}>
                      {memberProfile?.display_name ?? 'Unknown'}{isSelf ? ' (you)' : ''}
                    </Text>
                    <Text style={styles.rosterMeta} numberOfLines={1}>
                      Lv. {memberProfile?.level ?? 1}
                      {member.role !== 'member' ? ` · ${member.role}` : ''}
                    </Text>
                  </View>
                  {streak > 0 && (
                    <View style={styles.streak}>
                      <Ionicons name="flame" size={12} color={colors.gold} />
                      <Text style={styles.streakText}>{streak}d</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </CompactCard>
        ) : (
          <EmptyState icon="people-outline" title="Just you so far" message="Invite someone to make it a circle." actionLabel={inviteCode ? 'Invite' : undefined} onAction={inviteCode ? shareCode : undefined} compact />
        )}
      </View>
    </AnimatedScreen>
  )

  const cornerCard = (
    <AnimatedScreen>
      <CompactCard accent="gold">
        <View style={styles.cornerHead}>
          <View style={styles.cornerCopy}>
            <Text style={styles.eyebrow}>YOUR CORNER</Text>
            <Text style={styles.cornerName} numberOfLines={2}>{circle.name}</Text>
          </View>
          {inviteCode ? <Chip label={inviteCode} tone="gold" icon="key-outline" /> : null}
        </View>
        <Text style={styles.cornerCopyText}>
          Crew before ego. Everyone here is scored against their own baseline, not each other&apos;s.
        </Text>
        <View style={styles.cornerActions}>
          <CompactButton label="Locker Room" icon="chatbubbles-outline" tone="primary" onPress={() => router.push('/(app)/circle/chat' as never)} />
          {inviteCode ? <CompactButton label="Invite" icon="share-outline" onPress={shareCode} /> : null}
          <CompactButton label="Join another" icon="enter-outline" onPress={() => router.push('/(app)/circle/join' as never)} />
        </View>
      </CompactCard>
    </AnimatedScreen>
  )

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {cornerCard}
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.column}>{questSection}</View>
          <View style={styles.column}>{rosterSection}</View>
        </View>
      ) : (
        <>{questSection}{rosterSection}</>
      )}
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  rows: { gap: 6 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  cornerHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cornerCopy: { flex: 1, minWidth: 0, gap: 2 },
  cornerName: { color: colors.text, fontFamily: type.display, fontSize: 21, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  cornerCopyText: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 16, marginTop: 6, marginBottom: 10 },
  cornerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  questRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: layout.touch + 8, paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: colors.card,
  },
  questRowDone: { opacity: 0.6, borderLeftColor: colors.cornerBlue },
  questIcon: {
    width: 32, height: 32, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  questIconDone: { borderColor: colors.cornerBlue + '55' },
  questCopy: { flex: 1, minWidth: 0, gap: 1 },
  questTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  questTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  questMeta: { color: colors.textMuted, fontSize: 10.5 },

  rosterCard: { paddingHorizontal: 11 },
  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: layout.touch + 4, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  avatarSelf: { borderColor: colors.primary, borderWidth: 1.5 },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 14, fontWeight: '900' },
  rosterCopy: { flex: 1, minWidth: 0, gap: 1 },
  rosterName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  rosterMeta: { color: colors.textMuted, fontSize: 10.5, textTransform: 'capitalize' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  streakText: { color: colors.gold, fontSize: 11, fontWeight: '800' },

  emptyTitle: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase' },
  emptyCopy: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  emptyActions: { flexDirection: 'row', gap: 8, marginTop: 12 },

  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  column: { flex: 1, gap: 20, minWidth: 0 },
})
