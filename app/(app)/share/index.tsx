import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

const SHARE_OPTIONS = [
  { label: 'Recipe', emoji: '🍳', description: 'Share a healthy recipe with your circle', route: '/(app)/share/recipe', xp: '+25 XP' },
  { label: 'Grocery Find', emoji: '🛒', description: 'Spotted something good at the store?', route: '/(app)/share/grocery', xp: '+10 XP' },
  { label: 'Supplement', emoji: '💊', description: 'Share a supplement you recommend', route: '/(app)/share/supplement', xp: '+10 XP' },
]

export default function ShareIndexScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Share</Text>
      <Text style={styles.subtitle}>Share healthy finds with your circle.</Text>

      {SHARE_OPTIONS.map((opt) => (
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
