import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../ui/Button'
import { pickMealPhoto, analyseMealPhoto, type EstimatedItem, type PhotoAnalysis } from '../../lib/mealPhoto'
import { colors, radius, type } from '../../constants/theme'

interface MealPhotoCaptureProps {
  userId: string
  /** Names this person logs often — passed as candidates to improve identification. */
  recentFoods?: string[]
  onConfirm: (items: EstimatedItem[], photoPath: string) => void
}

const CONFIDENCE_COLOR: Record<EstimatedItem['confidence'], string> = {
  high: colors.gold,
  medium: colors.accent,
  low: colors.danger,
}

export function MealPhotoCapture({ userId, recentFoods = [], onConfirm }: MealPhotoCaptureProps) {
  const [previewUri, setPreviewUri] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null)
  // Kept alongside the edited items so changing the weight can rescale macros
  // from the original estimate rather than compounding rounding each edit.
  const [original, setOriginal] = useState<EstimatedItem[]>([])

  async function capture(source: 'camera' | 'library') {
    setError(null)
    const picked = await pickMealPhoto(source)
    if (!picked) return // cancelled
    if (picked.reason) { setError(picked.reason); return }
    const uri = picked.uri
    if (!uri) return

    setPreviewUri(uri)
    setBusy(true)
    const outcome = await analyseMealPhoto(uri, userId, recentFoods)
    setBusy(false)

    if (!outcome.ok) { setError(outcome.error); return }
    if (!outcome.analysis.items.length) {
      setError(outcome.analysis.notes || 'No food was recognised in that photo.')
      return
    }
    setAnalysis(outcome.analysis)
    setOriginal(outcome.analysis.items)
  }

  function updateGrams(index: number, raw: string) {
    const grams = Number(raw)
    setAnalysis((current) => {
      if (!current) return current
      const items = [...current.items]
      const base = original[index]
      if (!Number.isFinite(grams) || grams <= 0 || !base.estimated_grams) {
        items[index] = { ...items[index], estimated_grams: Number.isFinite(grams) ? grams : 0 }
        return { ...current, items }
      }
      const factor = grams / base.estimated_grams
      items[index] = {
        ...items[index],
        estimated_grams: grams,
        calories: Math.round(base.calories * factor),
        protein_g: Math.round(base.protein_g * factor * 10) / 10,
        carbs_g: Math.round(base.carbs_g * factor * 10) / 10,
        fat_g: Math.round(base.fat_g * factor * 10) / 10,
      }
      return { ...current, items }
    })
  }

  function updateName(index: number, name: string) {
    setAnalysis((current) => {
      if (!current) return current
      const items = [...current.items]
      items[index] = { ...items[index], name }
      return { ...current, items }
    })
  }

  function removeItem(index: number) {
    setAnalysis((current) => {
      if (!current) return current
      return { ...current, items: current.items.filter((_, i) => i !== index) }
    })
    setOriginal((current) => current.filter((_, i) => i !== index))
  }

  function reset() {
    setAnalysis(null); setPreviewUri(null); setError(null); setOriginal([])
  }

  if (!analysis) {
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Ionicons name="camera" size={17} color={colors.gold} />
          <View style={styles.flex1}>
            <Text style={styles.eyebrow}>SNAP IT INSTEAD</Text>
            <Text style={styles.title}>Log by Photo</Text>
          </View>
        </View>
        <Text style={styles.blurb}>
          Take a picture of your plate and get an estimate you can adjust. No weighing, no recipe.
        </Text>

        {previewUri && busy && (
          <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" />
        )}

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Reading your plate…</Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={() => capture('camera')} accessibilityRole="button">
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
              <Text style={styles.actionText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.action} onPress={() => capture('library')} accessibilityRole="button">
              <Ionicons name="images-outline" size={18} color={colors.primary} />
              <Text style={styles.actionText}>From library</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={15} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    )
  }

  const totalCalories = analysis.items.reduce((sum, item) => sum + (item.calories || 0), 0)

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={17} color={colors.gold} />
        <View style={styles.flex1}>
          <Text style={styles.eyebrow}>ESTIMATE · CHECK BEFORE SAVING</Text>
          <Text style={styles.title}>{Math.round(totalCalories)} kcal on the plate</Text>
        </View>
        <TouchableOpacity onPress={reset} accessibilityLabel="Discard this estimate">
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {!!analysis.notes && <Text style={styles.notes}>{analysis.notes}</Text>}

      {analysis.items.map((item, index) => (
        <View key={index} style={styles.item}>
          <View style={styles.itemHead}>
            <TextInput
              style={styles.nameInput}
              value={item.name}
              onChangeText={(value) => updateName(index, value)}
              placeholderTextColor={colors.textMuted}
            />
            <View style={[styles.badge, { borderColor: CONFIDENCE_COLOR[item.confidence] }]}>
              <Text style={[styles.badgeText, { color: CONFIDENCE_COLOR[item.confidence] }]}>
                {item.confidence.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeItem(index)} accessibilityLabel={`Remove ${item.name}`}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>

          <Text style={styles.portion}>
            {item.portion_description}
            {item.cooking_method && item.cooking_method !== 'unclear' ? ` · ${item.cooking_method}` : ''}
            {item.matchedFood ? ' · macros from food table' : ' · macros estimated'}
          </Text>

          {/* Portion is where nearly all the error lives, so show what the
              estimate was anchored to and how wide the plausible range is. */}
          {(item.size_reference || item.grams_min) && (
            <Text style={styles.reference}>
              {item.size_reference ? `Scaled against ${item.size_reference}` : ''}
              {item.grams_min && item.grams_max
                ? `${item.size_reference ? ' · ' : ''}likely ${Math.round(item.grams_min)}–${Math.round(item.grams_max)}g`
                : ''}
            </Text>
          )}

          <View style={styles.gramsRow}>
            <Text style={styles.gramsLabel}>GRAMS</Text>
            <TextInput
              style={styles.gramsInput}
              value={String(item.estimated_grams ?? '')}
              onChangeText={(value) => updateGrams(index, value)}
              keyboardType="numeric"
            />
            <Text style={styles.macros}>
              {Math.round(item.calories)} kcal · P {item.protein_g} · C {item.carbs_g} · F {item.fat_g}
            </Text>
          </View>
        </View>
      ))}

      <Button
        label={`Add ${analysis.items.length} ${analysis.items.length === 1 ? 'item' : 'items'} to meal`}
        onPress={() => { onConfirm(analysis.items, analysis.photoPath); reset() }}
        disabled={!analysis.items.length}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: 11, padding: 14, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#1A1508',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  flex1: { flex: 1 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase' },
  blurb: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  notes: { color: colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  preview: { width: '100%', height: 140, borderRadius: radius.sm, backgroundColor: colors.card },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  muted: { color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9 },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryGlow,
  },
  actionText: { color: colors.text, fontFamily: type.display, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  item: {
    gap: 5, padding: 10, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1, color: colors.text, fontFamily: type.display, fontSize: 15,
    fontWeight: '800', textTransform: 'uppercase', paddingVertical: 2,
  },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  portion: { color: colors.textMuted, fontSize: 11 },
  reference: { color: colors.steel, fontSize: 10, fontStyle: 'italic' },
  gramsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  gramsLabel: { color: colors.textMuted, fontSize: 9, letterSpacing: 0.7 },
  gramsInput: {
    width: 64, color: colors.text, fontSize: 13, fontWeight: '700',
    borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  macros: { flex: 1, color: colors.textSecondary, fontSize: 11 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { color: colors.text, fontSize: 12, flex: 1 },
})
