import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
type MealType = typeof MEAL_TYPES[number]

export default function LogMealScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [mealType, setMealType] = useState<MealType>('lunch')
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!foodName.trim()) {
      Alert.alert('Missing food name', 'Enter what you ate.')
      return
    }
    if (!profile?.id || !circle?.id) {
      Alert.alert('No circle', 'Join a circle to log meals.')
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('meal_logs')
      .insert({
        user_id: profile.id,
        circle_id: circle.id,
        meal_type: mealType,
        food_name: foodName.trim(),
        calories: calories ? parseInt(calories) : null,
        protein_g: protein ? parseFloat(protein) : null,
        carbs_g: carbs ? parseFloat(carbs) : null,
        fat_g: fat ? parseFloat(fat) : null,
        notes: notes.trim() || null,
        xp_earned: 15,
      })
      .select()
      .single()

    if (error || !data) {
      setLoading(false)
      Alert.alert('Error', error?.message ?? 'Could not save meal.')
      return
    }

    await earn('meal', data.id, foodName.trim())
    setLoading(false)
    Alert.alert('Meal logged! 🥗', '+15 XP earned.', [{ text: 'Done', onPress: () => router.back() }])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Log Meal</Text>

      <View>
        <Text style={styles.label}>Meal Type</Text>
        <View style={styles.mealTypes}>
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.mealTypeChip, mealType === type && styles.mealTypeActive]}
              onPress={() => setMealType(type)}
            >
              <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Input label="Food / Meal Name" value={foodName} onChangeText={setFoodName} placeholder="e.g. Chicken rice bowl" autoCapitalize="words" />
      <Input label="Calories (optional)" value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="e.g. 450" />

      <Text style={styles.macrosLabel}>Macros (optional)</Text>
      <View style={styles.macrosRow}>
        <Input label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="0" style={styles.flex1} />
        <Input label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" placeholder="0" style={styles.flex1} />
        <Input label="Fat (g)" value={fat} onChangeText={setFat} keyboardType="decimal-pad" placeholder="0" style={styles.flex1} />
      </View>

      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Meal prep, restaurant name, etc." multiline />

      <Button label="Save Meal (+15 XP)" onPress={handleSave} loading={loading} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  label: { color: '#94A3B8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  mealTypes: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealTypeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  mealTypeActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  mealTypeText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  mealTypeTextActive: { color: '#fff' },
  macrosLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  macrosRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
})
