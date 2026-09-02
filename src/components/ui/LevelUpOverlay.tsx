import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing, type SharedValue } from 'react-native-reanimated'
import { colors, radius, type } from '../../constants/theme'
import { getLevelLabel } from '../../constants/xp'
import { useXPStore } from '../../store/xpStore'

const PARTICLE_COLORS = [colors.primary, colors.accent, colors.crimson, colors.gold, colors.text]
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  angle: (i / 12) * Math.PI * 2 + (i % 3) * 0.15,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  distance: 70 + (i % 4) * 15,
}))

export function LevelUpOverlay() {
  const { levelUpPending, clearLevelUp } = useXPStore()
  const progress = useSharedValue(0)
  const cardScale = useSharedValue(0.6)

  useEffect(() => {
    if (levelUpPending !== null) {
      progress.value = 0
      cardScale.value = 0.6
      progress.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
      cardScale.value = withSpring(1, { damping: 9, stiffness: 120 })
    }
  }, [levelUpPending])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: progress.value,
  }))

  if (levelUpPending === null) return null

  return (
    <View style={styles.backdrop}>
      {PARTICLES.map((p, i) => (
        <ConfettiParticle key={i} progress={progress} angle={p.angle} color={p.color} distance={p.distance} />
      ))}
      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.badge}>
          <Ionicons name="trophy" size={36} color={colors.primary} />
        </View>
        <Text style={styles.title}>LEVEL UP!</Text>
        <Text style={styles.level}>Level {levelUpPending}</Text>
        <Text style={styles.label}>{getLevelLabel(levelUpPending)}</Text>
        <TouchableOpacity style={styles.dismissBtn} onPress={clearLevelUp} activeOpacity={0.8}>
          <Text style={styles.dismissText}>Nice!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

function ConfettiParticle({ progress, angle, color, distance }: { progress: SharedValue<number>; angle: number; color: string; distance: number }) {
  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value
    const dy = Math.sin(angle) * distance * progress.value + progress.value * progress.value * 60
    return {
      transform: [{ translateX: dx }, { translateY: dy }],
      opacity: 1 - progress.value,
    }
  })
  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000B0',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.primary + '50',
    paddingVertical: 32, paddingHorizontal: 40,
    alignItems: 'center', gap: 2,
  },
  badge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryGlow, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title: { color: colors.primary, fontFamily: type.display, fontSize: 17, fontWeight: '800', letterSpacing: 2 },
  level: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 4 },
  label: { color: colors.textSecondary, fontSize: 15, fontWeight: '600', marginBottom: 16 },
  dismissBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 36, paddingVertical: 12,
    borderRadius: radius.full, marginTop: 8,
  },
  dismissText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  particle: {
    position: 'absolute', width: 8, height: 8, borderRadius: 4,
  },
})
