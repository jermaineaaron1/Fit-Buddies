import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { IconButton } from '../ui/IconButton'
import { formatDuration } from '../../lib/workoutFormat'

interface RestTimerProps {
  /** Target rest in seconds. Null hides the timer entirely. */
  seconds: number | null
  onChangeSeconds: (seconds: number) => void
}

const PRESETS = [60, 90, 120, 180]

/**
 * Counts down between sets. Deliberately a plain elapsed-time display with a
 * progress rule rather than a ring — a ring needs either SVG or a stack of
 * rotated masks, and neither is available here.
 */
export function RestTimer({ seconds, onChangeSeconds }: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds ?? 90)
  const [running, setRunning] = useState(false)
  const target = seconds ?? 90
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(0)

  useEffect(() => { if (!running) setRemaining(target) }, [target, running])

  useEffect(() => {
    if (!running) {
      if (interval.current) { clearInterval(interval.current); interval.current = null }
      return
    }
    interval.current = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) { setRunning(false); return 0 }
        return value - 1
      })
    }, 1000)
    return () => { if (interval.current) clearInterval(interval.current) }
  }, [running])

  useEffect(() => {
    const fraction = target > 0 ? 1 - remaining / target : 0
    progress.value = reduceMotion ? fraction : withTiming(fraction, { duration: 300, easing: Easing.linear })
  }, [remaining, target, reduceMotion])

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.min(100, Math.max(0, progress.value * 100))}%` }))
  const done = running === false && remaining === 0

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      <View style={styles.row}>
        <Ionicons name="stopwatch-outline" size={15} color={done ? colors.cornerBlue : colors.textSecondary} />
        <Text style={styles.label}>Rest</Text>
        <Text style={[styles.clock, done && styles.clockDone]}>
          {done ? 'Ready' : formatDuration(remaining)}
        </Text>

        <IconButton
          icon={running ? 'pause' : 'play'}
          size="sm"
          tone={running ? 'gold' : 'primary'}
          onPress={() => { if (remaining === 0) setRemaining(target); setRunning((value) => !value) }}
          accessibilityLabel={running ? 'Pause rest timer' : 'Start rest timer'}
        />
        <IconButton
          icon="refresh"
          size="sm"
          onPress={() => { setRunning(false); setRemaining(target) }}
          accessibilityLabel="Reset rest timer"
        />
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, done && styles.fillDone, fillStyle]} />
      </View>

      <View style={styles.presets}>
        {PRESETS.map((preset) => (
          <AnimatedPressable
            key={preset}
            onPress={() => { setRunning(false); onChangeSeconds(preset) }}
            accessibilityRole="radio"
            accessibilityState={{ selected: target === preset }}
            accessibilityLabel={`Rest ${preset} seconds`}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={[styles.preset, target === preset && styles.presetActive]}
          >
            <Text style={[styles.presetText, target === preset && styles.presetTextActive]}>
              {preset >= 60 ? `${preset / 60}m` : `${preset}s`}
            </Text>
          </AnimatedPressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 7, padding: 10, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  cardDone: { borderColor: colors.cornerBlue },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  label: { color: colors.textMuted, fontFamily: type.display, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  clock: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '900' },
  clockDone: { color: colors.cornerBlue, fontSize: 15 },
  track: { height: 3, borderRadius: 2, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold },
  fillDone: { backgroundColor: colors.cornerBlue },
  presets: { flexDirection: 'row', gap: 6 },
  preset: {
    paddingHorizontal: 9, paddingVertical: 4, minHeight: 24, justifyContent: 'center',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
  },
  presetActive: { borderColor: colors.gold, backgroundColor: colors.gold + '18' },
  presetText: { color: colors.textMuted, fontSize: 10.5, fontWeight: '800' },
  presetTextActive: { color: colors.gold },
})
