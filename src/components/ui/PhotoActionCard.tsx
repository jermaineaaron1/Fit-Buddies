import React from 'react'
import { ImageSourcePropType, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated'

const AnimatedImage = Animated.createAnimatedComponent(Image)

export function PhotoActionCard({ image, eyebrow, title, subtitle, icon, onPress, accent = colors.primary, badge }: { image: ImageSourcePropType; eyebrow: string; title: string; subtitle: string; icon: string; onPress: () => void; accent?: string; badge?: string }) {
  const focus = useSharedValue(0)
  const reduceMotion = useReducedMotion()
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + focus.value * .065 }, { translateX: focus.value * -5 }] }))
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateX: focus.value * 4 }, { rotate: `${focus.value * -7}deg` }] }))
  const titleStyle = useAnimatedStyle(() => ({ transform: [{ translateY: focus.value * -3 }] }))
  const setFocus = (value: number) => { if (!reduceMotion) focus.value = withSpring(value, { damping: 18, stiffness: 220 }) }

  return <AnimatedPressable style={styles.card} onPress={onPress} accessibilityRole="button" onHoverIn={() => setFocus(1)} onHoverOut={() => setFocus(0)} onPressIn={() => setFocus(1)} onPressOut={() => setFocus(0)}>
    <AnimatedImage source={image} style={[StyleSheet.absoluteFillObject, imageStyle]} contentFit="cover" transition={300} />
    <LinearGradient colors={['rgba(10,11,13,.12)', 'rgba(10,11,13,.88)']} style={StyleSheet.absoluteFillObject} />
    <LinearGradient colors={['transparent', 'rgba(242,199,68,.10)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.diagonalLight} />
    <View style={[styles.rail, { backgroundColor: accent }]} />
    {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
    <View style={styles.copy}><Text style={[styles.eyebrow, { color: accent }]}>{eyebrow}</Text><Animated.Text style={[styles.title, titleStyle]}>{title}</Animated.Text><Text style={styles.subtitle}>{subtitle}</Text></View>
    <Animated.View style={[styles.icon, iconStyle]}><Ionicons name={icon as any} size={19} color={colors.gold} /></Animated.View>
  </AnimatedPressable>
}

const styles = StyleSheet.create({
  card: { position: 'relative', minHeight: 210, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, backgroundColor: colors.card },
  rail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  badge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(11,12,14,.82)', borderWidth: 1, borderColor: colors.goldDark },
  badgeText: { color: colors.gold, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  copy: { flex: 1, justifyContent: 'flex-end', gap: 4, padding: 18, paddingRight: 58 },
  eyebrow: { fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontFamily: type.display, fontSize: 24, fontWeight: '900', textTransform: 'uppercase', textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  subtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  icon: { position: 'absolute', right: 16, bottom: 17, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.goldDark, backgroundColor: 'rgba(11,12,14,.82)' },
  diagonalLight: { position: 'absolute', width: '55%', height: '145%', top: '-25%', right: '-8%', transform: [{ rotate: '-12deg' }] },
})
