import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native'
import { useAuthStore } from '../../src/store/authStore'
import { useCircleStore } from '../../src/store/circleStore'
import { useXP } from '../../src/hooks/useXP'
import { useCircle } from '../../src/hooks/useCircle'
import { supabase } from '../../src/lib/supabase'
import { XPBar } from '../../src/components/xp/XPBar'
import { QuestCard } from '../../src/components/quest/QuestCard'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'
import type { DailyQuest, QuestCompletion } from '../../src/types/app'
import { useRouter } from 'expo-router'

export default function HomeScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { weeklyXP, totalXP, level, streak, earn } = useXP()
  useCircle()

  const [quests, setQuests] = useState<DailyQuest[]>([])
  const [completions, setCompletions] = useState<string[]>([]) // quest IDs completed today
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchQuests()
  }, [circle?.id])

  async function fetchQuests() {
    const { data } = await supabase.from('daily_quests').select('*').eq('is_active', true)
    setQuests(data ?? [])

    if (!profile?.id) return
    const today = new Date().toISOString().split('T')[0]
    const { data: done } = await supabase
      .from('quest_completions')
      .select('quest_id')
      .eq('user_id', profile.id)
      .eq('completed_date', today)

    setCompletions((done ?? []).map((d: Pick<QuestCompletion, 'quest_id'>) => d.quest_id))
  }

  async function handleCompleteQuest(quest: DailyQuest) {
    if (!profile?.id || !circle?.id) {
      Alert.alert('No circle', 'Join or create a circle first.')
      router.push('/(app)/circle/join')
      return
    }

    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('quest_completions').insert({
      user_id: profile.id,
      quest_id: quest.id,
      circle_id: circle.id,
      completed_date: today,
      xp_earned: quest.xp_reward,
    })

    if (error) {
      Alert.alert('Error', error.message)
      return
    }

    await earn('quest', quest.id, quest.title)
    setCompletions((prev) => [...prev, quest.id])
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchQuests()
    setRefreshing(false)
  }

  const completedCount = completions.length
  const totalQuests = quests.length

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getTimeOfDay()}, {profile?.display_name?.split(' ')[0] ?? 'Buddy'} 👋</Text>
          <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {streak}</Text>
          </View>
        )}
      </View>

      {/* XP Bar */}
      <Card>
        <XPBar totalXP={totalXP} level={level} weeklyXP={weeklyXP} />
      </Card>

      {/* Daily Quests */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Quests</Text>
          <Text style={styles.questCount}>{completedCount}/{totalQuests}</Text>
        </View>

        {!circle && (
          <Card style={styles.noCircleCard}>
            <Text style={styles.noCircleText}>You are not in a circle yet.</Text>
            <Button label="Join or Create a Circle" onPress={() => router.push('/(app)/circle/join')} style={styles.noCircleButton} />
          </Card>
        )}

        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            completed={completions.includes(quest.id)}
            onComplete={handleCompleteQuest}
          />
        ))}

        {quests.length === 0 && (
          <Text style={styles.emptyText}>No quests today. Check back soon.</Text>
        )}
      </View>
    </ScrollView>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: '#F1F5F9', fontSize: 22, fontWeight: '700' },
  date: { color: '#64748B', fontSize: 14, marginTop: 2 },
  streakBadge: { backgroundColor: '#7C3AED22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { color: '#A78BFA', fontSize: 16, fontWeight: '700' },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  questCount: { color: '#6366F1', fontSize: 15, fontWeight: '700' },
  noCircleCard: { alignItems: 'center', gap: 12 },
  noCircleText: { color: '#94A3B8', fontSize: 15, textAlign: 'center' },
  noCircleButton: { alignSelf: 'stretch' },
  emptyText: { color: '#475569', textAlign: 'center', paddingVertical: 20 },
})
