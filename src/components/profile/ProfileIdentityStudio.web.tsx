import React, { useRef, useState } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../ui/Card'
import { colors, radius, type } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

export function ProfileIdentityStudio() {
  const { profile, setProfile } = useAuthStore()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  // Alert.alert is inert on web, so failures reported through it were silent
  // on the one platform this variant serves.
  const [error, setError] = useState<string | null>(null)
  if (!profile) return null
  const shownUrl = profile.avatar_source === 'ai' ? profile.ai_avatar_url ?? profile.avatar_url : profile.avatar_url

  async function upload(file?: File) {
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) return setError('Choose a JPG, PNG or WebP image.')
    if (file.size > 5 * 1024 * 1024) return setError('That image is over 5 MB. Choose a smaller one.')
    setUploading(true)
    setError(null)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${profile.id}/profile-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setUploading(false); return setError(`Upload failed: ${uploadError.message}`) }
    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
    const { data, error: saveError } = await supabase.from('profiles').update({ avatar_url: publicData.publicUrl, avatar_source: 'photo' }).eq('id', profile.id).select('*').single()
    setUploading(false)
    if (saveError || !data) return setError(`Could not save your photo: ${saveError?.message ?? 'please try again.'}`)
    setProfile(data)
  }

  async function chooseSource(source: 'photo' | 'ai') {
    if (!profile) return
    if (source === 'ai' && !profile.ai_avatar_url) return setError('No AI avatar yet. Upload a photo first — generation runs server-side so your keys never reach the app.')
    const { data, error: switchError } = await supabase.from('profiles').update({ avatar_source: source }).eq('id', profile.id).select('*').single()
    if (switchError || !data) return setError(`Could not switch identity: ${switchError?.message ?? 'please try again.'}`)
    setProfile(data)
  }

  return <Card style={styles.card}>
    <View style={styles.header}><View style={styles.titleRow}><Ionicons name="camera-outline" size={20} color={colors.primary} /><View style={styles.titleCopy}><Text style={styles.title} numberOfLines={1}>Broadcast Identity</Text><Text style={styles.subtitle} numberOfLines={2}>Visible to your circle and used on versus screens</Text></View></View><View style={styles.live}><Text style={styles.liveText}>PUBLIC</Text></View></View>
    <View style={styles.content}>
      <View style={styles.portrait}>{shownUrl ? <Image source={{ uri: shownUrl }} style={styles.image} resizeMode="cover" /> : <Text style={styles.initial}>{profile.display_name.charAt(0).toUpperCase()}</Text>}<View style={styles.onAir}><Text style={styles.onAirText}>ON AIR</Text></View></View>
      <View style={styles.controls}><Text style={styles.name}>{profile.display_name}</Text><Text style={styles.handle}>@{profile.username}</Text><View style={styles.sourceRow}><TouchableOpacity style={[styles.source, profile.avatar_source === 'photo' && styles.sourceActive]} onPress={() => chooseSource('photo')}><Ionicons name="camera" size={16} color={profile.avatar_source === 'photo' ? colors.text : colors.textMuted} /><Text style={styles.sourceText}>Real photo</Text></TouchableOpacity><TouchableOpacity style={[styles.source, profile.avatar_source === 'ai' && styles.sourceActive]} onPress={() => chooseSource('ai')}><Ionicons name="sparkles" size={16} color={profile.avatar_source === 'ai' ? colors.text : colors.textMuted} /><Text style={styles.sourceText}>AI fighter avatar</Text></TouchableOpacity></View><TouchableOpacity style={styles.upload} onPress={() => inputRef.current?.click()} disabled={uploading}><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={styles.uploadText}>{uploading ? 'Uploading…' : profile.avatar_url ? 'Replace photo' : 'Upload profile photo'}</Text></TouchableOpacity><Text style={styles.consent}>By uploading, you confirm that the photo is yours or you have permission to use it. Your selected identity is visible to fellow circle members.</Text></View>
    </View>
    {error ? <View style={styles.error}><Ionicons name="alert-circle" size={14} color={colors.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
    {React.createElement('input', { ref: inputRef, type: 'file', accept: 'image/jpeg,image/png,image/webp', style: { display: 'none' }, onChange: (event: React.ChangeEvent<HTMLInputElement>) => upload(event.target.files?.[0]) })}
  </Card>
}

const styles = StyleSheet.create({
  card: { gap: 16 }, error: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow }, errorText: { flex: 1, color: colors.text, fontSize: 12 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, titleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 }, titleCopy: { flex: 1, minWidth: 0 }, title: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' }, subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, live: { flexShrink: 0, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.full, backgroundColor: colors.primary }, liveText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: .7 },
  content: { flexDirection: 'row', gap: 18, alignItems: 'center' }, portrait: { width: 148, height: 174, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }, image: { width: '100%', height: '100%' }, initial: { color: colors.text, fontFamily: type.display, fontSize: 56, fontWeight: '900' }, onAir: { position: 'absolute', left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.primary }, onAirText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  controls: { flex: 1, gap: 8 }, name: { color: colors.text, fontFamily: type.display, fontSize: 24, fontWeight: '900', textTransform: 'uppercase' }, handle: { color: colors.textMuted, fontSize: 12 }, sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, source: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, sourceActive: { borderColor: colors.primary, backgroundColor: colors.primaryGlow }, sourceText: { color: colors.text, fontSize: 12, fontWeight: '700' }, upload: { minHeight: 46, alignSelf: 'flex-start', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, backgroundColor: colors.primary }, uploadText: { color: '#fff', fontFamily: type.display, fontWeight: '900', textTransform: 'uppercase' }, consent: { color: colors.textMuted, fontSize: 10, lineHeight: 15, maxWidth: 520 },
})
