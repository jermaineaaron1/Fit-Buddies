import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../src/hooks/useAuth'
import { colors } from '../src/constants/theme'

export default function RootLayout() {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    // Password recovery deliberately signs you in so you can set a new
    // password, so this screen must stay reachable while authenticated.
    // Redirecting away from it made the whole reset flow impossible.
    const onResetPassword = segments[1] === 'reset-password'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && profile && inAuthGroup && !onResetPassword) {
      router.replace('/(app)')
    } else if (session && !profile && !inAuthGroup) {
      // Profile not created yet — handled by onboarding
    }
  }, [session, profile, loading])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  )
}
