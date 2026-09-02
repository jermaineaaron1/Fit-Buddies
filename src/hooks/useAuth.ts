import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { registerPushToken, scheduleDailyReminder } from '../lib/notifications'

export function useAuth() {
  const { session, user, profile, loading, setSession, fetchProfile, signOut } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
        registerPushToken(session.user.id)
        scheduleDailyReminder()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUserId = useAuthStore.getState().user?.id
      setSession(session)
      if (session?.user && session.user.id !== currentUserId) {
        fetchProfile(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, user, profile, loading, signOut }
}
