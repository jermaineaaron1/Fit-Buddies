import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, type StyleProp, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { pickPhoto, type PhotoSource } from '../../lib/photoPicker'
import { AnimatedPressable } from './AnimatedPressable'
import { CompactButton } from './CompactButton'
import { IconButton } from './IconButton'

interface PhotoPickerProps {
  /** Currently attached image, if any. */
  uri?: string | null
  onPicked: (uri: string) => void
  onCleared?: () => void
  label?: string
  hint?: string
  busy?: boolean
  busyLabel?: string
  /** Squat preview for an inline row; tall for a review screen. */
  previewHeight?: number
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Take-or-choose control with its own preview and error line. Camera and
 * library are separate buttons rather than an action sheet, because
 * `Alert.alert`'s button callbacks are inert on web — an action sheet built on
 * one would simply do nothing there.
 */
export function PhotoPicker({
  uri, onPicked, onCleared, label = 'Add a photo', hint, busy = false, busyLabel = 'Working…',
  previewHeight = 150, disabled = false, style,
}: PhotoPickerProps) {
  const [error, setError] = useState<string | null>(null)

  async function capture(source: PhotoSource) {
    setError(null)
    const picked = await pickPhoto(source)
    if (!picked) return // cancelled
    if (picked.reason) { setError(picked.reason); return }
    if (picked.uri) onPicked(picked.uri)
  }

  return (
    <View style={[styles.wrap, style]}>
      {uri ? (
        <View style={[styles.previewBox, { height: previewHeight }]}>
          <Image source={{ uri }} style={styles.preview} contentFit="cover" accessibilityLabel="Selected photo" />
          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.gold} />
              <Text style={styles.busyText}>{busyLabel}</Text>
            </View>
          ) : onCleared ? (
            <IconButton
              icon="close"
              onPress={() => { setError(null); onCleared() }}
              accessibilityLabel="Remove photo"
              size="sm"
              style={styles.clear}
            />
          ) : null}
        </View>
      ) : (
        <AnimatedPressable
          style={styles.dropzone}
          onPress={() => capture('camera')}
          disabled={disabled || busy}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons name="camera-outline" size={22} color={colors.gold} />
          <Text style={styles.dropLabel}>{label}</Text>
          {hint ? <Text style={styles.dropHint}>{hint}</Text> : null}
        </AnimatedPressable>
      )}

      {!busy && (
        <View style={styles.actions}>
          <CompactButton
            label={uri ? 'Retake' : 'Take photo'}
            icon="camera-outline"
            size="sm"
            onPress={() => capture('camera')}
            disabled={disabled}
            style={styles.action}
          />
          <CompactButton
            label="From library"
            icon="images-outline"
            size="sm"
            onPress={() => capture('library')}
            disabled={disabled}
            style={styles.action}
          />
        </View>
      )}

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  dropzone: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 20, borderRadius: radius.sm,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.goldDark, backgroundColor: colors.card,
  },
  dropLabel: { color: colors.text, fontFamily: type.display, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  dropHint: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 16 },
  previewBox: {
    position: 'relative', borderRadius: radius.sm, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  preview: { width: '100%', height: '100%' },
  busyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000000B0' },
  busyText: { color: colors.gold, fontFamily: type.display, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  clear: { position: 'absolute', top: 6, right: 6 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
})
