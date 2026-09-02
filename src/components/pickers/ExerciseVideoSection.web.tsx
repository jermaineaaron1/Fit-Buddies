import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius } from '../../constants/theme'

interface ExerciseVideoSectionProps {
  exerciseName: string
  videoUrl: string | null
  posterUrl: string | null
}

// Web counterpart of ExerciseVideoSection.tsx. react-native-webview doesn't support
// web at all (not a bug — unsupported platform per its own README), and YouTube
// blocks iframe embedding of its own search page anyway, so there's no in-app
// "embedded search" equivalent possible here. expo-video itself does support web,
// so wger's own video still plays inline when available; the fallback is a plain
// outbound link instead of a WebView.
export function ExerciseVideoSection({ exerciseName, videoUrl, posterUrl }: ExerciseVideoSectionProps) {
  const [playing, setPlaying] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    p.loop = false
  })

  useEffect(() => {
    const sub = player.addListener('statusChange', (payload: any) => {
      if (payload?.status === 'error') setVideoFailed(true)
    })
    return () => sub.remove()
  }, [player])

  const showNativeVideo = !!videoUrl && !videoFailed

  if (playing && showNativeVideo) {
    return (
      <View style={styles.playerWrap}>
        <VideoView player={player} style={styles.player} contentFit="contain" nativeControls onFirstFrameRender={() => player.play()} />
      </View>
    )
  }

  if (!videoUrl || videoFailed) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise tutorial')}`
    return (
      <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(searchUrl)} activeOpacity={0.8}>
        <Ionicons name="logo-youtube" size={20} color={colors.crimson} />
        <Text style={styles.linkText}>Search YouTube for a demo</Text>
        <Ionicons name="open-outline" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity style={styles.posterWrap} onPress={() => setPlaying(true)} activeOpacity={0.85}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.poster} contentFit="cover" />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]} />
      )}
      <View style={styles.playBadge}>
        <Ionicons name="play" size={22} color="#fff" />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  posterWrap: { width: '100%', height: 200, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card },
  poster: { width: '100%', height: '100%' },
  posterPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  playBadge: {
    position: 'absolute', top: '50%', left: '50%', marginTop: -26, marginLeft: -26,
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.crimson,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff2',
  },
  playerWrap: { width: '100%', height: 220, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  player: { width: '100%', height: '100%' },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  linkText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
})
