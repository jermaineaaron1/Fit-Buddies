import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'

export default function SignupScreen() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    if (!displayName || !username || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.')
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error || !data.user) {
      setLoading(false)
      Alert.alert('Sign up failed', error?.message ?? 'Unknown error')
      return
    }

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.trim().toLowerCase(),
      display_name: displayName.trim(),
      total_xp: 0,
      weekly_xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
    })

    setLoading(false)

    if (profileError) {
      Alert.alert('Profile error', profileError.message)
      return
    }

    router.replace('/(app)')
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>💪</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Invite-only. No public profiles.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="How your crew sees you"
            autoCapitalize="words"
          />
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="fitjermaine"
            autoCapitalize="none"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="your@email.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Min. 6 characters"
          />
          <Button label="Create Account" onPress={handleSignup} loading={loading} style={styles.button} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>Log in</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 40 },
  header: { alignItems: 'center', gap: 8 },
  logo: { fontSize: 56 },
  title: { color: '#F1F5F9', fontSize: 32, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 15 },
  form: { gap: 16 },
  button: { marginTop: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: '#64748B', fontSize: 15 },
  link: { color: '#6366F1', fontSize: 15, fontWeight: '700' },
})
