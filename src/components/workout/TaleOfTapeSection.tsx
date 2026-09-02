import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { TaleOfTape, type HistoryEntry } from './TaleOfTape'
import { loadExerciseHistory, type ExerciseDraft } from '../../lib/workoutDraft'
import { rollupSets } from '../../lib/workoutFormat'
import { schemaFor } from '../../lib/measurementSchemas'

interface TaleOfTapeSectionProps {
  userId: string | null
  exercise: ExerciseDraft
}

/**
 * The existing per-exercise progress comparison, kept intact and moved behind
 * a disclosure.
 *
 * It is a genuinely useful, already-built feature, but it is also the single
 * heaviest block in the logger — expanded by default it would push the set
 * table below the fold on a phone, which is the opposite of what someone
 * mid-session needs. Collapsed, it costs one row and is one tap away.
 */
export function TaleOfTapeSection({ userId, exercise }: TaleOfTapeSectionProps) {
  const [open, setOpen] = useState(false)
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [selected, setSelected] = useState(0)
  const [loading, setLoading] = useState(false)

  const name = exercise.exercise_name.trim()

  // Only fetched once opened — most exercises in a session never are, and this
  // is two queries per exercise.
  useEffect(() => {
    if (!open || !userId || !name) return
    let cancelled = false
    setLoading(true)
    loadExerciseHistory(userId, name, exercise.measurement_type).then((result) => {
      if (cancelled) return
      setEntries(result)
      setSelected(Math.max(0, result.length - 1))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [open, userId, name, exercise.measurement_type])

  // Re-fetching on every change would thrash; close instead so the next open
  // reflects the new exercise rather than the previous one's history.
  useEffect(() => { setEntries(null); setOpen(false) }, [name, exercise.measurement_type])

  if (!name) return null

  const rollup = rollupSets(exercise.setRows, exercise.measurement_type)
  const isCardio = schemaFor(exercise.measurement_type).isCardio

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        style={styles.toggle}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Tale of the Tape, progress against previous sessions"
      >
        <Ionicons name="analytics-outline" size={13} color={colors.gold} />
        <Text style={styles.toggleText}>Tale of the Tape</Text>
        {loading ? <ActivityIndicator size="small" color={colors.gold} /> : null}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
      </AnimatedPressable>

      {open && entries !== null && (
        entries.length ? (
          <TaleOfTape
            current={{
              exercise_type: isCardio ? 'cardio' : 'strength',
              weight_kg: rollup.weight_kg,
              reps: rollup.reps,
              sets: rollup.sets,
              duration_seconds: rollup.duration_seconds,
              distance_km: rollup.distance_km,
            }}
            entries={entries}
            selectedIndex={selected}
            onSelect={setSelected}
          />
        ) : (
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={15} color={colors.primary} />
            <Text style={styles.emptyText}>
              First recorded session for this exercise. Save it and the comparison starts here.
            </Text>
          </View>
        )
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
  toggleText: { flex: 1, color: colors.gold, fontFamily: type.display, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  empty: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: radius.sm, backgroundColor: colors.primaryGlow,
  },
  emptyText: { flex: 1, color: colors.textSecondary, fontSize: 11.5, lineHeight: 16 },
})
