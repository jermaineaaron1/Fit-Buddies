import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { useVideoPlayer, VideoView } from 'expo-video'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius } from '../../constants/theme'

interface ExerciseVideoSectionProps {
  exerciseName: string
  videoUrl: string | null
  posterUrl: string | null
}

// Native (iOS/Android): play wger's own video in-app when it has one; otherwise
// embed an in-app YouTube search so the user never leaves the app. wger's videos
// are large (30-50MB) and HEVC-encoded, so decode failures are expected on some
// devices — that degrades to the same embedded-search fallback, not a broken player.
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
        <VideoView
          player={player}
          style={styles.player}
          contentFit="contain"
          nativeControls
          allowsFullscreen
          onFirstFrameRender={() => player.play()}
        />
      </View>
    )
  }

  if (!videoUrl || videoFailed) {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise tutorial')}`
    return (
      <View style={styles.webviewWrap}>
        <WebView
          source={{ uri: searchUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        />
      </View>
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
  webviewWrap: { width: '100%', height: 340, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card },
  webview: { flex: 1, backgroundColor: colors.card },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
