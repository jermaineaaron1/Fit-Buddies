import React from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { colors, radius, type } from '../../constants/theme'
import { ChampionshipBelt } from './ChampionshipBelt'
import { AnimatedPressable } from './AnimatedPressable'

interface ChampionStripProps {
  /** Null renders the vacant-title state rather than an empty strip. */
  name: string | null
  avatarUrl?: string | null
  /** One short line: "Defending the title", "Crowned today", "Vacant". */
  status: string
  points?: number | null
  /** Signed fraction, e.g. 0.12 for +12%. */
  improvement?: number | null
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * The compact champion banner. This is one of the few places the championship
 * spectacle is warranted, so it keeps the gold gradient and the belt mark —
 * but at strip height, not as a hero panel that eats a third of the screen.
 */
export function ChampionStrip({ name, avatarUrl, status, points, improvement, onPress, style }: ChampionStripProps) {
  const vacant = !name
  const body = (
    <LinearGradient
      colors={vacant ? [colors.cardRaised, colors.card] : ['#2A1E06', '#161208', colors.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.plate}
    >
      <View style={styles.beltMark}>
        {vacant
          ? <Ionicons name="ribbon-outline" size={22} color={colors.steel} />
          : <ChampionshipBelt size={27} />}
      </View>

      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{vacant ? 'TITLE VACANT' : 'CHAMPION'}</Text>
        <Text style={styles.name} numberOfLines={1}>{name ?? 'No champion yet'}</Text>
        <Text style={styles.status} numberOfLines={1}>{status}</Text>
      </View>

      {avatarUrl ? (
        <View style={styles.avatar}>
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
        </View>
      ) : null}

      {points !== null && points !== undefined ? (
        <View style={styles.score}>
          <Text style={styles.points}>{points}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
          {improvement !== null && improvement !== undefined ? (
            <View style={styles.trend}>
              <Ionicons
                name={improvement >= 0 ? 'arrow-up' : 'arrow-down'}
                size={9}
                color={improvement >= 0 ? colors.cornerBlue : colors.crimson}
              />
              <Text style={[styles.trendText, { color: improvement >= 0 ? colors.cornerBlue : colors.crimson }]}>
                {Math.abs(Math.round(improvement * 100))}%
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </LinearGradient>
  )

  const label = vacant
    ? 'Championship vacant'
    : `Champion ${name}, ${status}${points != null ? `, ${points} points` : ''}`

  if (!onPress) return <View style={[styles.wrap, style]} accessible accessibilityLabel={label}>{body}</View>
  return (
    <AnimatedPressable style={[styles.wrap, style]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldDark,
    borderLeftWidth: 3, borderLeftColor: colors.gold, overflow: 'hidden',
  },
  plate: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10, minHeight: 72 },
  // The belt renders 2.35x its `size` wide, so the slot has to be sized to
  // the drawn width or it overlaps the champion's name.
  beltMark: { width: 64, height: 44, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  name: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  status: { color: colors.textSecondary, fontSize: 11 },
  avatar: {
    width: 34, height: 34, borderRadius: 17, overflow: 'hidden',
    borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.cardRaised,
  },
  avatarImage: { width: '100%', height: '100%' },
  score: { alignItems: 'flex-end', gap: 1 },
  points: { color: colors.gold, fontFamily: type.display, fontSize: 21, fontWeight: '900' },
  pointsLabel: { color: colors.textMuted, fontSize: 9, marginTop: -4 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 10, fontWeight: '800' },
})
