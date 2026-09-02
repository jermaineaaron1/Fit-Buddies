import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { colors, type } from '../../constants/theme'

interface ChampionshipBeltProps {
  size?: number
  animated?: boolean
}

// An original, ornate "Big Gold"-inspired belt. It uses only native views and
// gradients so it stays sharp on every platform without copying trademark art.
export function ChampionshipBelt({ size = 72, animated = true }: ChampionshipBeltProps) {
  const sheenProgress = useSharedValue(0)
  const floatProgress = useSharedValue(0)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!animated || reduceMotion) return
    sheenProgress.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    )
    floatProgress.value = withRepeat(withTiming(1, { duration: 3300, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [animated, reduceMotion, sheenProgress, floatProgress])

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + Math.sin(sheenProgress.value * Math.PI) * 0.58,
    transform: [{ translateX: (sheenProgress.value * 2 - 1) * size * 0.78 }, { rotate: '18deg' }],
  }))
  const beltStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: animated && !reduceMotion ? -2.5 * floatProgress.value : 0 },
      { rotate: `${-3 + (animated && !reduceMotion ? floatProgress.value * 1.2 : 0)}deg` },
      { scale: animated && !reduceMotion ? 1 + floatProgress.value * .012 : 1 },
    ],
  }))
  const glowStyle = useAnimatedStyle(() => ({
    opacity: animated && !reduceMotion ? .18 + floatProgress.value * .28 : .16,
    transform: [{ scale: 1 + floatProgress.value * .16 }],
  }))
  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: animated && !reduceMotion ? Math.max(0, Math.sin(sheenProgress.value * Math.PI * 2)) : 0,
    transform: [{ rotate: `${sheenProgress.value * 180}deg` }, { scale: .5 + sheenProgress.value * .9 }],
  }))

  return (
    <Animated.View
      style={[styles.belt, { width: size * 2.35, height: size * 1.36 }, beltStyle]}
      accessible
      accessibilityLabel="Ornate gold championship belt"
    >
      <Animated.View style={[styles.goldGlow, { width: size * 1.35, height: size * .92, borderRadius: size }, glowStyle]} />
      {animated && <>
        <Animated.View style={[styles.sparkle, styles.sparkleOne, sparkleStyle]}><View style={styles.sparkleVertical} /></Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkleTwo, sparkleStyle]}><View style={styles.sparkleVertical} /></Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkleThree, sparkleStyle]}><View style={styles.sparkleVertical} /></Animated.View>
      </>}
      <View style={[styles.strap, { width: size * 2.25, height: size * 0.46, borderRadius: size * 0.16 }]} />

      <SidePlate size={size} side="left" />
      <SidePlate size={size} side="right" />

      <View style={[styles.mainPlateFrame, { width: size * 1.02, height: size * 1.2, borderRadius: size * 0.3 }]}>
        <LinearGradient
          colors={[colors.goldLight, colors.gold, '#F4D169', colors.goldDark]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: size * 0.28 }]}
        />
        {animated && <>
          <Animated.View style={[styles.sheen, { width: size * 0.25, height: size * 1.7 }, sheenStyle]} />
          <Animated.View style={[styles.sheen, styles.sheenFine, { width: size * 0.08, height: size * 1.7 }, sheenStyle]} />
        </>}

        <View style={[styles.etchedFrame, { width: size * 0.82, height: size * 0.96, borderRadius: size * 0.24 }]}>
          <View style={styles.crownRow}>
            <View style={styles.crownWing} />
            <View style={[styles.crownGem, { width: size * 0.13, height: size * 0.13, borderRadius: size * 0.065 }]} />
            <View style={[styles.crownWing, styles.crownWingRight]} />
          </View>

          <View style={[styles.globe, { width: size * 0.43, height: size * 0.43, borderRadius: size * 0.215 }]}>
            <View style={[styles.globeLine, { width: size * 0.31 }]} />
            <View style={[styles.globeLine, styles.globeLineVertical, { width: size * 0.31 }]} />
            <Text style={[styles.fbMark, { fontSize: size * 0.15 }]}>FB</Text>
          </View>

          <Text style={[styles.championText, { fontSize: Math.max(7, size * 0.105) }]}>CHAMPION</Text>
          <View style={styles.flourishRow}>
            <View style={styles.flourish} />
            <View style={styles.flourishDiamond} />
            <View style={[styles.flourish, styles.flourishRight]} />
          </View>
        </View>
      </View>
    </Animated.View>
  )
}

