import React from 'react'
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, useReducedMotion, withSpring } from 'react-native-reanimated'

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable)

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

// Drop-in TouchableOpacity replacement with a tactile spring scale-down on press.
export function AnimatedPressable({ children, style, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, ...rest }: AnimatedPressableProps) {
  const scale = useSharedValue(1)
  const lift = useSharedValue(0)
  const reduceMotion = useReducedMotion()
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }))

  return (
    <AnimatedPressableBase
      style={[style, animatedStyle]}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled && !reduceMotion) scale.value = withSpring(0.965, { damping: 15, stiffness: 420 })
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 })
        onPressOut?.(e)
      }}
      onHoverIn={(e) => {
        if (!disabled && !reduceMotion) {
          scale.value = withSpring(1.012, { damping: 18, stiffness: 260 })
          lift.value = withSpring(-4, { damping: 18, stiffness: 260 })
        }
        onHoverIn?.(e)
      }}
      onHoverOut={(e) => {
        scale.value = withSpring(1, { damping: 18, stiffness: 260 })
        lift.value = withSpring(0, { damping: 18, stiffness: 260 })
        onHoverOut?.(e)
      }}
      {...rest}
    >
      {children}
    </AnimatedPressableBase>
  )
}
