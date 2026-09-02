import React, { useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCircleStore } from '../../../src/store/circleStore'
import { useAuthStore } from '../../../src/store/authStore'
import { useXP } from '../../../src/hooks/useXP'
import { supabase } from '../../../src/lib/supabase'
import { colors, radius, type } from '../../../src/constants/theme'
import { Button } from '../../../src/components/ui/Button'
import { ProgressBar } from '../../../src/components/ui/ProgressBar'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import type { DailyQuest, QuestCompletion } from '../../../src/types/app'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'


const QUEST_ICONS: Record<string, string> = {
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

export default function CircleScreen() {
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { profile } = useAuthStore()
  const { circle, members } = useCircleStore()
  const { earn } = useXP()

  const [quests, setQuests] = useState<DailyQuest[]>([])
  const [completions, setCompletions] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(useCallback(() => { loadQuests() }, [profile?.id, circle?.id]))

  async function loadQuests() {
    const { data } = await supabase.from('daily_quests').select('*').eq('is_active', true)
    setQuests(data ?? [])
    if (!profile?.id) return
    const today = new Date().toISOString().split('T')[0]
    const { data: done } = await supabase
      .from('quest_completions').select('quest_id')
      .eq('user_id', profile.id).eq('completed_date', today)
    setCompletions((done ?? []).map((d: Pick<QuestCompletion, 'quest_id'>) => d.quest_id))
  }

  async function onRefresh() { setRefreshing(true); await loadQuests(); setRefreshing(false) }

  const completedCount = completions.length
  const totalCount = quests.length
  const pct = totalCount > 0 ? completedCount / totalCount : 0

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>YOUR CORNER · CREW BEFORE EGO</Text><Text style={styles.title}>Strong Alone. Unbreakable Together.</Text></View>
        {circle && (
          <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/(app)/circle/chat' as any)}>
            <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
            <Text style={styles.chatBtnText}>Locker Room</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* No circle state */}
      {!circle && (
        <View style={styles.noCircleCard}>
          <Ionicons name="people-outline" size={32} color={colors.primary} />
          <View style={styles.noCircleText}>
            <Text style={styles.noCircleTitle}>You're not in a circle</Text>
            <Text style={styles.noCircleSub}>Join one to see your fellow contenders.</Text>
          </View>
          <Button label="Join / Create" onPress={() => router.push('/(app)/circle/join' as any)} size="sm" />
        </View>
      )}

      <View style={[styles.combatGrid, width >= 900 && styles.combatGridDesktop]}>
      {/* Roster */}
      {circle && members.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Roster</Text>
            <Text style={styles.sectionSub}>{members.length} contenders</Text>
          </View>
          <View style={styles.roster}>
            {members.map(m => (
              <View key={m.user_id} style={styles.rosterCard}>
                <View style={[styles.rosterAvatar, m.user_id === profile?.id && styles.rosterAvatarMe]}>
                  <Text style={styles.rosterAvatarText}>{(m.profile?.display_name ?? '?').charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.rosterName} numberOfLines={1}>
                  {m.profile?.display_name ?? 'Unknown'}{m.user_id === profile?.id ? ' (you)' : ''}
                </Text>
                <Text style={styles.rosterMeta}>Lv.{m.profile?.level ?? 1}</Text>
                {(m.profile?.current_streak ?? 0) > 0 && (
                  <View style={styles.rosterStreak}>
                    <Ionicons name="flame" size={10} color={colors.warning} />
                    <Text style={styles.rosterStreakText}>{m.profile?.current_streak}d</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Daily Quests */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Four Ways to Advance</Text>
          <Text style={styles.sectionSub}>{completedCount}/{totalCount} done</Text>
        </View>

        {/* Progress bar */}
        <ProgressBar progress={pct} color={colors.accent} trackColor={colors.border} height={4} />

        <View style={styles.questList}>
          {quests.map(quest => {
            const done = completions.includes(quest.id)
            const route = QUEST_ROUTES[quest.quest_type]
            return (
              <AnimatedPressable
                key={quest.id}
                style={[styles.questCard, done && styles.questDone]}
                onPress={() => !done && route && router.push(route as any)}
                disabled={done}
              >
                <View style={[styles.questIcon, done && styles.questIconDone]}>
                  <Ionicons
                    name={(done ? 'checkmark' : (QUEST_ICONS[quest.quest_type] ?? 'star-outline')) as any}
                    size={18}
                    color={done ? colors.accent : colors.primary}
                  />
                </View>
                <View style={styles.questBody}>
                  <Text style={[styles.questTitle, done && styles.questTitleDone]}>{quest.title}</Text>
                  {!done && <Text style={styles.questCta}>{getCTA(quest.quest_type)}</Text>}
                  {done && <Text style={styles.questDoneLabel}>Completed today</Text>}
                </View>
                {!done && (
                  <View style={styles.xpPill}>
                    <Text style={styles.xpPillText}>+{quest.xp_reward} XP</Text>
                  </View>
                )}
              </AnimatedPressable>
            )
          })}
        </View>
      </View>
      </View>

      {/* Circle actions */}
      {circle && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.actionList}>
            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(app)/circle/join' as any)}>
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              <Text style={styles.actionLabel}>Invite a Friend</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(app)/circle/chat' as any)}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
              <Text style={styles.actionLabel}>Locker Room</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function getCTA(type: string) {
  const map: Record<string, string> = {
    workout: 'Tap to log a workout →',
    meal: 'Tap to log a meal →',
    steps: 'Tap to log steps →',
    chat: 'Tap to send a message →',
    share: 'Tap to share something →',
  }
  return map[type] ?? 'Tap to complete →'
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32, gap: 24 },

  header: { display: 'none', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 3 },
  title: { maxWidth: 700, color: colors.text, fontFamily: type.display, fontSize: 30, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryGlow, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary + '40',
  },
  chatBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  noCircleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  noCircleText: { flex: 1 },
  noCircleTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  noCircleSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  roster: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rosterCard: {
    width: '31%', alignItems: 'center', gap: 4,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 6,
  },
  rosterAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  rosterAvatarMe: { backgroundColor: colors.primary },
  rosterAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rosterName: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  rosterMeta: { color: colors.textMuted, fontSize: 10 },
  rosterStreak: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  rosterStreakText: { color: colors.warning, fontSize: 10, fontWeight: '700' },

  combatGrid: { gap: 16 },
  combatGridDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  section: { flex: 1, gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '700', textTransform: 'uppercase' },
  sectionSub: { color: colors.textMuted, fontSize: 13 },


  questList: { gap: 8 },
  questCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5, borderLeftColor: colors.primary, padding: 14,
  },
  questDone: { opacity: 0.6, borderColor: colors.accent + '40' },
  questIcon: {
    width: 38, height: 38, borderRadius: radius.sm,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  questIconDone: { backgroundColor: colors.accentGlow },
  questBody: { flex: 1 },
  questTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  questTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  questCta: { color: colors.primary, fontSize: 11, marginTop: 2 },
  questDoneLabel: { color: colors.accent, fontSize: 11, marginTop: 2 },
  xpPill: {
    backgroundColor: colors.accentGlow, borderRadius: radius.sm,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  xpPillText: { color: colors.gold, fontSize: 12, fontWeight: '700' },

  actionList: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  actionLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' },
})
