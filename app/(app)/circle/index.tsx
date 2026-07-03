import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Share } from 'react-native'
import { useRouter } from 'expo-router'
import { useCircleStore } from '../../../src/store/circleStore'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircle } from '../../../src/hooks/useCircle'
import { supabase } from '../../../src/lib/supabase'
import { Card } from '../../../src/components/ui/Card'
import { Button } from '../../../src/components/ui/Button'
import { LeaderboardRow } from '../../../src/components/leaderboard/LeaderboardRow'
import type { LeaderboardEntry, LeaderboardBadge } from '../../../src/types/app'

export default function CircleScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle, members } = useCircleStore()
  useCircle()

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (circle?.id) {
      fetchLeaderboard()
      fetchInviteCode()
    }
  }, [circle?.id])

  async function fetchLeaderboard() {
    if (!circle?.id) return

    const { data } = await supabase
      .from('circle_members')
      .select('user_id, profiles(display_name, avatar_url, weekly_xp, total_xp, current_streak, level)')
      .eq('circle_id', circle.id)

    if (!data) return

    const entries: LeaderboardEntry[] = data
      .map((m: any) => ({
        user_id: m.user_id,
        display_name: m.profiles?.display_name ?? 'Unknown',
        avatar_url: m.profiles?.avatar_url ?? null,
        weekly_xp: m.profiles?.weekly_xp ?? 0,
        total_xp: m.profiles?.total_xp ?? 0,
        current_streak: m.profiles?.current_streak ?? 0,
        level: m.profiles?.level ?? 1,
        rank: 0,
        badge: null,
      }))
      .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.weekly_xp - a.weekly_xp)
      .map((entry: LeaderboardEntry, i: number) => ({ ...entry, rank: i + 1 }))

    // Assign badges
    assignBadges(entries)
    setLeaderboard(entries)
  }

  function assignBadges(entries: LeaderboardEntry[]) {
    if (entries.length === 0) return
    const topStreak = [...entries].sort((a, b) => b.current_streak - a.current_streak)[0]
    if (topStreak) topStreak.badge = 'Streak Legend'
    if (entries[0]) entries[0].badge = entries[0].badge ?? 'Top Logger'

    // Comeback kid: lower rank but has a streak after a gap (simplified: rank > 3 but streak > 3)
    const comeback = entries.find((e, i) => i > 2 && e.current_streak >= 3)
    if (comeback && !comeback.badge) comeback.badge = 'Comeback Kid'
  }

  async function fetchInviteCode() {
    if (!circle?.id) return
    const { data } = await supabase
      .from('invite_codes')
      .select('code')
      .eq('circle_id', circle.id)
      .eq('is_active', true)
      .limit(1)
      .single()
    setInviteCode(data?.code ?? null)
  }

  async function generateInviteCode() {
    if (!circle?.id || !profile?.id) return
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data } = await supabase
      .from('invite_codes')
      .insert({ circle_id: circle.id, code, created_by: profile.id, max_uses: 30, is_active: true })
      .select('code')
      .single()
    setInviteCode(data?.code ?? null)
  }

  async function shareInviteCode() {
    if (!inviteCode) return
    await Share.share({
      message: `Join my Fit Buddies circle! Use code: ${inviteCode}\n\nDownload the app and enter this code when joining a circle.`,
    })
  }

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([fetchLeaderboard(), fetchInviteCode()])
    setRefreshing(false)
  }

  if (!circle) {
    return (
      <View style={styles.noCircle}>
        <Text style={styles.noCircleEmoji}>👥</Text>
        <Text style={styles.noCircleTitle}>No Circle Yet</Text>
        <Text style={styles.noCircleSubtitle}>Create a circle or join one with an invite code.</Text>
        <View style={styles.noCircleActions}>
          <Button label="Join Circle" onPress={() => router.push('/(app)/circle/join')} />
          <Button label="Create Circle" onPress={() => router.push('/(app)/circle/create')} variant="secondary" />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
    >
      {/* Circle Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.circleName}>{circle.name}</Text>
          <Text style={styles.memberCount}>{members.length} members</Text>
        </View>
        <TouchableOpacity style={styles.chatButton} onPress={() => router.push('/(app)/circle/chat')}>
          <Text style={styles.chatButtonText}>💬 Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Code */}
      <Card style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Circle Invite Code</Text>
        {inviteCode ? (
          <View style={styles.codeRow}>
            <Text style={styles.code}>{inviteCode}</Text>
            <Button label="Share" onPress={shareInviteCode} variant="ghost" style={styles.shareButton} />
          </View>
        ) : (
          <Button label="Generate Invite Code" onPress={generateInviteCode} variant="secondary" />
        )}
        <Text style={styles.inviteNote}>Private only. Share only with people you trust.</Text>
      </Card>

      {/* Weekly Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Leaderboard</Text>
        <Text style={styles.sectionSubtitle}>Resets every Monday</Text>
        {leaderboard.map((entry) => (
          <LeaderboardRow
            key={entry.user_id}
            entry={entry}
            isCurrentUser={entry.user_id === profile?.id}
          />
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  circleName: { color: '#F1F5F9', fontSize: 24, fontWeight: '800' },
  memberCount: { color: '#64748B', fontSize: 14, marginTop: 2 },
  chatButton: { backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  chatButtonText: { color: '#F1F5F9', fontSize: 14, fontWeight: '600' },
  inviteCard: { gap: 10 },
  inviteLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { color: '#6366F1', fontSize: 28, fontWeight: '800', letterSpacing: 4, flex: 1 },
  shareButton: { paddingVertical: 8, paddingHorizontal: 16 },
  inviteNote: { color: '#475569', fontSize: 12 },
  section: { gap: 8 },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { color: '#475569', fontSize: 13, marginBottom: 4 },
  noCircle: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  noCircleEmoji: { fontSize: 56 },
  noCircleTitle: { color: '#F1F5F9', fontSize: 24, fontWeight: '800' },
  noCircleSubtitle: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  noCircleActions: { gap: 12, width: '100%', marginTop: 8 },
})
