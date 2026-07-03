import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

const LOG_OPTIONS = [
  { label: 'Workout', emoji: '💪', description: 'Log exercises, sets, reps, weight', route: '/(app)/log/workout', xp: '+50 XP' },
  { label: 'Meal', emoji: '🥗', description: 'Track food, calories, macros', route: '/(app)/log/meal', xp: '+15 XP' },
  { label: 'Steps', emoji: '👟', description: 'Enter your step count today', route: '/(app)/log/steps', xp: '+10–30 XP' },
]

export default function LogIndexScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Log Activity</Text>
      <Text style={styles.subtitle}>Every log earns XP and moves your progress bar.</Text>

      {LOG_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.label}
          style={styles.card}
          onPress={() => router.push(opt.route as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.emoji}>{opt.emoji}</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>{opt.label}</Text>
            <Text style={styles.cardDescription}>{opt.description}</Text>
          </View>
          <Text style={styles.xp}>{opt.xp}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 15, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 16,
  },
  emoji: { fontSize: 32 },
  cardContent: { flex: 1, gap: 4 },
  cardLabel: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  cardDescription: { color: '#64748B', fontSize: 14 },
  xp: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
})
