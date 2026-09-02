import React, { useEffect } from 'react'
import { ImageSourcePropType, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'
import { LivePulse } from './LivePulse'

const AnimatedImage = Animated.createAnimatedComponent(Image)

type PhotoHeroProps = {
  image: ImageSourcePropType
  eyebrow: string
  title: string
  subtitle: string
  cta?: string
  ctaIcon?: string
  onPress?: () => void
  liveLabel?: string
  compact?: boolean
}

export function PhotoHero({ image, eyebrow, title, subtitle, cta, ctaIcon = 'arrow-forward', onPress, liveLabel, compact = false }: PhotoHeroProps) {
  const reduceMotion = useReducedMotion()
  const { width } = useWindowDimensions()
  const zoom = useSharedValue(1)
  const focus = useSharedValue(0)
  const shine = useSharedValue(-1)

  useEffect(() => {
    if (!reduceMotion) {
      zoom.value = withRepeat(withTiming(1.045, { duration: 6500, easing: Easing.inOut(Easing.sin) }), -1, true)
      shine.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }), -1, false)
    }
  }, [reduceMotion])

  const imageStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value + focus.value * .025 }, { translateX: focus.value * -7 }] }))
  const copyStyle = useAnimatedStyle(() => ({ transform: [{ translateX: focus.value * 5 }] }))
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: focus.value * 5 }] }))
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shine.value * Math.max(width, 700) }, { rotate: '-16deg' }] }))
  const isNarrow = width < 620

  return (
    <AnimatedPressable style={[styles.hero, compact && styles.heroCompact]} onPress={onPress} disabled={!onPress} onHoverIn={() => { if (!reduceMotion) focus.value = withSpring(1) }} onHoverOut={() => { focus.value = withSpring(0) }}>
      <AnimatedImage source={image} style={[StyleSheet.absoluteFillObject, imageStyle]} contentFit="cover" transition={350} />
      <LinearGradient colors={isNarrow ? ['rgba(8,9,11,.92)', 'rgba(8,9,11,.60)', 'rgba(8,9,11,.18)'] : ['rgba(8,9,11,.97)', 'rgba(8,9,11,.78)', 'rgba(8,9,11,.10)']} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={StyleSheet.absoluteFillObject} />
      {!reduceMotion && <Animated.View style={[styles.shine, shineStyle]} />}
      <View style={styles.redSlash} />
      <Animated.View style={[styles.copy, copyStyle]}>
        {liveLabel && <View style={styles.liveRow}><LivePulse size={7} /><Text style={styles.liveText}>{liveLabel}</Text></View>}
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {cta && <View style={styles.cta}><Text style={styles.ctaText}>{cta}</Text><Animated.View style={arrowStyle}><Ionicons name={ctaIcon as any} size={16} color={colors.bg} /></Animated.View></View>}
      </Animated.View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  hero: { position: 'relative', minHeight: 285, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, backgroundColor: colors.card },
  heroCompact: { minHeight: 205 },
  redSlash: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: colors.primary },
  copy: { flex: 1, maxWidth: 600, justifyContent: 'center', alignItems: 'flex-start', gap: 7, padding: 28, paddingLeft: 34 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  liveText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { color: colors.text, fontFamily: type.display, fontSize: 39, fontWeight: '900', letterSpacing: .4, lineHeight: 43, textTransform: 'uppercase', textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  titleCompact: { fontSize: 30, lineHeight: 34 },
  subtitle: { maxWidth: 470, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.gold, borderLeftWidth: 4, borderLeftColor: colors.primary },
  ctaText: { color: colors.bg, fontFamily: type.display, fontSize: 12, fontWeight: '900', letterSpacing: .7, textTransform: 'uppercase' },
  shine: { position: 'absolute', top: '-30%', left: '-45%', width: 90, height: '165%', backgroundColor: 'rgba(255,255,255,.07)' },
})
