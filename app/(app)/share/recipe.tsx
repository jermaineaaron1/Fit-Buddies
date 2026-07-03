import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'

export default function ShareRecipeScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [title, setTitle] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [instructions, setInstructions] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [cost, setCost] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
      Alert.alert('Missing fields', 'Title, ingredients, and instructions are required.')
      return
    }
    if (!profile?.id || !circle?.id) {
      Alert.alert('No circle', 'Join a circle first.')
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: profile.id,
        circle_id: circle.id,
        title: title.trim(),
        ingredients: ingredients.trim(),
        instructions: instructions.trim(),
        calories_estimate: calories ? parseInt(calories) : null,
        protein_estimate: protein ? parseFloat(protein) : null,
        estimated_cost: cost ? parseFloat(cost) : null,
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      Alert.alert('Error', error.message)
      return
    }

    await earn('recipe', data.id, title.trim())
    setLoading(false)
    Alert.alert('Recipe shared! 🍳', '+25 XP earned.', [{ text: 'Done', onPress: () => router.back() }])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Share a Recipe</Text>
      <Input label="Recipe Title" value={title} onChangeText={setTitle} placeholder="e.g. High Protein Pasta" autoCapitalize="words" />
      <Input label="Ingredients" value={ingredients} onChangeText={setIngredients} placeholder="List ingredients here, one per line" multiline numberOfLines={4} />
      <Input label="Instructions" value={instructions} onChangeText={setInstructions} placeholder="Step-by-step instructions" multiline numberOfLines={6} />
      <View style={styles.row}>
        <Input label="Est. Calories" value={calories} onChangeText={setCalories} keyboardType="numeric" placeholder="kcal" style={styles.flex1} />
        <Input label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" placeholder="g" style={styles.flex1} />
        <Input label="Est. Cost ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" style={styles.flex1} />
      </View>
      <Button label="Share Recipe (+25 XP)" onPress={handleSave} loading={loading} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
})
