import * as Notifications from 'expo-notifications'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from './supabase'
import { getNotificationMessage } from '../constants/notifications'
import type { NotificationType } from '../types/app'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return
  // Remote push token registration was removed from Expo Go (SDK 53+) and logs a
  // loud console error if attempted — skip it there; local notifications below are
  // unaffected. Real push tokens only matter in a dev/production build anyway.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') return

    const tokenData = await Notifications.getExpoPushTokenAsync()
    const token = tokenData.data
    const platform = Platform.OS === 'ios' ? 'ios' : 'android'

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    )
  } catch {
    // Push token registration is non-critical — skip silently in dev
  }
}

export async function scheduleDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return
  await Notifications.cancelAllScheduledNotificationsAsync()

  const msg = getNotificationMessage('daily_reminder')
  await Notifications.scheduleNotificationAsync({
    content: { title: msg.title, body: msg.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  })

  const warning = getNotificationMessage('streak_warning')
  await Notifications.scheduleNotificationAsync({
    content: { title: warning.title, body: warning.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  })
}

export async function sendLocalNotification(type: NotificationType, data?: Record<string, string>): Promise<void> {
  if (Platform.OS === 'web') return
  const msg = getNotificationMessage(type)
  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body: msg.body,
      sound: true,
      data: data ?? {},
    },
    trigger: null,
  })
}
