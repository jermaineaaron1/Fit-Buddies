import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import { Card } from '../../../src/components/ui/Card'
import type { WorkoutExercise } from '../../../src/types/app'

type ExerciseDraft = Omit<WorkoutExercise, 'id' | 'workout_id'>

export default function LogWorkoutScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    { exercise_name: '', sets: null, reps: null, weight_kg: null, notes: null, sort_order: 0 },
  ])
  const [loading, setLoading] = useState(false)

  function updateExercise(index: number, field: keyof ExerciseDraft, value: string) {
    setExercises((prev) => {
      const updated = [...prev]
      if (field === 'exercise_name' || field === 'notes') {
        updated[index] = { ...updated[index], [field]: value }
      } else {
        updated[index] = { ...updated[index], [field]: value ? parseFloat(value) : null }
      }
      return updated
    })
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { exercise_name: '', sets: null, reps: null, weight_kg: null, notes: null, sort_order: prev.length },
    ])
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your workout a name.')
      return
    }
    if (!profile?.id || !circle?.id) {
      Alert.alert('No circle', 'Join a circle to log workouts.')
      return
    }
    setLoading(true)

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({
        user_id: profile.id,
        circle_id: circle.id,
        title: title.trim(),
        notes: notes.trim() || null,
        difficulty,
        xp_earned: 50,
      })
      .select()
      .single()

    if (error || !workout) {
      setLoading(false)
      Alert.alert('Error', error?.message ?? 'Could not save workout.')
      return
    }

    // Save exercises
    const validExercises = exercises.filter((e) => e.exercise_name.trim())
    if (validExercises.length > 0) {
      await supabase.from('workout_exercises').insert(
        validExercises.map((e, i) => ({ ...e, workout_id: workout.id, sort_order: i }))
      )
    }

    await earn('workout', workout.id, title.trim())
    setLoading(false)
    Alert.alert('Workout logged! 💪', '+50 XP earned.', [{ text: 'Done', onPress: () => router.back() }])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Log Workout</Text>

      <Input label="Workout Title" value={title} onChangeText={setTitle} placeholder="e.g. Push Day, Morning Run" />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="How did it feel?" multiline />

      <View style={styles.difficultyRow}>
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((d) => (
            <TouchableOpacity key={d} onPress={() => setDifficulty(d)}>
              <Text style={[styles.star, d <= difficulty && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Exercises</Text>

      {exercises.map((ex, i) => (
        <Card key={i} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseNumber}>Exercise {i + 1}</Text>
            {exercises.length > 1 && (
              <TouchableOpacity onPress={() => removeExercise(i)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
          <Input placeholder="Exercise name" value={ex.exercise_name} onChangeText={(v) => updateExercise(i, 'exercise_name', v)} />
          <View style={styles.row}>
            <Input label="Sets" placeholder="3" value={ex.sets?.toString() ?? ''} onChangeText={(v) => updateExercise(i, 'sets', v)} keyboardType="numeric" style={styles.flex1} />
            <Input label="Reps" placeholder="10" value={ex.reps?.toString() ?? ''} onChangeText={(v) => updateExercise(i, 'reps', v)} keyboardType="numeric" style={styles.flex1} />
            <Input label="kg" placeholder="0" value={ex.weight_kg?.toString() ?? ''} onChangeText={(v) => updateExercise(i, 'weight_kg', v)} keyboardType="decimal-pad" style={styles.flex1} />
          </View>
        </Card>
      ))}

      <Button label="+ Add Exercise" onPress={addExercise} variant="secondary" />
      <Button label="Save Workout (+50 XP)" onPress={handleSave} loading={loading} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  difficultyRow: { gap: 8 },
  stars: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 28, color: '#334155' },
  starActive: { color: '#F59E0B' },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700', marginTop: 8 },
  exerciseCard: { gap: 12 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseNumber: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  removeText: { color: '#EF4444', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
})
