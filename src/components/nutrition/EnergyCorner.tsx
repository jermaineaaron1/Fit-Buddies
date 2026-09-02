import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactCard } from '../ui/CompactCard'
import { Chip } from '../ui/Chip'

interface EnergyCornerProps {
  loggedCalories: number
  /** Queued but not yet saved — shown as a lighter segment on the same bar. */
  pendingCalories: number
  calorieGoal: number
  maintenance: number
  exerciseCalories: number
  loggedProtein: number
  pendingProtein: number
  proteinGoal: number
  isCustomGoal: boolean
}

/**
 * Today's energy balance. The bar is two-tone on purpose: what is already
 * saved reads solid, what is queued reads lighter, so adding a scanned plate
 * visibly moves the number before it has been committed.
 */
export function EnergyCorner({
  loggedCalories, pendingCalories, calorieGoal, maintenance, exerciseCalories,
  loggedProtein, pendingProtein, proteinGoal, isCustomGoal,
}: EnergyCornerProps) {
  const goal = Math.max(calorieGoal, 1)
  const loggedPct = Math.min(100, (loggedCalories / goal) * 100)
  const pendingPct = Math.min(100 - loggedPct, (pendingCalories / goal) * 100)
  const projected = loggedCalories + pendingCalories
  const remaining = Math.round(goal - projected)

  const status = Math.abs(projected - goal) <= 100
    ? { label: 'In the zone', tone: 'blue' as const }
    : projected > goal
      ? { label: `${Math.abs(remaining)} over`, tone: 'danger' as const }
      : { label: `${remaining} left`, tone: 'gold' as const }

  return (
    <CompactCard accent="gold">
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>TODAY&apos;S ENERGY</Text>
          <Text style={styles.total}>
            {Math.round(loggedCalories).toLocaleString()}
            <Text style={styles.totalUnit}> kcal</Text>
            {pendingCalories > 0 ? <Text style={styles.pending}> +{Math.round(pendingCalories)}</Text> : null}
          </Text>
        </View>
        <Chip label={status.label} tone={status.tone} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${loggedPct}%` }]} />
        {pendingCalories > 0 && <View style={[styles.pendingFill, { width: `${Math.max(0, pendingPct)}%` }]} />}
      </View>

      <View style={styles.labels}>
        <Text style={styles.sub}>{isCustomGoal ? 'Your target' : 'Recommended'} {goal.toLocaleString()}</Text>
        <Text style={styles.sub}>Maintenance ~{maintenance.toLocaleString()}</Text>
      </View>

      <View style={styles.footRow}>
        <View style={styles.footItem}>
          <Ionicons name="flash" size={12} color={colors.primary} />
          <Text style={styles.footText}>
            {Math.round(loggedProtein + pendingProtein)} / {proteinGoal} g protein
          </Text>
        </View>
        {exerciseCalories > 0 && (
          <View style={styles.footItem}>
            <Ionicons name="barbell" size={12} color={colors.gold} />
            <Text style={styles.footText}>+{exerciseCalories} exercise kcal</Text>
          </View>
        )}
      </View>

      <Text style={styles.note}>
        Estimates: maintenance from your profile, exercise from duration and intensity.
      </Text>
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 },
  headCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  total: { color: colors.text, fontFamily: type.display, fontSize: 22, fontWeight: '900', marginTop: 2 },
  totalUnit: { fontSize: 12, color: colors.textMuted },
  pending: { fontSize: 14, color: colors.gold },
  track: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surface, marginTop: 9 },
  fill: { height: '100%', backgroundColor: colors.primary },
  pendingFill: { height: '100%', backgroundColor: colors.gold, opacity: 0.55 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 5 },
  sub: { color: colors.textMuted, fontSize: 9.5 },
  footRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  note: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, marginTop: 7 },
})
