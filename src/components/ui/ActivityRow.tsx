import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

export interface ActivityRowProps {
  /** Who did it. */
  actorName: string
  actorAvatarUrl?: string | null
  /** What they did, in plain language: "logged a workout". */
  action: string
  /** Optional specifics: "Strength · Upper Body". */
  detail?: string
  /** Already-formatted relative time. */
  timeAgo: string
  icon?: keyof typeof Ionicons.glyphMap
  tone?: 'red' | 'gold' | 'blue' | 'steel'
  onPress?: () => void
}

const TONE = { red: colors.primary, gold: colors.gold, blue: colors.cornerBlue, steel: colors.steel }

/** A dense circle-feed line: avatar, sentence, time, activity glyph. */
export function ActivityRow({
  actorName, actorAvatarUrl, action, detail, timeAgo, icon = 'ellipse', tone = 'steel', onPress,
}: ActivityRowProps) {
  const accent = TONE[tone]
  const body = (
    <>
      <View style={[styles.avatar, { borderColor: accent }]}>
        {actorAvatarUrl
          ? <Image source={{ uri: actorAvatarUrl }} style={styles.avatarImage} contentFit="cover" />
          : <Text style={[styles.avatarText, { color: accent }]}>{actorName.charAt(0).toUpperCase()}</Text>}
      </View>
      <View style={styles.copy}>
        <Text style={styles.line} numberOfLines={1}>
          <Text style={styles.actor}>{actorName}</Text>
          <Text style={styles.action}> {action}</Text>
        </Text>
        {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
      </View>
      <Text style={styles.time}>{timeAgo}</Text>
      <View style={[styles.glyph, { borderColor: accent + '66' }]}>
        <Ionicons name={icon} size={13} color={accent} />
      </View>
    </>
  )

  if (!onPress) return <View style={styles.row}>{body}</View>
  return (
    <AnimatedPressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${actorName} ${action}${detail ? `, ${detail}` : ''}, ${timeAgo}`}
    >
      {body}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6 },
  avatar: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardRaised,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontFamily: type.display, fontSize: 13, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  line: { fontSize: 12.5 },
  actor: { color: colors.text, fontWeight: '800' },
  action: { color: colors.textSecondary },
  detail: { color: colors.textMuted, fontSize: 11 },
  time: { color: colors.textMuted, fontSize: 10.5, flexShrink: 0 },
  glyph: {
    width: 26, height: 26, borderRadius: radius.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardRaised,
  },
})
