import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { explainWeightChange, type CompositionSummary } from '../../lib/bodyComposition'

interface CompositionSummaryCardProps {
  summary: CompositionSummary
  averageDailyCalories: number | null
  maintenanceCalories: number | null
}

export function CompositionSummaryCard({
  summary, averageDailyCalories, maintenanceCalories,
}: CompositionSummaryCardProps) {
  if (!summary.latest) return null

  const { weightChangeKg, fatMassChangeKg, leanMassChangeKg, weightTrendKgPerWeek, days } = summary
  const energy = explainWeightChange({
    actualChangeKg: weightChangeKg,
    days,
    averageDailyCalories,
    maintenanceCalories,
  })

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="analytics" size={17} color={colors.gold} />
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>WHAT'S ACTUALLY CHANGING</Text>
          <Text style={styles.title}>
            {weightChangeKg === null
              ? 'Building your baseline'
              : `${signed(weightChangeKg)}kg over ${days} days`}
          </Text>
        </View>
      </View>

      {weightTrendKgPerWeek !== null && (
        <Text style={styles.trend}>
          Trending {signed(round1(weightTrendKgPerWeek))}kg per week
          <Text style={styles.muted}>  · fitted across every weigh-in, so daily water swings don't distort it</Text>
        </Text>
      )}

      {/* The headline number people care about is weight, but the useful one is
          what that weight was made of. */}
      {fatMassChangeKg !== null && leanMassChangeKg !== null ? (
        <View style={styles.splitRow}>
          <Split
            label="Fat mass"
            value={fatMassChangeKg}
            good={fatMassChangeKg < 0}
            icon="flame-outline"
          />
          <Split
            label="Lean mass"
            value={leanMassChangeKg}
            good={leanMassChangeKg >= 0}
            icon="barbell-outline"
          />
        </View>
      ) : (
        <Text style={styles.hint}>
          Add body fat % to two weigh-ins and this splits your change into fat versus muscle —
          the difference between losing fat and just losing weight.
        </Text>
      )}

      {energy && (
        <View style={styles.energy}>
          <Text style={styles.energyLine}>
            Averaging <Text style={styles.strong}>{signed(energy.dailyBalance)} kcal/day</Text> against
            maintenance predicts <Text style={styles.strong}>{signed(energy.expectedChangeKg)}kg</Text>
            {weightChangeKg !== null && <Text>; the scale says {signed(weightChangeKg)}kg</Text>}.
          </Text>
          <Text style={styles.caveat}>
            A gap is normal — intake is usually under-recorded, maintenance is an estimate, and water
            and glycogen move weight independently of fat. Treat it as a sanity check, not a verdict.
          </Text>
        </View>
      )}
    </View>
  )
}

function Split({ label, value, good, icon }: { label: string; value: number; good: boolean; icon: string }) {
  return (
    <View style={styles.split}>
      <Ionicons name={icon as any} size={14} color={good ? colors.gold : colors.textMuted} />
      <Text style={[styles.splitValue, good && styles.splitValueGood]}>{signed(value)}kg</Text>
      <Text style={styles.splitLabel}>{label}</Text>
    </View>
  )
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

const styles = StyleSheet.create({
  card: {
    gap: 10, padding: 14, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#1A1508',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  flex1: { flex: 1 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 21, fontWeight: '900', textTransform: 'uppercase' },
  trend: { color: colors.textSecondary, fontSize: 12 },
  muted: { color: colors.textMuted, fontSize: 11 },
  splitRow: { flexDirection: 'row', gap: 9 },
  split: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10,
    borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  splitValue: { color: colors.textSecondary, fontFamily: type.display, fontSize: 20, fontWeight: '900' },
  splitValueGood: { color: colors.gold },
  splitLabel: { color: colors.textMuted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.7 },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  energy: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  energyLine: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  strong: { color: colors.text, fontWeight: '800' },
  caveat: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
})
