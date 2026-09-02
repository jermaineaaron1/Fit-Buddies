import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { colors, type } from '../../constants/theme'
import type { WorkoutWithExercises, ExerciseType } from '../../types/app'
import { PastWorkoutCard } from './PastWorkoutCard'

export interface FlatEntry {
  workoutId: string
  date: string
  exerciseName: string
  exerciseType: ExerciseType
  weight: number
  reps: number
  sets: number
  durationSeconds: number
}

// Builds a "this workout's exercise → its most recent PRIOR occurrence" map
// across the whole fetched batch, in one pass, so ExerciseProgressSnippet
// never needs its own query. Batch size here is small (recent workouts ×
// ~8 exercises), so the O(n^2) prior-lookup is negligible in practice.
export function buildPriorEntryMap(workouts: WorkoutWithExercises[]): Map<string, FlatEntry> {
  const flat: FlatEntry[] = []
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      flat.push({
        workoutId: workout.id,
        date: workout.logged_at,
        exerciseName: exercise.exercise_name.toLowerCase(),
        exerciseType: exercise.exercise_type,
        weight: Number(exercise.weight_kg ?? 0),
        reps: Number(exercise.reps ?? 0),
        sets: Number(exercise.sets ?? 0),
        durationSeconds: exercise.duration_seconds ?? 0,
      })
    }
  }
  flat.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const map = new Map<string, FlatEntry>()
  for (let i = 0; i < flat.length; i++) {
    const current = flat[i]
    const key = `${current.workoutId}::${current.exerciseName}`
    if (map.has(key)) continue
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[j].exerciseName === current.exerciseName && flat[j].workoutId !== current.workoutId) {
        map.set(key, flat[j])
        break
      }
    }
  }
  return map
}

interface WorkoutHistoryBrowserProps {
  workouts: WorkoutWithExercises[]
  recurringSourceIds: Set<string>
  onRepeat: (workout: WorkoutWithExercises) => void
  onUseAsBase: (workout: WorkoutWithExercises) => void
  onMakeRecurring: (workout: WorkoutWithExercises) => void
}

// The "database of workouts" — a horizontally-scrolling row of the user's own
// recent workouts (not circle-wide, matching Tale-of-the-Tape's existing
// scoping), each reusable via Repeat or Use as Base.
export function WorkoutHistoryBrowser({ workouts, recurringSourceIds, onRepeat, onUseAsBase, onMakeRecurring }: WorkoutHistoryBrowserProps) {
  const priorMap = useMemo(() => buildPriorEntryMap(workouts), [workouts])

  if (!workouts.length) return null

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>YOUR RECORD BOOK</Text>
        <Text style={styles.title}>Past Workouts</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {workouts.map((workout) => (
          <PastWorkoutCard
            key={workout.id}
            workout={workout}
            isRecurringSource={recurringSourceIds.has(workout.id)}
            priorMap={priorMap}
            onRepeat={() => onRepeat(workout)}
            onUseAsBase={() => onUseAsBase(workout)}
            onMakeRecurring={() => onMakeRecurring(workout)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { gap: 2 },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' },
  row: { gap: 10 },
})
