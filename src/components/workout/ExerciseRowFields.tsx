import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Input } from '../ui/Input'
import { colors, combatChip } from '../../constants/theme'
import type { ExerciseType, CardioIntensity } from '../../types/app'

interface ExerciseFieldValues {
  exercise_type: ExerciseType
  weight_mode: 'added' | 'assisted' | null
  sets: number | null
  reps: number | null
  weight_kg: number | null
  duration_seconds: number | null
  distance_km: number | null
  avg_heart_rate_bpm: number | null
  cardio_intensity: CardioIntensity | null
}

interface ExerciseRowFieldsProps {
  exercise: ExerciseFieldValues
  onChange: (field: string, value: string) => void
}

const INTENSITIES: CardioIntensity[] = ['low', 'moderate', 'high']

// The strength-vs-cardio input block for one exercise row. Strength keeps the
// familiar sets/reps/weight row plus an Added/Assisted toggle (assisted-weight
// machines for pull-ups/dips make the exercise easier, not harder); cardio
// swaps in duration/distance/heart-rate plus a qualitative intensity chip row
// for anyone without a heart-rate monitor.
export function ExerciseRowFields({ exercise, onChange }: ExerciseRowFieldsProps) {
  const isCardio = exercise.exercise_type === 'cardio'
  const weightMode = exercise.weight_mode ?? 'added'

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        <TouchableOpacity style={[styles.chip, !isCardio && styles.chipActive]} onPress={() => onChange('exercise_type', 'strength')}>
          <Text style={[styles.chipText, !isCardio && styles.chipTextActive]}>Strength</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.chip, isCardio && styles.chipActive]} onPress={() => onChange('exercise_type', 'cardio')}>
          <Text style={[styles.chipText, isCardio && styles.chipTextActive]}>Cardio</Text>
        </TouchableOpacity>
      </View>

      {isCardio ? (
        <>
          <View style={styles.inputRow}>
            <View style={styles.flex1}>
              <Input
                label="Duration (min)"
                placeholder="30"
                value={exercise.duration_seconds ? String(exercise.duration_seconds / 60) : ''}
                onChangeText={(v) => {
                  const minutes = parseFloat(v)
                  onChange('duration_seconds', isNaN(minutes) ? '' : String(Math.round(minutes * 60)))
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Distance (km)"
                placeholder="5"
                value={exercise.distance_km?.toString() ?? ''}
                onChangeText={(v) => onChange('distance_km', v)}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Avg HR (bpm)"
                placeholder="140"
                value={exercise.avg_heart_rate_bpm?.toString() ?? ''}
                onChangeText={(v) => onChange('avg_heart_rate_bpm', v)}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <View style={styles.intensitySection}>
            <Text style={styles.intensityLabel}>INTENSITY</Text>
            <View style={styles.chipRow}>
              {INTENSITIES.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.chip, exercise.cardio_intensity === level && styles.chipActive]}
                  onPress={() => onChange('cardio_intensity', level)}
                >
                  <Text style={[styles.chipText, exercise.cardio_intensity === level && styles.chipTextActive]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.inputRow}>
            <View style={styles.flex1}>
              <Input label="Sets" placeholder="3" value={exercise.sets?.toString() ?? ''} onChangeText={(v) => onChange('sets', v)} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Input label="Reps" placeholder="10" value={exercise.reps?.toString() ?? ''} onChangeText={(v) => onChange('reps', v)} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Input label="Weight kg" placeholder="0" value={exercise.weight_kg?.toString() ?? ''} onChangeText={(v) => onChange('weight_kg', v)} keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={styles.weightModeRow}>
            <TouchableOpacity style={[styles.chip, weightMode === 'added' && styles.chipActive]} onPress={() => onChange('weight_mode', 'added')}>
              <Text style={[styles.chipText, weightMode === 'added' && styles.chipTextActive]}>Added</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, weightMode === 'assisted' && styles.chipActive]} onPress={() => onChange('weight_mode', 'assisted')}>
              <Text style={[styles.chipText, weightMode === 'assisted' && styles.chipTextActive]}>Assisted</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: combatChip.base,
  chipActive: { ...combatChip.active, backgroundColor: colors.primary },
  chipText: combatChip.text,
  chipTextActive: combatChip.textActive,
  inputRow: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  weightModeRow: { flexDirection: 'row', gap: 8 },
  intensitySection: { gap: 6 },
  intensityLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
})
