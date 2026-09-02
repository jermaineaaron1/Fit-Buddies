import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import type { Database } from '../types/database'

// Replace these with your real values from supabase.com → Project Settings → API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'YOUR_ANON_KEY'

// Falling back to the placeholder produces a client that points at a domain
// which doesn't resolve, and every call then fails as an opaque "Network
// request failed" — which is exactly what an EAS build did, because .env is
// gitignored and therefore never uploaded. Say so plainly instead.
if (SUPABASE_URL.includes('YOUR_PROJECT') || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
  console.error(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
    'Locally they come from .env; in an EAS build they must be set as EAS environment ' +
    'variables (eas env:create), since .env is gitignored and never uploaded. ' +
    'Every network request will fail until this is fixed.',
  )
}

// SecureStore has a per-item size limit (~2048 bytes on Android) that a Supabase
// session (access + refresh token + user metadata) routinely exceeds. Split large
// values across numbered chunks so each individual write stays under the limit.
const CHUNK_SIZE = 1800

async function setChunkedItem(key: string, value: string) {
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE))
  }
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length))
  await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)))
}

async function getChunkedItem(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}_chunks`)
  if (!countStr) {
    // No chunk marker — either nothing stored yet, or a pre-chunking legacy value.
    return SecureStore.getItemAsync(key)
  }
  const count = parseInt(countStr, 10)
  const chunks = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`)))
  return chunks.join('')
}

async function removeChunkedItem(key: string) {
  const countStr = await SecureStore.getItemAsync(`${key}_chunks`)
  if (countStr) {
    const count = parseInt(countStr, 10)
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)))
    await SecureStore.deleteItemAsync(`${key}_chunks`)
  }
  await SecureStore.deleteItemAsync(key) // legacy cleanup
}

// expo-secure-store has no web implementation — fall back to AsyncStorage there
const ExpoSecureStoreAdapter = {
  getItem: getChunkedItem,
  setItem: setChunkedItem,
  removeItem: removeChunkedItem,
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})
