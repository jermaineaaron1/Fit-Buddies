import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import { colors } from '../../constants/theme'

const PARTICLES = [
  { x: -54, y: -22, rotate: -42, color: colors.goldLight, size: 4 },
  { x: -40, y: -44, rotate: -18, color: colors.gold, size: 3 },
  { x: -18, y: -52, rotate: 8, color: '#fff', size: 3 },
  { x: 8, y: -55, rotate: 28, color: colors.goldLight, size: 4 },
  { x: 34, y: -43, rotate: 48, color: colors.gold, size: 3 },
  { x: 58, y: -20, rotate: 68, color: colors.crimson, size: 4 },
  { x: 48, y: 8, rotate: 92, color: colors.goldLight, size: 3 },
  { x: -48, y: 9, rotate: -88, color: colors.crimson, size: 3 },
] as const

export function SparkBurst({ burstKey }: { burstKey: number }) {
  const progress = useSharedValue(1)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (burstKey === 0 || reduceMotion) return
    progress.value = 0
    progress.value = withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) })
  }, [burstKey, reduceMotion])

  if (reduceMotion || burstKey === 0) return null
  return <View pointerEvents="none" style={styles.layer} accessibilityElementsHidden>
    {PARTICLES.map((particle, index) => <Particle key={index} progress={progress} {...particle} />)}
  </View>
}

function Particle({ progress, x, y, rotate, color, size }: { progress: SharedValue<number>; x: number; y: number; rotate: number; color: string; size: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value < .12 ? progress.value / .12 : Math.max(0, 1 - progress.value),
    transform: [
      { translateX: x * progress.value },
      { translateY: y * progress.value + 18 * progress.value * progress.value },
      { rotate: `${rotate + progress.value * 100}deg` },
      { scale: .6 + progress.value * .65 },
    ],
  }))
  return <Animated.View style={[styles.spark, { width: size, height: size * 3.4, backgroundColor: color }, animatedStyle]} />
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: '50%', top: '50%', zIndex: 20, overflow: 'visible' },
  spark: { position: 'absolute', borderRadius: 3, shadowColor: colors.gold, shadowOpacity: .9, shadowRadius: 4 },
})
