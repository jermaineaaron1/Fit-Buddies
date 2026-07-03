import React from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useAuthStore } from '../../src/store/authStore'
import { useCircleStore } from '../../src/store/circleStore'
import { useXP } from '../../src/hooks/useXP'
import { XPBar } from '../../src/components/xp/XPBar'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'
import { getLevelLabel } from '../../src/constants/xp'

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore()
  const { circle } = useCircleStore()
  const { weeklyXP, totalXP, level, streak, recentEvents } = useXP()

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  if (!profile) return null

  const stats = [
    { label: 'Total XP', value: totalXP.toLocaleString(), emoji: '⚡' },
    { label: 'Weekly XP', value: weeklyXP.toLocaleString(), emoji: '📅' },
    { label: 'Current Streak', value: `${streak}d`, emoji: '🔥' },
    { label: 'Longest Streak', value: `${profile.longest_streak}d`, emoji: '🏆' },
    { label: 'Level', value: `${level} · ${getLevelLabel(level)}`, emoji: '🎖️' },
  ]

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.display_name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.displayName}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {circle && <Text style={styles.circleName}>📍 {circle.name}</Text>}
      </View>

      {/* XP Bar */}
      <Card>
        <XPBar totalXP={totalXP} level={level} weeklyXP={weeklyXP} />
      </Card>

      {/* Stats */}
      <Card style={styles.statsCard}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statRow}>
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </Card>

      {/* Recent XP Events */}
      {recentEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent XP</Text>
          {recentEvents.slice(0, 8).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventDescription}>{event.description ?? event.action_type}</Text>
              <Text style={styles.eventXP}>+{event.xp_amount} XP</Text>
            </View>
          ))}
        </View>
      )}

      <Button label="Sign Out" onPress={handleSignOut} variant="danger" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', gap: 8, paddingTop: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  displayName: { color: '#F1F5F9', fontSize: 24, fontWeight: '800' },
  username: { color: '#64748B', fontSize: 15 },
  circleName: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
  statsCard: { gap: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statEmoji: { fontSize: 20, width: 28 },
  statLabel: { color: '#94A3B8', fontSize: 14, flex: 1 },
  statValue: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  eventDescription: { color: '#94A3B8', fontSize: 14, flex: 1 },
  eventXP: { color: '#6366F1', fontSize: 14, fontWeight: '700' },
})
