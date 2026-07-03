import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import type { DailyQuest } from '../../types/app'

interface QuestCardProps {
  quest: DailyQuest
  completed: boolean
  onComplete: (quest: DailyQuest) => void
}

const QUEST_ICONS: Record<string, string> = {
  workout: '💪',
  meal: '🥗',
  steps: '👟',
  chat: '💬',
  share: '🌿',
  custom: '⭐',
}

export function QuestCard({ quest, completed, onComplete }: QuestCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, completed && styles.completed]}
      onPress={() => !completed && onComplete(quest)}
      disabled={completed}
      activeOpacity={0.75}
    >
      <Text style={styles.icon}>{QUEST_ICONS[quest.quest_type] ?? '⭐'}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, completed && styles.completedText]}>{quest.title}</Text>
        {quest.description && (
          <Text style={styles.description}>{quest.description}</Text>
        )}
      </View>
      <View style={[styles.xpBadge, completed && styles.xpBadgeCompleted]}>
        <Text style={styles.xpText}>{completed ? '✓' : `+${quest.xp_reward}`}</Text>
        {!completed && <Text style={styles.xpLabel}>XP</Text>}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  completed: {
    borderColor: '#10B981',
    opacity: 0.7,
  },
  icon: { fontSize: 24 },
  content: { flex: 1, gap: 2 },
  title: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  completedText: { color: '#64748B', textDecorationLine: 'line-through' },
  description: { color: '#64748B', fontSize: 13 },
  xpBadge: {
    backgroundColor: '#6366F122',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  xpBadgeCompleted: { backgroundColor: '#10B98122' },
  xpText: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
  xpLabel: { color: '#6366F1', fontSize: 10 },
})
