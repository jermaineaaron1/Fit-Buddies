import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { colors, radius, type } from '../../src/constants/theme'
import { BodyMetricsFields, emptyBodyMetrics, validateBodyMetrics } from '../../src/components/profile/BodyMetricsFields'

export default function SignupScreen() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bodyMetrics, setBodyMetrics] = useState(emptyBodyMetrics)
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
    const metrics = validateBodyMetrics(bodyMetrics)
    if (!metrics.payload) {
      Alert.alert('Check your measurements', metrics.error)
      return
    }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
    if (error || !data.user) {
      setLoading(false)
      Alert.alert('Sign up failed', error?.message ?? 'Unknown error')
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username: username.trim().toLowerCase(),
      display_name: displayName.trim(),
      total_xp: 0,
      weekly_xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
      ...metrics.payload,
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
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>FB</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Invite-only · No public profiles</Text>
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
          <View style={styles.measurementHeader}>
            <Text style={styles.measurementEyebrow}>YOUR TALE OF THE TAPE</Text>
            <Text style={styles.measurementTitle}>Starting Measurements</Text>
            <Text style={styles.measurementSub}>Private to you. Used to personalize progress and show your preferred units.</Text>
          </View>
          <BodyMetricsFields value={bodyMetrics} onChange={setBodyMetrics} />
          <Button label="Create Account" onPress={handleSignup} loading={loading} size="lg" style={styles.btn} />
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
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center', padding: 28, paddingTop: 64, paddingBottom: 44, gap: 36 },
  header: { alignItems: 'center', gap: 12 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontFamily: type.display, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 32, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  form: { gap: 14 },
  measurementHeader: { marginTop: 12, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  measurementEyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  measurementTitle: { color: colors.text, fontFamily: type.display, fontSize: 23, fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
  measurementSub: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  btn: { marginTop: 6 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
})
