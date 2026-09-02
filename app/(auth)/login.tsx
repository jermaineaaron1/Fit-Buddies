import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { Link, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { supabase } from '../../src/lib/supabase'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import { colors, radius, type } from '../../src/constants/theme'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleLogin() {
    setAuthMessage(null)
    if (!email || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      const message = error.message.toLowerCase().includes('invalid login credentials')
        ? 'The email or password is incorrect. If this account was created with Google or another provider, password login will not work.'
        : error.message.toLowerCase().includes('email not confirmed')
          ? 'Your email has not been confirmed yet. Open the confirmation email from Fit Buddies, then try again.'
          : error.message
      setAuthMessage({ type: 'error', text: message })
      Alert.alert('Login failed', message)
    } else {
      router.replace('/(app)')
    }
  }

  async function handleForgotPassword() {
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setAuthMessage({ type: 'error', text: 'Enter your email first, then select Forgot password.' })
      return
    }
    setLoading(true)
    setAuthMessage(null)
    // On native this used to be undefined, so Supabase fell back to the
    // project's Site URL — still the default http://localhost:3000, which is a
    // dead page on a phone. Linking.createURL builds the right deep link for
    // the current binary (fitbuddies:// in a build, exp:// under Expo Go).
    const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : Linking.createURL('/reset-password')
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
    setLoading(false)
    if (error) setAuthMessage({ type: 'error', text: error.message })
    else setAuthMessage({ type: 'success', text: 'Password reset email sent. Check your inbox and spam folder.' })
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>FB</Text>
          </View>
          <Text style={styles.title}>Fit Buddies</Text>
          <Text style={styles.kicker}>FIT BUDDIES COMBAT CLUB</Text>
          <Text style={styles.subtitle}>Fight for your streak. Stand for your crew.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="your@email.com"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Your password"
          />
          {authMessage && <View style={[styles.messageBox, authMessage.type === 'error' ? styles.errorBox : styles.successBox]}><Text style={styles.messageText}>{authMessage.text}</Text></View>}
          <Button label="Log In" onPress={handleLogin} loading={loading} size="lg" style={styles.btn} />
          <TouchableOpacity onPress={handleForgotPassword} disabled={loading} accessibilityRole="button"><Text style={styles.forgot}>Forgot password?</Text></TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>No account yet? </Text>
          <Link href="/(auth)/signup" style={styles.link}>Sign up</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', width: '100%', maxWidth: 620, alignSelf: 'center', padding: 28, gap: 32 },
  header: { alignItems: 'center', gap: 12 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.gold, fontFamily: type.display, fontSize: 24, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 32, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 14 },
  kicker: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  form: { gap: 14, padding: 18, borderWidth: 1, borderLeftWidth: 5, borderLeftColor: colors.primary, borderColor: colors.border, backgroundColor: colors.card },
  btn: { marginTop: 6 },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  messageBox: { padding: 12, borderRadius: radius.sm, borderWidth: 1 },
  errorBox: { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
  successBox: { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.10)' },
  messageText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  forgot: { color: colors.textSecondary, fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
})
