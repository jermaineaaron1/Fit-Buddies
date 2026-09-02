import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../constants/theme'
import type { WorkoutWithExercises } from '../../types/app'
import type { FlatEntry } from './WorkoutHistoryBrowser'

interface ExerciseProgressSnippetProps {
  workout: WorkoutWithExercises
  priorMap: Map<string, FlatEntry>
}

// A "brief" per-exercise comparison for a past-workout card — one line per
// exercise (first 3 only, to keep the card compact), showing the delta vs.
// this exercise's most recent prior occurrence. Distinct from the full
// Tale-of-the-Tape (4-session chart + delta breakdown) shown while actively
// logging — this is a glance, not a deep dive, and costs zero extra queries
// since it's computed from the same batch already fetched for the browser.
export function ExerciseProgressSnippet({ workout, priorMap }: ExerciseProgressSnippetProps) {
  const rows = workout.exercises.slice(0, 3).map((exercise) => {
    const prior = priorMap.get(`${workout.id}::${exercise.exercise_name.toLowerCase()}`)
    if (!prior) return { name: exercise.exercise_name, text: 'First time logged' }
    if (exercise.exercise_type === 'cardio') {
      const deltaMin = (exercise.duration_seconds ?? 0) / 60 - prior.durationSeconds / 60
      return { name: exercise.exercise_name, text: `${deltaMin >= 0 ? '+' : ''}${deltaMin.toFixed(1)} min vs. last time` }
    }
    const deltaWeight = Number(exercise.weight_kg ?? 0) - prior.weight
    return { name: exercise.exercise_name, text: `${deltaWeight >= 0 ? '+' : ''}${deltaWeight.toFixed(1)}kg vs. last time` }
  })

  if (!rows.length) return null

  return (
    <View style={styles.container}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
          <Text style={styles.delta}>{row.text}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  name: { flex: 1, color: colors.textSecondary, fontSize: 10 },
  delta: { color: colors.accent, fontSize: 10, fontWeight: '700' },
})
