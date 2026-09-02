import React, { useEffect } from 'react'
import { StyleProp, ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'

export function AnimatedScreen({ children, style, delay = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(reduceMotion ? 1 : 0)

  useEffect(() => {
    progress.value = reduceMotion
      ? 1
      : withDelay(delay, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }))
  }, [delay, reduceMotion])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 18 }],
  }))

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
}
