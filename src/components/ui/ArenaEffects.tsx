import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { colors } from '../../constants/theme'

export function ArenaEffects() {
  const reduceMotion = useReducedMotion()
  const sweep = useSharedValue(-1)
  const breathe = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) return
    sweep.value = withRepeat(withTiming(1, { duration: 7200, easing: Easing.inOut(Easing.quad) }), -1, false)
    breathe.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }), -1, true)
  }, [reduceMotion])

  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sweep.value * 900 }] }))
  const leftGlow = useAnimatedStyle(() => ({ opacity: .04 + breathe.value * .045, transform: [{ rotate: '-18deg' }, { scaleX: 1 + breathe.value * .12 }] }))
  const rightGlow = useAnimatedStyle(() => ({ opacity: .035 + (1 - breathe.value) * .04, transform: [{ rotate: '18deg' }, { scaleX: 1.08 - breathe.value * .08 }] }))

  return <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden>
    <Animated.View style={[styles.beam, styles.beamLeft, leftGlow]}><LinearGradient colors={['rgba(242,199,68,.55)', 'transparent']} style={StyleSheet.absoluteFillObject} /></Animated.View>
    <Animated.View style={[styles.beam, styles.beamRight, rightGlow]}><LinearGradient colors={['rgba(211,32,43,.48)', 'transparent']} style={StyleSheet.absoluteFillObject} /></Animated.View>
    {!reduceMotion && <Animated.View style={[styles.scan, sweepStyle]} />}
    <View style={styles.topRope} /><View style={styles.bottomRope} />
  </View>
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 4, overflow: 'hidden' },
  beam: { position: 'absolute', top: -130, width: 190, height: 620 },
  beamLeft: { left: '4%' },
  beamRight: { right: '5%' },
  scan: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: colors.gold, opacity: .12 },
  topRope: { position: 'absolute', top: 5, left: 0, right: 0, height: 1, backgroundColor: colors.primary, opacity: .18 },
  bottomRope: { position: 'absolute', bottom: 6, left: 0, right: 0, height: 1, backgroundColor: colors.gold, opacity: .12 },
})
