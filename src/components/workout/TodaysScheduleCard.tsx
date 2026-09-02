import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import type { WorkoutPlanWithSource } from '../../types/app'

interface TodaysScheduleCardProps {
  plans: WorkoutPlanWithSource[]
  onStart: (plan: WorkoutPlanWithSource) => void
}

// Surfaces any recurring plan scheduled for today. Shows every matching plan
// rather than just the first — silently hiding one the user configured would
// be worse than a rare double-booked day. Tap-triggered, never auto-filled on
// mount, so opening this screen for something unrelated never gets clobbered.
export function TodaysScheduleCard({ plans, onStart }: TodaysScheduleCardProps) {
  if (!plans.length) return null

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>TONIGHT'S MATCHUP</Text>
      {plans.map((plan) => (
        <TouchableOpacity key={plan.id} style={styles.card} onPress={() => onStart(plan)} activeOpacity={0.85}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar" size={18} color={colors.gold} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.title}>{plan.title}</Text>
            <Text style={styles.subtitle}>Scheduled for today · Tap to start</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#251B08',
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  flex1: { flex: 1 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '800', textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
})
