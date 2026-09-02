import React, { useEffect } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring, Easing } from 'react-native-reanimated'
import { colors, radius } from '../../constants/theme'

export interface VersusParticipant {
  user_id: string
  display_name: string
  status?: string
  avatar_url?: string | null
}

interface VersusCardProps {
  participants: VersusParticipant[]
}

export function VersusCard({ participants }: VersusCardProps) {
  const { width } = useWindowDimensions()
  if (participants.length === 2) {
    return <FaceOff left={participants[0]} right={participants[1]} desktop={width >= 900} />
  }
  return <Lineup participants={participants} />
}

function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {url ? <Image source={{ uri: url }} style={styles.avatarImage} contentFit="cover" /> : <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{name.charAt(0).toUpperCase()}</Text>}
    </View>
  )
}

function FaceOff({ left, right, desktop }: { left: VersusParticipant; right: VersusParticipant; desktop: boolean }) {
  const leftX = useSharedValue(-40)
  const rightX = useSharedValue(40)
  const fade = useSharedValue(0)
  const vsScale = useSharedValue(0)

  useEffect(() => {
    fade.value = withTiming(1, { duration: 150 })
    leftX.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.exp) })
    rightX.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.exp) })
    vsScale.value = withDelay(320, withSpring(1, { damping: 7, stiffness: 220 }))
  }, [])

  const leftStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: leftX.value }] }))
  const rightStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateX: rightX.value }] }))
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: vsScale.value }] }))

  return (
    <View style={styles.faceOffRow}>
      <Animated.View style={[styles.faceOffSide, leftStyle]}>
        <Avatar name={left.display_name} url={left.avatar_url} size={desktop ? 132 : 48} />
        <Text style={styles.faceOffName} numberOfLines={1}>{left.display_name}</Text>
      </Animated.View>

      <Animated.View style={[styles.vsBadge, vsStyle]}>
        <Text style={styles.vsText}>VS</Text>
      </Animated.View>

      <Animated.View style={[styles.faceOffSide, rightStyle]}>
        <Avatar name={right.display_name} url={right.avatar_url} size={desktop ? 132 : 48} />
        <Text style={styles.faceOffName} numberOfLines={1}>{right.display_name}</Text>
      </Animated.View>
    </View>
  )
}

function Lineup({ participants }: { participants: VersusParticipant[] }) {
  return (
    <View style={styles.lineupRow}>
      {participants.map((p, i) => (
        <React.Fragment key={p.user_id}>
          <LineupItem participant={p} delay={i * 90} />
          {i < participants.length - 1 && (
            <Text style={styles.lineupVs}>VS</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  )
}

function LineupItem({ participant, delay }: { participant: VersusParticipant; delay: number }) {
  const scale = useSharedValue(0)
  const fade = useSharedValue(0)

  useEffect(() => {
    fade.value = withDelay(delay, withTiming(1, { duration: 200 }))
    scale.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 250 }))
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: scale.value }] }))

  return (
    <Animated.View style={[styles.lineupItem, style]}>
      <Avatar name={participant.display_name} url={participant.avatar_url} size={40} />
      <Text style={styles.lineupName} numberOfLines={1}>{participant.display_name}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primary,
  },
  avatarText: { color: '#fff', fontWeight: '800' },
  avatarImage: { width: '100%', height: '100%' },

  faceOffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  faceOffSide: { alignItems: 'center', gap: 6, width: 84 },
  faceOffName: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  vsBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.crimson, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff2',
  },
  vsText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

  lineupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  lineupItem: { alignItems: 'center', gap: 4, width: 56 },
  lineupName: { color: colors.text, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  lineupVs: { color: colors.crimson, fontSize: 11, fontWeight: '900' },
})