function SidePlate({ size, side }: { size: number; side: 'left' | 'right' }) {
  return (
    <View
      style={[
        styles.sidePlate,
        {
          width: size * 0.42,
          height: size * 0.58,
          borderRadius: size * 0.12,
          [side]: size * 0.15,
        },
      ]}
    >
      <LinearGradient
        colors={[colors.goldLight, colors.gold, colors.goldDark]}
        style={[StyleSheet.absoluteFillObject, { borderRadius: size * 0.11 }]}
      />
      <View style={[styles.sidePlateInset, { width: size * 0.24, height: size * 0.34, borderRadius: size * 0.08 }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  belt: { alignItems: 'center', justifyContent: 'center' },
  goldGlow: { position: 'absolute', backgroundColor: colors.gold, shadowColor: colors.goldLight, shadowOpacity: .8, shadowRadius: 28 },
  strap: { position: 'absolute', backgroundColor: '#080605', borderWidth: 2, borderColor: '#30200F' },
  sidePlate: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.goldLight },
  sidePlateInset: { backgroundColor: '#241506', borderWidth: 1, borderColor: colors.goldLight, transform: [{ rotate: '45deg' }] },
  mainPlateFrame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.goldLight, shadowColor: '#000', shadowOpacity: 0.62, shadowRadius: 9, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
  etchedFrame: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF1A0', backgroundColor: '#8A590F88' },
  crownRow: { position: 'absolute', top: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  crownWing: { width: 18, height: 5, backgroundColor: colors.goldLight, transform: [{ rotate: '24deg' }] },
  crownWingRight: { transform: [{ rotate: '-24deg' }] },
  crownGem: { backgroundColor: colors.crimson, borderWidth: 1, borderColor: '#5E0909' },
  globe: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#251506', borderWidth: 2, borderColor: colors.goldLight, overflow: 'hidden' },
  globeLine: { position: 'absolute', height: 1, backgroundColor: colors.gold },
  globeLineVertical: { transform: [{ rotate: '90deg' }] },
  fbMark: { color: colors.goldLight, fontFamily: type.display, fontWeight: '900' },
  championText: { marginTop: 3, color: '#382004', fontFamily: type.display, fontWeight: '900', letterSpacing: 0.8 },
  flourishRow: { position: 'absolute', bottom: 7, flexDirection: 'row', alignItems: 'center', gap: 3 },
  flourish: { width: 17, height: 3, backgroundColor: colors.goldLight, transform: [{ rotate: '-15deg' }] },
  flourishRight: { transform: [{ rotate: '15deg' }] },
  flourishDiamond: { width: 6, height: 6, backgroundColor: colors.goldLight, transform: [{ rotate: '45deg' }] },
  sheen: { position: 'absolute', backgroundColor: '#FFFFFF' },
  sheenFine: { backgroundColor: colors.goldLight, opacity: .75 },
  sparkle: { position: 'absolute', zIndex: 8, width: 18, height: 3, borderRadius: 3, backgroundColor: '#FFFBE0', shadowColor: colors.goldLight, shadowOpacity: 1, shadowRadius: 8 },
  sparkleVertical: { position: 'absolute', left: 7.5, top: -7.5, width: 3, height: 18, borderRadius: 3, backgroundColor: '#FFFBE0' },
  sparkleOne: { top: '8%', left: '31%' },
  sparkleTwo: { top: '24%', right: '24%', transform: [{ scale: .72 }] },
  sparkleThree: { bottom: '13%', left: '43%', transform: [{ scale: .55 }] },
})
