import React, { useEffect } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { colors, radius, type } from '../../constants/theme'

interface LoadingStateProps {
  /** What is being fetched. A bare spinner tells the user nothing. */
  message?: string
  /** Number of placeholder rows. 0 renders the message alone. */
  rows?: number
  rowHeight?: number
  style?: StyleProp<ViewStyle>
}

function Shimmer({ height }: { height: number }) {
  const pulse = useSharedValue(0.35)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) return
    pulse.value = withRepeat(withTiming(0.7, { duration: 820, easing: Easing.inOut(Easing.quad) }), -1, true)
  }, [reduceMotion])

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }))

  return <Animated.View style={[styles.row, { height }, animated]} />
}

/**
 * Skeleton rows at the height of the real content, so the layout does not
 * reflow when data lands.
 */
export function LoadingState({ message, rows = 3, rowHeight = 56, style }: LoadingStateProps) {
  return (
    <View style={[styles.box, style]} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Loading'}>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {Array.from({ length: rows }, (_, index) => <Shimmer key={index} height={rowHeight} />)}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  message: { color: colors.textMuted, fontFamily: type.display, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  row: { borderRadius: radius.sm, backgroundColor: colors.cardRaised, borderWidth: 1, borderColor: colors.border },
})
