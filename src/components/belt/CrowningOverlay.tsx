import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated'
import { ChampionshipBelt } from '../ui/ChampionshipBelt'
import { colors, radius, type } from '../../constants/theme'

export type CrowningVariant = 'crowned' | 'defended' | 'dethroned'

const COPY: Record<CrowningVariant, { eyebrow: string; headline: string; blurb: (name: string) => string }> = {
  crowned: {
    eyebrow: 'A NEW ERA BEGINS',
    headline: 'First Champion',
    blurb: (name) => `${name} takes the inaugural title. The belt has an owner.`,
  },
  defended: {
    eyebrow: 'THE TITLE HOLDS',
    headline: 'Defended',
    blurb: (name) => `${name} turned back the challenge and keeps the belt.`,
  },
  dethroned: {
    eyebrow: 'THE BELT CHANGES HANDS',
    headline: 'New Champion',
    blurb: (name) => `${name} dethrones the champion and takes the title.`,
  },
}

// Gold for a defence, red for a title change — the palette carries the news
// before the words do.
const PARTICLE_COLORS: Record<CrowningVariant, string[]> = {
  crowned: [colors.gold, colors.goldLight, colors.accent, colors.text],
  defended: [colors.gold, colors.goldLight, colors.accent],
  dethroned: [colors.primary, colors.crimson, colors.gold, colors.text],
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  angle: (i / 18) * Math.PI * 2 + (i % 3) * 0.12,
  distance: 90 + (i % 5) * 18,
}))

interface CrowningOverlayProps {
  visible: boolean
  variant: CrowningVariant
  championName: string
  onDismiss: () => void
}

export function CrowningOverlay({ visible, variant, championName, onDismiss }: CrowningOverlayProps) {
  const progress = useSharedValue(0)
  const cardScale = useSharedValue(0.6)

  useEffect(() => {
    if (!visible) return
    progress.value = 0
    cardScale.value = 0.6
    progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })
    cardScale.value = withSpring(1, { damping: 9, stiffness: 110 })
  }, [visible, progress, cardScale])

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: progress.value,
  }))

  if (!visible) return null
  const copy = COPY[variant]
  const palette = PARTICLE_COLORS[variant]

  return (
    <View style={styles.backdrop}>
      {PARTICLES.map((p, i) => (
        <Particle
          key={i}
          progress={progress}
          angle={p.angle}
          distance={p.distance}
          color={palette[i % palette.length]}
        />
      ))}
      <Animated.View style={[styles.card, cardStyle]}>
        <ChampionshipBelt size={92} />
        <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
        <Text style={styles.headline}>{copy.headline}</Text>
        <Text style={styles.name}>{championName}</Text>
        <Text style={styles.blurb}>{copy.blurb(championName)}</Text>
        <TouchableOpacity style={styles.dismiss} onPress={onDismiss} activeOpacity={0.85} accessibilityRole="button">
          <Text style={styles.dismissText}>Ring the bell</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

function Particle({ progress, angle, distance, color }: {
  progress: SharedValue<number>; angle: number; distance: number; color: string
}) {
  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value
    const dy = Math.sin(angle) * distance * progress.value + progress.value * progress.value * 80
    return { transform: [{ translateX: dx }, { translateY: dy }], opacity: 1 - progress.value }
  })
  return <Animated.View style={[styles.particle, { backgroundColor: color }, style]} />
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000C0', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  card: {
    maxWidth: 380, alignItems: 'center', gap: 3,
    paddingVertical: 30, paddingHorizontal: 30,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#1A1508',
  },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 11, fontWeight: '900', letterSpacing: 1.8, marginTop: 10 },
  headline: { color: colors.text, fontFamily: type.display, fontSize: 34, fontWeight: '900', textTransform: 'uppercase' },
  name: { color: colors.gold, fontFamily: type.display, fontSize: 20, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  blurb: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 19 },
  dismiss: {
    marginTop: 20, paddingHorizontal: 34, paddingVertical: 13,
    borderRadius: radius.md, backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.accent,
  },
  dismissText: { color: '#fff', fontFamily: type.display, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  particle: { position: 'absolute', width: 9, height: 9, borderRadius: 2 },
})
