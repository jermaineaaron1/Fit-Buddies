import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, useReducedMotion, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { colors, radius } from '../../constants/theme'

interface ProgressBarProps {
  progress: number // 0-1
  color?: string
  trackColor?: string
  height?: number
}

export function ProgressBar({ progress, color = colors.primary, trackColor = colors.border, height = 6 }: ProgressBarProps) {
  const width = useSharedValue(0)
  const shimmer = useSharedValue(-1)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    width.value = withTiming(Math.min(Math.max(progress, 0), 1), { duration: 700, easing: Easing.out(Easing.cubic) })
    if (!reduceMotion) shimmer.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, false)
  }, [progress])

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }))
  const shimmerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shimmer.value * 260 }] }))

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color, borderRadius: height / 2 }, animatedStyle]}>
        {!reduceMotion && <Animated.View style={[styles.shimmer, shimmerStyle]} />}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%', overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, left: -80, width: 64, backgroundColor: 'rgba(255,255,255,.28)', transform: [{ skewX: '-18deg' }] },
})
