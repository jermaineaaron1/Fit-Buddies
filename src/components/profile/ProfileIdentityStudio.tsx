import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { CompactCard } from '../ui/CompactCard'
import { CompactButton } from '../ui/CompactButton'
import { Chip } from '../ui/Chip'
import { SegmentedControl } from '../ui/SegmentedControl'
import { colors, radius, type } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { pickPhoto, readPhotoBytes, photoContentType, type PhotoSource } from '../../lib/photoPicker'

const MAX_BYTES = 5 * 1024 * 1024

const SOURCES = [
  { value: 'photo' as const, label: 'Real photo' },
  { value: 'ai' as const, label: 'AI avatar' },
]

/**
 * Setting a profile photo, on the platform people actually use.
 *
 * This was a stub telling phone users the feature "is currently available in
 * the desktop app" — on a fitness app used at the gym, which meant nobody
 * could set an avatar and every roster and standings row fell back to an
 * initial. The upload path is the same one the meal and equipment scanners
 * already use on native, so there was nothing genuinely blocking it.
 *
 * Errors render inline rather than through Alert.alert, whose buttons and
 * dialog are both inert on web — the web variant of this component still
 * reports upload failures that way and is therefore silent when they happen.
 */
export function ProfileIdentityStudio() {
  const { profile, setProfile } = useAuthStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!profile) return null

  const shownUrl = profile.avatar_source === 'ai'
    ? profile.ai_avatar_url ?? profile.avatar_url
    : profile.avatar_url

  async function upload(source: PhotoSource) {
    if (!profile) return
    setError(null)

    const picked = await pickPhoto(source)
    if (!picked) return // cancelled
    if (picked.reason) { setError(picked.reason); return }
    if (!picked.uri) return

    setBusy(true)
    let bytes: ArrayBuffer
    try {
      bytes = await readPhotoBytes(picked.uri)
    } catch (readError) {
      setBusy(false)
      setError(`Could not read that photo: ${String(readError)}`)
      return
    }

    if (bytes.byteLength > MAX_BYTES) {
      setBusy(false)
      setError('That image is over 5 MB. Try a smaller one.')
      return
    }

    const { contentType, extension } = photoContentType(picked.uri)
    const path = `${profile.id}/profile-${Date.now()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(path, bytes, { contentType, upsert: false })
    if (uploadError) {
      setBusy(false)
      setError(`Upload failed: ${uploadError.message}`)
      return
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
    const { data, error: saveError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicData.publicUrl, avatar_source: 'photo' })
      .eq('id', profile.id).select('*').single()

    setBusy(false)
    if (saveError || !data) {
      setError(`Could not save your photo: ${saveError?.message ?? 'please try again.'}`)
      return
    }
    setProfile(data)
  }

  async function chooseSource(next: 'photo' | 'ai') {
    if (!profile || next === profile.avatar_source) return
    setError(null)
    if (next === 'ai' && !profile.ai_avatar_url) {
      setError('No AI avatar yet. Upload a photo first — generation runs server-side so your keys never reach the app.')
      return
    }
    const { data, error: saveError } = await supabase
      .from('profiles').update({ avatar_source: next }).eq('id', profile.id).select('*').single()
    if (saveError || !data) {
      setError(`Could not switch identity: ${saveError?.message ?? 'please try again.'}`)
      return
    }
    setProfile(data)
  }

  return (
    <CompactCard accent="red">
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>BROADCAST IDENTITY</Text>
          <Text style={styles.title} numberOfLines={1}>{profile.display_name}</Text>
        </View>
        <Chip label="Public" tone="primary" icon="eye-outline" />
      </View>

      <View style={styles.body}>
        <View style={styles.portrait}>
          {shownUrl
            ? <Image source={{ uri: shownUrl }} style={styles.image} contentFit="cover" />
            : <Text style={styles.initial}>{profile.display_name.charAt(0).toUpperCase()}</Text>}
        </View>

        <View style={styles.controls}>
          <Text style={styles.handle}>@{profile.username}</Text>
          <SegmentedControl
            segments={SOURCES}
            value={profile.avatar_source}
            onChange={chooseSource}
            disabled={busy}
            accessibilityLabel="Which likeness your circle sees"
          />
          <View style={styles.actions}>
            <CompactButton
              label={busy ? 'Uploading…' : 'Take photo'}
              icon="camera-outline"
              size="sm"
              loading={busy}
              onPress={() => upload('camera')}
              style={styles.action}
            />
            <CompactButton
              label="Choose"
              icon="images-outline"
              size="sm"
              disabled={busy}
              onPress={() => upload('library')}
              style={styles.action}
            />
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.consent}>
        By uploading you confirm the photo is yours or you have permission to use it. Your circle can see it.
      </Text>
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  body: { flexDirection: 'row', gap: 12, marginTop: 11 },
  portrait: {
    width: 76, height: 92, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface,
  },
  image: { width: '100%', height: '100%' },
  initial: { color: colors.text, fontFamily: type.display, fontSize: 34, fontWeight: '900' },
  controls: { flex: 1, minWidth: 0, gap: 8 },
  handle: { color: colors.textMuted, fontSize: 11.5 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, marginTop: 10,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
  consent: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 10 },
})
