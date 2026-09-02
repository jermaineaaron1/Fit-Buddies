import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { colors } from '../../constants/theme'

export function LivePulse({ color = colors.primary, size = 9 }: { color?: string; size?: number }) {
  const reduceMotion = useReducedMotion()
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (!reduceMotion) pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true)
  }, [reduceMotion])

  const ringStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? 0.25 : 0.45 - pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }))

  return <View style={{ width: size * 2.4, height: size * 2.4, alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, ringStyle]} />
    <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
  </View>
}

const styles = StyleSheet.create({
  ring: { position: 'absolute' },
  dot: { position: 'absolute' },
})
