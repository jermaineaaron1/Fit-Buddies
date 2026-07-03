import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useAuthStore } from '../../src/store/authStore'
import { MOTIVATIONAL_MESSAGES } from '../../src/constants/quests'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'

export default function MotivateScreen() {
  const { profile } = useAuthStore()
  const [dailyMessage, setDailyMessage] = useState('')
  const [showHardDay, setShowHardDay] = useState(false)
  const [hardDayMessage, setHardDayMessage] = useState('')

  useEffect(() => {
    // Pick daily message based on day of year so it's consistent per day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const messages = MOTIVATIONAL_MESSAGES.daily
    setDailyMessage(messages[dayOfYear % messages.length])
  }, [])

  function handleHardDay() {
    const msgs = MOTIVATIONAL_MESSAGES.hard_day
    setHardDayMessage(msgs[Math.floor(Math.random() * msgs.length)])
    setShowHardDay(true)
  }

  const isComeback = profile?.current_streak === 0 && profile?.longest_streak > 0

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Motivational Corner 🔥</Text>

      {/* Daily Message */}
      <Card style={styles.dailyCard}>
        <Text style={styles.dailyLabel}>Today's Message</Text>
        <Text style={styles.dailyMessage}>"{dailyMessage}"</Text>
      </Card>

      {/* Streak / Comeback */}
      {profile && (
        <Card style={styles.streakCard}>
          {profile.current_streak > 0 ? (
            <>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakNumber}>{profile.current_streak} day streak</Text>
              <Text style={styles.streakSub}>
                {profile.current_streak >= 7
                  ? 'One week strong. Your crew sees it.'
                  : 'Keep it going. Consistency is the win.'}
              </Text>
            </>
          ) : isComeback ? (
            <>
              <Text style={styles.streakEmoji}>⚡</Text>
              <Text style={styles.streakNumber}>Comeback mode</Text>
              <Text style={styles.streakSub}>Your best streak was {profile.longest_streak} days. Today is day 1 again.</Text>
            </>
          ) : (
            <>
              <Text style={styles.streakEmoji}>💪</Text>
              <Text style={styles.streakNumber}>Start your streak</Text>
              <Text style={styles.streakSub}>Log one action today to begin.</Text>
            </>
          )}
        </Card>
      )}

      {/* Hard Day Button */}
      <View style={styles.hardDaySection}>
        <Text style={styles.hardDayLabel}>Having a hard day?</Text>
        <Button label="I need a push" onPress={handleHardDay} variant="secondary" />
      </View>

      {showHardDay && (
        <Card style={styles.hardDayCard}>
          <Text style={styles.hardDayMessage}>"{hardDayMessage}"</Text>
          <TouchableOpacity onPress={handleHardDay} style={styles.another}>
            <Text style={styles.anotherText}>Give me another one</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Encouragement prompts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Encouragement Prompts</Text>
        {MOTIVATIONAL_MESSAGES.encouragement.map((msg, i) => (
          <View key={i} style={styles.promptRow}>
            <Text style={styles.promptDot}>·</Text>
            <Text style={styles.promptText}>{msg}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 20, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 28, fontWeight: '800' },
  dailyCard: { gap: 10 },
  dailyLabel: { color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  dailyMessage: { color: '#F1F5F9', fontSize: 20, fontWeight: '600', lineHeight: 30 },
  streakCard: { alignItems: 'center', gap: 8 },
  streakEmoji: { fontSize: 40 },
  streakNumber: { color: '#F1F5F9', fontSize: 22, fontWeight: '800' },
  streakSub: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  hardDaySection: { gap: 12 },
  hardDayLabel: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  hardDayCard: { gap: 12 },
  hardDayMessage: { color: '#F1F5F9', fontSize: 18, fontWeight: '600', lineHeight: 28 },
  another: { alignSelf: 'flex-start' },
  anotherText: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
  section: { gap: 12 },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  promptRow: { flexDirection: 'row', gap: 10 },
  promptDot: { color: '#6366F1', fontSize: 20, lineHeight: 22 },
  promptText: { color: '#94A3B8', fontSize: 15, lineHeight: 22, flex: 1 },
})
