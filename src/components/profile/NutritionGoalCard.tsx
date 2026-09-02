import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { colors, radius, type } from '../../constants/theme'
import { recommendedNutritionTargets, type FitnessGoal } from '../../lib/energyEstimates'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'

const GOALS: { value: FitnessGoal; label: string; detail: string }[] = [
  { value: 'recomposition', label: 'Recomposition', detail: 'Lose fat + build muscle' },
  { value: 'lose_fat', label: 'Fat loss', detail: 'Preserve muscle' },
  { value: 'build_muscle', label: 'Build muscle', detail: 'Controlled surplus' },
  { value: 'maintain', label: 'Maintain', detail: 'Hold your ground' },
]

export function NutritionGoalCard() {
  const { profile, setProfile } = useAuthStore()
  const [goal, setGoal] = useState<FitnessGoal>('recomposition')
  const [mode, setMode] = useState<'recommended' | 'custom'>('recommended')
  const [customCalories, setCustomCalories] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setGoal(profile.fitness_goal ?? 'recomposition')
    setMode(profile.calorie_goal_mode ?? 'recommended')
    setCustomCalories(profile.custom_calorie_goal ? String(profile.custom_calorie_goal) : '')
  }, [profile])

  if (!profile) return null
  const recommendation = recommendedNutritionTargets(profile, goal)

  async function save() {
    if (!profile) return
    const custom = Number(customCalories)
    if (mode === 'custom' && (!Number.isFinite(custom) || custom < 800 || custom > 8000)) {
      return Alert.alert('Check calorie goal', 'Enter a daily goal between 800 and 8,000 kcal.')
    }
    setSaving(true)
    const { data, error } = await supabase.from('profiles').update({ fitness_goal: goal, calorie_goal_mode: mode, custom_calorie_goal: mode === 'custom' ? Math.round(custom) : null }).eq('id', profile.id).select('*').single()
    setSaving(false)
    if (error || !data) return Alert.alert('Could not save', error?.message ?? 'Please try again.')
    setProfile(data)
    Alert.alert('Game plan saved', 'Your Food Log targets are now updated.')
  }

  return <Card style={styles.card}>
    <View style={styles.header}><Ionicons name="flag-outline" size={19} color={colors.primary} /><View><Text style={styles.title}>Nutrition Game Plan</Text><Text style={styles.sub}>Tailored to your tale of the tape</Text></View></View>
    <Text style={styles.prompt}>What are you fighting for?</Text>
    <View style={styles.grid}>{GOALS.map(item => <TouchableOpacity key={item.value} style={[styles.choice, goal === item.value && styles.active]} onPress={() => setGoal(item.value)}><Text style={[styles.choiceLabel, goal === item.value && styles.activeText]}>{item.label}</Text><Text style={styles.sub}>{item.detail}</Text></TouchableOpacity>)}</View>
    <View style={styles.row}><TouchableOpacity style={[styles.mode, mode === 'recommended' && styles.active]} onPress={() => setMode('recommended')}><Text style={styles.modeLabel}>Recommended</Text><Text style={styles.sub}>Based on profile</Text></TouchableOpacity><TouchableOpacity style={[styles.mode, mode === 'custom' && styles.active]} onPress={() => setMode('custom')}><Text style={styles.modeLabel}>My own target</Text><Text style={styles.sub}>Set daily calories</Text></TouchableOpacity></View>
    {mode === 'custom' ? <View><Text style={styles.inputLabel}>DAILY CALORIE GOAL</Text><TextInput style={styles.input} value={customCalories} onChangeText={setCustomCalories} keyboardType="numeric" placeholder="e.g. 2,100" placeholderTextColor={colors.textMuted} /></View> : recommendation ? <View style={styles.recommendation}><Text style={styles.calories}>{recommendation.calories.toLocaleString()} kcal</Text><Text style={styles.protein}>{recommendation.proteinGrams}g protein / day</Text><Text style={styles.sub}>Logged exercise adjusts today’s calorie estimate.</Text></View> : <Text style={styles.missing}>Complete your measurements above to unlock a recommendation.</Text>}
    <Text style={styles.note}>Estimates are guidance, not medical advice. Adjust from your progress, recovery, and how you feel.</Text>
    <Button label="Save Game Plan" onPress={save} loading={saving} />
  </Card>
}

const styles = StyleSheet.create({
  card: { gap: 14 }, header: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '800', textTransform: 'uppercase' },
  prompt: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' }, sub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { width: '48%', padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  active: { borderColor: colors.primary, backgroundColor: colors.primaryGlow }, choiceLabel: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '800', textTransform: 'uppercase' }, activeText: { color: colors.primary },
  row: { flexDirection: 'row', gap: 8 }, mode: { flex: 1, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }, modeLabel: { color: colors.text, fontWeight: '800' },
  inputLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 6 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 14, color: colors.text, fontSize: 20, fontWeight: '800', backgroundColor: colors.surface },
  recommendation: { padding: 14, borderRadius: radius.sm, backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.primary }, calories: { color: colors.text, fontFamily: type.display, fontSize: 25, fontWeight: '900' }, protein: { color: colors.primary, fontSize: 14, fontWeight: '800', marginTop: 3 },
  missing: { color: colors.warning, fontSize: 12 }, note: { color: colors.textMuted, fontSize: 10, lineHeight: 15 },
})
