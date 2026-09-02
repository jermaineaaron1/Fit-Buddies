import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, ScrollView, Platform, Share } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import { colors, radius, type } from '../../../src/constants/theme'

function InviteFriendView({ circleId, circleName }: { circleId: string; circleName: string }) {
  const { profile } = useAuthStore()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadOrCreateCode() {
      const { data: existing } = await supabase
        .from('invite_codes')
        .select('code')
        .eq('circle_id', circleId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setInviteCode(existing.code)
        setLoading(false)
        return
      }

      if (!profile?.id) {
        setLoading(false)
        return
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data: created } = await supabase
        .from('invite_codes')
        .insert({ circle_id: circleId, code, created_by: profile.id, max_uses: 30, is_active: true })
        .select('code')
        .single()

      setInviteCode(created?.code ?? code)
      setLoading(false)
    }
    loadOrCreateCode()
  }, [circleId])

  async function handleShare() {
    if (!inviteCode) return
    try {
      await Share.share({
        message: `Join my Fit Buddies circle "${circleName}"! Use invite code ${inviteCode} to sign up.`,
      })
    } catch {
      // Share sheet dismissed or unavailable — nothing to do.
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="people" size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>Invite a Friend</Text>
      <Text style={styles.subtitle}>Share this code so a friend can join "{circleName}."</Text>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>INVITE CODE</Text>
        <Text style={styles.codeValue}>{loading ? '······' : inviteCode}</Text>
      </View>

      <Button label="Share Invite Code" onPress={handleShare} disabled={loading} />

      <View style={styles.helperCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.helperText}>Circles support up to 30 members. Anyone with this code can join.</Text>
      </View>
    </View>
  )
}

export default function JoinCircleScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle, fetchCircle } = useCircleStore()
  const [code, setCode] = useState('')
  const [circleName, setCircleName] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'join' | 'create'>('join')

  async function handleJoin() {
    if (!code.trim() || !profile?.id) return
    setLoading(true)

    const { data: invite, error } = await supabase
      .from('invite_codes')
      .select('*, circles(*)')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single()

    if (error || !invite) {
      setLoading(false)
      Alert.alert('Invalid code', 'That invite code does not exist or has expired.')
      return
    }

    if (invite.use_count >= invite.max_uses) {
      setLoading(false)
      Alert.alert('Code full', 'This circle is at capacity.')
      return
    }

    // Add member
    const { error: joinError } = await supabase.from('circle_members').insert({
      circle_id: invite.circle_id,
      user_id: profile.id,
      role: 'member',
    })

    if (joinError) {
      setLoading(false)
      if (joinError.code === '23505') {
        Alert.alert('Already a member', 'You are already in this circle.')
      } else {
        Alert.alert('Error', joinError.message)
      }
      return
    }

    // Increment use count
    await supabase
      .from('invite_codes')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id)

    await fetchCircle(profile.id)
    setLoading(false)
    router.replace('/(app)/circle')
  }

  async function handleCreate() {
    if (!circleName.trim() || !profile?.id) return
    setLoading(true)

    const { data: circle, error } = await supabase
      .from('circles')
      .insert({ name: circleName.trim(), owner_id: profile.id, max_members: 30, is_active: true })
      .select()
      .single()

    if (error || !circle) {
      setLoading(false)
      Alert.alert('Error', error?.message ?? 'Could not create circle.')
      return
    }

    await supabase.from('circle_members').insert({
      circle_id: circle.id,
      user_id: profile.id,
      role: 'owner',
    })

    // Generate first invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    await supabase.from('invite_codes').insert({
      circle_id: circle.id,
      code,
      created_by: profile.id,
      max_uses: 30,
      is_active: true,
    })

    await fetchCircle(profile.id)
    setLoading(false)
    router.replace('/(app)/circle')
  }

  if (circle) {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <InviteFriendView circleId={circle.id} circleName={circle.name} />
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Ionicons name="people" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>Join Your Circle</Text>
        <Text style={styles.subtitle}>This is a private app. You need an invite code to join a circle.</Text>

        <View style={styles.tabs}>
          <Button
            label="Join with Code"
            onPress={() => setMode('join')}
            variant={mode === 'join' ? 'primary' : 'secondary'}
            style={styles.tab}
          />
          <Button
            label="Create Circle"
            onPress={() => setMode('create')}
            variant={mode === 'create' ? 'primary' : 'secondary'}
            style={styles.tab}
          />
        </View>

        {mode === 'join' ? (
          <View style={styles.form}>
            <Input
              label="Invite Code"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="ABC123"
            />
            <Button label="Join Circle" onPress={handleJoin} loading={loading} />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Circle Name"
              value={circleName}
              onChangeText={setCircleName}
              placeholder="e.g. The Fit Squad"
              autoCapitalize="words"
            />
            <Button label="Create Circle" onPress={handleCreate} loading={loading} />
          </View>
        )}

        <View style={styles.helperCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.helperText}>
            {mode === 'join'
              ? 'Ask a friend who already has a circle to share their invite code with you.'
              : 'Circles support up to 30 members. You\'ll get a shareable invite code right after creating one.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 24, paddingTop: 14, paddingBottom: 96, gap: 20 },
  hero: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary + '40',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 4,
  },
  title: { color: colors.text, fontFamily: type.display, fontSize: 32, fontWeight: '900', letterSpacing: 0.2, textAlign: 'center', textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  tabs: { flexDirection: 'row', gap: 12, marginTop: 8 },
  tab: { flex: 1, paddingVertical: 10 },
  form: { gap: 16 },
  codeCard: {
    alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary + '40',
    paddingVertical: 20, marginVertical: 4,
  },
  codeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  codeValue: { color: colors.primary, fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  helperCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 4,
  },
  helperText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, flex: 1 },
})
