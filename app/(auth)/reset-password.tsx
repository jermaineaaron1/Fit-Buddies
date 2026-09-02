import React, { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { Input } from '../../src/components/ui/Input'
import { Button } from '../../src/components/ui/Button'
import { colors, radius, type } from '../../src/constants/theme'
import { supabase } from '../../src/lib/supabase'

export default function ResetPasswordScreen() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  // On web, supabase-js reads the recovery token out of the URL by itself. On
  // native there is no URL for it to read, so until we've exchanged the deep
  // link for a session there is nothing to update and the save would fail.
  const [ready, setReady] = useState(Platform.OS === 'web')
  const incomingUrl = Linking.useURL()

  useEffect(() => {
    if (Platform.OS === 'web' || !incomingUrl) return
    let cancelled = false

    async function establishSession(url: string) {
      // Supabase sends either an implicit-flow fragment (#access_token=...)
      // or a PKCE query param (?code=...), depending on project settings.
      const [, fragment] = url.split('#')
      const query = url.includes('?') ? url.split('?')[1].split('#')[0] : ''

      const fragmentParams = new URLSearchParams(fragment ?? '')
      const accessToken = fragmentParams.get('access_token')
      const refreshToken = fragmentParams.get('refresh_token')
      const code = new URLSearchParams(query).get('code')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (!cancelled) { if (error) setMessage(error.message); else setReady(true) }
        return
      }
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!cancelled) { if (error) setMessage(error.message); else setReady(true) }
        return
      }
      // Already signed in (e.g. changing password from inside the app) is fine.
      const { data } = await supabase.auth.getSession()
      if (!cancelled && data.session) setReady(true)
    }

    establishSession(incomingUrl)
    return () => { cancelled = true }
  }, [incomingUrl])

  async function updatePassword() {
    setMessage('')
    if (!ready) return setMessage('This reset link is invalid or has expired. Request a new one.')
    if (password.length < 8) return setMessage('Use at least 8 characters for your new password.')
    if (password !== confirmPassword) return setMessage('The passwords do not match.')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setMessage(error.message)
    // Alert.alert's button callbacks never fire on web, so navigating from
    // inside one would leave the password updated but the user stuck here.
    router.replace('/(app)')
  }

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.badge}><Text style={styles.badgeText}>FB</Text></View>
      <View><Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text><Text style={styles.title}>Set New Password</Text><Text style={styles.subtitle}>Choose a new password for your Fit Buddies account.</Text></View>
      <Input label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Input label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      {!!message && <View style={styles.error}><Text style={styles.errorText}>{message}</Text></View>}
      <Button label="Update Password" onPress={updatePassword} loading={loading} size="lg" />
    </ScrollView>
  </KeyboardAvoidingView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, container: { flexGrow: 1, justifyContent: 'center', padding: 28, gap: 18, maxWidth: 680, width: '100%', alignSelf: 'center' },
  badge: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#fff', fontFamily: type.display, fontSize: 22, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, title: { color: colors.text, fontFamily: type.display, fontSize: 30, fontWeight: '900', textTransform: 'uppercase', marginTop: 4 }, subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 7 },
  error: { padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryGlow }, errorText: { color: colors.text, fontSize: 13 },
})
