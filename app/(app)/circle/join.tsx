import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'

export default function JoinCircleScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { fetchCircle } = useCircleStore()
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

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
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
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1, padding: 24, gap: 24, justifyContent: 'center' },
  title: { color: '#F1F5F9', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 15, lineHeight: 22 },
  tabs: { flexDirection: 'row', gap: 12 },
  tab: { flex: 1, paddingVertical: 10 },
  form: { gap: 16 },
})
