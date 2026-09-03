import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useCircleStore } from '../../store/circleStore'
import { useXP } from '../../hooks/useXP'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AnimatedScreen } from '../ui/AnimatedScreen'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { CompactCard } from '../ui/CompactCard'
import { CompactButton } from '../ui/CompactButton'
import { IconButton } from '../ui/IconButton'
import { SectionHeader } from '../ui/SectionHeader'
import { SegmentedControl } from '../ui/SegmentedControl'
import { NumericInput } from '../ui/NumericInput'
import { TextField } from '../ui/TextField'
import { UnitSelector } from '../ui/UnitSelector'
import { Chip } from '../ui/Chip'
import { EmptyState } from '../ui/EmptyState'
import { FoodPickerModal } from '../pickers/FoodPickerModal'
import type { RecentFood } from '../pickers/FoodAutosuggest'
import { PlateScanReview } from './PlateScanReview'
import { EnergyCorner } from './EnergyCorner'
import { completeQuestByType } from '../../lib/completeQuest'
import { analyseMealPhoto } from '../../lib/mealPhoto'
import { pickPhoto, type PhotoSource } from '../../lib/photoPicker'
import { toReviewItems, reviewItemFromFood, type ReviewItem } from '../../lib/plateReview'
import { scaleFoodMacros, type FoodResult } from '../../lib/openFoodFacts'
import { toGrams, gramHint, type QuantityUnit } from '../../lib/units'
import { estimateWorkoutCalories, recommendedNutritionTargets } from '../../lib/energyEstimates'
import { colors, layout, radius, type } from '../../constants/theme'

const MEAL_TYPES = [
  { value: 'breakfast' as const, label: 'Breakfast' },
  { value: 'lunch' as const, label: 'Lunch' },
  { value: 'dinner' as const, label: 'Dinner' },
  { value: 'snack' as const, label: 'Snack' },
]
export type MealType = typeof MEAL_TYPES[number]['value']

interface PlaylistItem {
  key: string
  name: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  quantity: number | null
  unit: QuantityUnit | null
  estimatedGrams: number | null
  offFoodId: string | null
  imageUrl: string | null
  photoPath?: string | null
}

interface MealLoggerProps {
  /** Opens straight into the camera or the food search. */
  initialAction?: 'scan' | 'search' | null
  /** Pre-fills from a previously logged food of this name. */
  repeatName?: string | null
  initialMealType?: MealType
  /** Where to go after a successful save. Defaults to router.back(). */
  onSaved?: () => void
}

let itemSeed = 0
const nextKey = () => `meal-${(itemSeed += 1)}`

/**
 * The whole food-logging experience, in one component so the Fuel tab and the
 * /log/meal route share an implementation rather than drifting apart.
 *
 * Three ways in, deliberately given equal billing on the opening screen:
 * photograph it, pick it from the gallery, or search the food database. Most
 * logging fails because it is tedious, so the first screen is the choice
 * itself — not a form.
 */
export function MealLogger({
  initialAction = null, repeatName = null, initialMealType = 'lunch', onSaved,
}: MealLoggerProps) {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [mode, setMode] = useState<'entry' | 'review'>('entry')
  const [mealType, setMealType] = useState<MealType>(initialMealType)

  // The food currently being adjusted before it joins the meal.
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState<QuantityUnit>('g')
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null)
  const [macrosDirty, setMacrosDirty] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  /** True while the picker is being used to add to a scan rather than the meal. */
  const [pickerAddsToScan, setPickerAddsToScan] = useState(false)

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [photoPath, setPhotoPath] = useState<string | null>(null)

  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [dailyCalories, setDailyCalories] = useState(0)
  const [dailyProtein, setDailyProtein] = useState(0)
  const [exerciseCalories, setExerciseCalories] = useState(0)
  const [handledInitial, setHandledInitial] = useState(false)

  const recommendation = profile
    ? recommendedNutritionTargets(profile, profile.fitness_goal ?? 'recomposition', exerciseCalories)
    : null
  const calorieGoal = profile?.calorie_goal_mode === 'custom' && profile.custom_calorie_goal
    ? profile.custom_calorie_goal
    : recommendation?.calories ?? null

  // Queued items count toward today as soon as they are added, not only once
  // saved — otherwise scanning a meal moves nothing on screen.
  const pendingCalories = playlist.reduce((sum, item) => sum + (item.calories ?? 0), 0) + (Number(calories) || 0)
  const pendingProtein = playlist.reduce((sum, item) => sum + (item.protein ?? 0), 0) + (Number(protein) || 0)

  const loadTotals = useCallback(async () => {
    if (!profile?.id) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const [mealsResult, workoutsResult] = await Promise.all([
      supabase.from('meal_logs').select('calories, protein_g').eq('user_id', profile.id).gte('logged_at', start.toISOString()),
      supabase.from('workouts')
        .select('duration_minutes, difficulty, exercises:workout_exercises(exercise_type, duration_seconds, sets, cardio_intensity)')
        .eq('user_id', profile.id).gte('logged_at', start.toISOString()),
    ])
    setDailyCalories((mealsResult.data ?? []).reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0))
    setDailyProtein((mealsResult.data ?? []).reduce((sum, meal) => sum + Number(meal.protein_g ?? 0), 0))
    setExerciseCalories((workoutsResult.data ?? []).reduce(
      (sum, workout: any) => sum + estimateWorkoutCalories(profile.weight_kg, workout.duration_minutes, workout.difficulty, workout.exercises ?? []),
      0,
    ))
  }, [profile?.id, profile?.weight_kg])

  useEffect(() => { loadTotals() }, [loadTotals])

  // Your own food vocabulary, most-recent-first and de-duplicated by name.
  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    supabase
      .from('meal_logs')
      .select('food_name, calories, protein_g, carbs_g, fat_g, quantity, quantity_unit, food_image_url')
      .eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(60)
      .then(({ data }) => {
        if (cancelled) return
        const seen = new Set<string>()
        const out: RecentFood[] = []
        for (const row of data ?? []) {
          const key = (row.food_name ?? '').trim().toLowerCase()
          if (!key || seen.has(key)) continue
          seen.add(key)
          out.push({
            name: row.food_name.trim(),
            calories: row.calories,
            protein: row.protein_g,
            carbs: row.carbs_g,
            fat: row.fat_g,
            quantity: row.quantity,
            unit: (row.quantity_unit as QuantityUnit | null) ?? null,
            imageUrl: row.food_image_url,
          })
        }
        setRecentFoods(out)
      })
    return () => { cancelled = true }
  }, [profile?.id])

  // Honour an entry point exactly once, so a re-render never reopens the
  // camera over a form the user is already filling in.
  useEffect(() => {
    if (handledInitial || !profile?.id) return
    if (repeatName) {
      const match = recentFoods.find((food) => food.name.toLowerCase() === repeatName.toLowerCase())
      if (!match) return // recents may not have loaded yet
      setHandledInitial(true)
      applyRecentFood(match)
      return
    }
    if (initialAction === 'search') { setHandledInitial(true); setPickerVisible(true) }
    else if (initialAction === 'scan') { setHandledInitial(true); capture('camera') }
  }, [handledInitial, initialAction, repeatName, recentFoods, profile?.id])

  // Re-derive macros from the picked food when quantity or unit change, unless
  // a macro has since been hand-edited.
  useEffect(() => {
    if (!selectedFood || macrosDirty) return
    const parsed = parseFloat(quantity)
    const scaled = scaleFoodMacros(selectedFood, Number.isNaN(parsed) ? 0 : parsed, unit as never)
    setCalories(scaled.calories !== null ? String(scaled.calories) : '')
    setProtein(scaled.protein !== null ? String(scaled.protein) : '')
    setCarbs(scaled.carbs !== null ? String(scaled.carbs) : '')
    setFat(scaled.fat !== null ? String(scaled.fat) : '')
  }, [selectedFood, quantity, unit, macrosDirty])

  async function capture(source: PhotoSource) {
    if (!profile?.id) return
    setScanError(null)
    const picked = await pickPhoto(source)
    if (!picked) return // cancelled
    if (picked.reason) { setScanError(picked.reason); return }
    if (!picked.uri) return

    setPhotoUri(picked.uri)
    setScanning(true)
    const outcome = await analyseMealPhoto(picked.uri, profile.id, recentFoods.map((food) => food.name))
    setScanning(false)
    if (!outcome.ok) { setScanError(outcome.error); return }
    if (!outcome.analysis.items.length) {
      setScanError(outcome.analysis.notes || 'No food was recognised in that photo. Try a clearer shot, or search for it instead.')
      return
    }
    setReviewItems(toReviewItems(outcome.analysis.items))
    setPhotoPath(outcome.analysis.photoPath)
    setMode('review')
  }

  function confirmScan(items: ReviewItem[]) {
    setPlaylist((current) => [
      ...current,
      ...items.map((item) => ({
        key: nextKey(),
        name: item.name,
        calories: item.macros.calories || null,
        protein: item.macros.protein || null,
        carbs: item.macros.carbs || null,
        fat: item.macros.fat || null,
        quantity: item.quantity,
        unit: item.unit,
        estimatedGrams: item.grams,
        offFoodId: null,
        imageUrl: null,
        photoPath,
      })),
    ])
    discardScan()
  }

  function discardScan() {
    setMode('entry'); setReviewItems([]); setPhotoUri(null); setPhotoPath(null); setScanError(null)
  }

  function applyRecentFood(food: RecentFood) {
    // Re-logging restores the exact portion and macros, not per-100g reference
    // values — meal_logs stores what was eaten, not a scalable base.
    setSelectedFood(null)
    setFoodName(food.name)
    setMacrosDirty(true)
    setCalories(food.calories !== null ? String(food.calories) : '')
    setProtein(food.protein !== null ? String(food.protein) : '')
    setCarbs(food.carbs !== null ? String(food.carbs) : '')
    setFat(food.fat !== null ? String(food.fat) : '')
    if (food.quantity !== null) setQuantity(String(food.quantity))
    if (food.unit) setUnit(food.unit)
  }

  function handleSelectFood(food: FoodResult) {
    setPickerVisible(false)
    // The same picker serves two jobs: adding a food to the meal, and adding a
    // missed ingredient to a scan that is mid-review.
    if (pickerAddsToScan) {
      setPickerAddsToScan(false)
      setReviewItems((current) => [...current, reviewItemFromFood(food)])
      return
    }
    setSelectedFood(food)
    setFoodName(food.name)
    setMacrosDirty(false)
    if (food.servingGrams) { setQuantity('1'); setUnit('serving') }
  }

  function currentItem(): PlaylistItem | null {
    if (!foodName.trim()) return null
    const parsedQuantity = quantity ? parseFloat(quantity) : null
    return {
      key: nextKey(),
      name: foodName.trim(),
      calories: calories ? Math.round(parseFloat(calories)) : null,
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
      quantity: parsedQuantity,
      unit: parsedQuantity ? unit : null,
      estimatedGrams: parsedQuantity ? toGrams(parsedQuantity, unit, selectedFood?.servingGrams) : null,
      offFoodId: selectedFood?.code ?? null,
      imageUrl: selectedFood?.imageUrl ?? null,
    }
  }

  function clearDraft() {
    setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
    setSelectedFood(null); setQuantity('100'); setUnit('g'); setMacrosDirty(false)
  }

  function addToMeal() {
    const item = currentItem()
    if (!item) { setSaveError('Pick a food before adding it.'); return }
    setSaveError(null)
    setPlaylist((current) => [...current, item])
    clearDraft()
  }

  async function handleSave() {
    setSaveError(null)
    const pending = currentItem()
    const items = pending ? [...playlist, pending] : playlist
    if (!items.length) { setSaveError('Add at least one food before saving.'); return }
    if (!profile?.id || !circle?.id) { setSaveError('You need to be in a circle to log a meal.'); return }

    setSaving(true)
    const { data, error } = await supabase
      .from('meal_logs')
      .insert(items.map((item) => ({
        user_id: profile.id,
        circle_id: circle.id,
        meal_type: mealType,
        food_name: item.name,
        calories: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs,
        fat_g: item.fat,
        notes: notes.trim() || null,
        xp_earned: 15,
        quantity: item.quantity,
        quantity_unit: item.unit,
        estimated_grams: item.estimatedGrams,
        off_food_id: item.offFoodId,
        food_image_url: item.imageUrl,
        photo_path: item.photoPath ?? null,
      })))
      .select()

    if (error || !data?.length) {
      setSaving(false)
      setSaveError(error?.message ?? 'Could not save meal.')
      return
    }

    await earn('meal', data[0].id, items.length > 1 ? `${mealType} · ${items.length} items` : items[0].name)
    await completeQuestByType('meal', profile.id, circle.id, earn)
    setSaving(false)

    // Reset rather than navigate when hosted as a tab — there is nothing to go
    // back to, and the next meal is logged from the same screen.
    setPlaylist([]); clearDraft(); setNotes('')
    await loadTotals()
    if (onSaved) onSaved()
    else router.back()
  }

  // ---- Scan review ------------------------------------------------------
  if (mode === 'review') {
    return <>
      <View style={styles.reviewHead}>
        <IconButton icon="arrow-back" onPress={discardScan} accessibilityLabel="Back without saving this scan" />
        <Text style={styles.reviewTitle}>Review scan</Text>
      </View>
      <PlateScanReview
        photoUri={photoUri}
        items={reviewItems}
        onChange={setReviewItems}
        onConfirm={confirmScan}
        onDiscard={discardScan}
        onAddFromDatabase={() => { setPickerAddsToScan(true); setPickerVisible(true) }}
      />
      <FoodPickerModal
        visible={pickerVisible}
        onClose={() => { setPickerVisible(false); setPickerAddsToScan(false) }}
        onSelect={handleSelectFood}
      />
    </>
  }

  // ---- Entry ------------------------------------------------------------
  const draftActive = !!foodName.trim()

  return <>
    <AnimatedScreen>
      <SegmentedControl
        segments={MEAL_TYPES}
        value={mealType}
        onChange={setMealType}
        tone="gold"
        scrollable
        accessibilityLabel="Which meal is this"
      />
    </AnimatedScreen>

    {/* The three ways in, given equal billing. This is the whole point of the
        screen: choose how to log, not fill in a form. */}
    <AnimatedScreen delay={40}>
      <View style={styles.actions}>
        {/* The camera gets its own row: it is the fastest way in and the one
            worth a thumb-sized target. The other two split the row below. */}
        <ActionTile
          wide
          icon="camera"
          title="Scan your plate"
          subtitle="Photograph it and get an editable estimate"
          tone={colors.primary}
          busy={scanning}
          onPress={() => capture('camera')}
        />
        <View style={styles.actionRow}>
          <ActionTile
            icon="images"
            title="Gallery"
            subtitle="Use a photo you already took"
            tone={colors.gold}
            busy={scanning}
            onPress={() => capture('library')}
          />
          <ActionTile
            icon="search"
            title="Search"
            subtitle="Find it in the food database"
            tone={colors.cornerBlue}
            onPress={() => { setPickerAddsToScan(false); setPickerVisible(true) }}
          />
        </View>
      </View>
    </AnimatedScreen>

    {scanning && (
      <CompactCard accent="gold">
        <View style={styles.scanningRow}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.scanThumb} contentFit="cover" /> : null}
          <View style={styles.flex1}>
            <Text style={styles.scanningTitle}>Reading your plate…</Text>
            <Text style={styles.scanningCopy}>You will be able to correct every item before anything is saved.</Text>
          </View>
        </View>
      </CompactCard>
    )}

    {scanError ? (
      <View style={styles.error} accessibilityRole="alert">
        <Ionicons name="alert-circle" size={14} color={colors.danger} />
        <Text style={styles.errorText}>{scanError}</Text>
      </View>
    ) : null}

    {/* The food being adjusted before it joins the meal. */}
    {draftActive && (
      <AnimatedScreen>
        <CompactCard accent="gold" style={styles.draftCard}>
          <View style={styles.draftHead}>
            {selectedFood?.imageUrl ? (
              <Image source={{ uri: selectedFood.imageUrl }} style={styles.draftThumb} contentFit="cover" />
            ) : null}
            <View style={styles.flex1}>
              <Text style={styles.draftName} numberOfLines={2}>{foodName}</Text>
              <Text style={styles.draftMeta}>{Number(calories) || 0} kcal · {Number(protein) || 0} g protein</Text>
            </View>
            <IconButton icon="close" size="sm" onPress={clearDraft} accessibilityLabel="Discard this food" />
          </View>

          <View style={styles.quantityRow}>
            <NumericInput
              label="How much"
              value={quantity}
              onChangeText={setQuantity}
              step={unit === 'g' || unit === 'ml' ? 10 : 0.5}
              min={0}
              style={styles.quantityField}
            />
            <View style={styles.unitField}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <UnitSelector value={unit} onChange={setUnit} />
            </View>
          </View>
          {gramHint(Number(quantity) || 0, unit, selectedFood?.servingGrams) ? (
            <Text style={styles.hint}>{gramHint(Number(quantity) || 0, unit, selectedFood?.servingGrams)}</Text>
          ) : null}

          <View style={styles.macroGrid}>
            <NumericInput label="Calories" value={calories} integer style={styles.macroField}
              onChangeText={(value) => { setMacrosDirty(true); setCalories(value) }} />
            <NumericInput label="Protein g" value={protein} style={styles.macroField}
              onChangeText={(value) => { setMacrosDirty(true); setProtein(value) }} />
            <NumericInput label="Carbs g" value={carbs} style={styles.macroField}
              onChangeText={(value) => { setMacrosDirty(true); setCarbs(value) }} />
            <NumericInput label="Fat g" value={fat} style={styles.macroField}
              onChangeText={(value) => { setMacrosDirty(true); setFat(value) }} />
          </View>

          <CompactButton label="Add to this meal" icon="add" tone="gold" block onPress={addToMeal} />
        </CompactCard>
      </AnimatedScreen>
    )}

    {/* One tap to re-log something you eat often. */}
    {!draftActive && recentFoods.length > 0 && (
      <AnimatedScreen delay={70}>
        <View style={styles.section}>
          <SectionHeader title="Log again" meta="Tap to reuse" />
          <View style={styles.recentWrap}>
            {recentFoods.slice(0, 6).map((food) => (
              <AnimatedPressable
                key={food.name}
                style={styles.recentChip}
                onPress={() => applyRecentFood(food)}
                accessibilityRole="button"
                accessibilityLabel={`Log ${food.name} again, ${food.calories ?? 'unknown'} calories`}
              >
                <Text style={styles.recentName} numberOfLines={1}>{food.name}</Text>
                <Text style={styles.recentMeta}>{food.calories ?? '—'} kcal</Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>
      </AnimatedScreen>
    )}

    {playlist.length > 0 && (
      <AnimatedScreen>
        <View style={styles.section}>
          <SectionHeader title="This meal" meta={`${playlist.length} item${playlist.length === 1 ? '' : 's'}`} />
          <CompactCard padded={false} style={styles.listCard}>
            {playlist.map((item, index) => (
              <View key={item.key} style={styles.listRow}>
                <Text style={styles.listIndex}>{index + 1}</Text>
                <View style={styles.flex1}>
                  <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.listMeta} numberOfLines={1}>
                    {item.quantity ? `${item.quantity} ${item.unit ?? ''} · ` : ''}
                    {item.calories ?? '—'} kcal · {item.protein ?? '—'} g protein
                  </Text>
                </View>
                <IconButton
                  icon="close" size="sm"
                  onPress={() => setPlaylist((current) => current.filter((entry) => entry.key !== item.key))}
                  accessibilityLabel={`Remove ${item.name}`}
                />
              </View>
            ))}
          </CompactCard>
          <TextField
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes — restaurant, meal prep…"
            accessibilityLabel="Meal notes"
          />
        </View>
      </AnimatedScreen>
    )}

    {saveError ? (
      <View style={styles.error} accessibilityRole="alert">
        <Ionicons name="alert-circle" size={14} color={colors.danger} />
        <Text style={styles.errorText}>{saveError}</Text>
      </View>
    ) : null}

    {(playlist.length > 0 || draftActive) && (
      <CompactButton
        label={`Log ${mealType} · 15 XP`}
        tone="primary"
        icon="checkmark"
        block
        loading={saving}
        onPress={handleSave}
      />
    )}

    <AnimatedScreen delay={100}>
      {calorieGoal && recommendation ? (
        <EnergyCorner
          loggedCalories={dailyCalories}
          pendingCalories={pendingCalories}
          calorieGoal={calorieGoal}
          maintenance={recommendation.maintenance}
          exerciseCalories={exerciseCalories}
          loggedProtein={dailyProtein}
          pendingProtein={pendingProtein}
          proteinGoal={recommendation.proteinGrams}
          isCustomGoal={profile?.calorie_goal_mode === 'custom'}
        />
      ) : (
        <EmptyState
          icon="person-circle-outline"
          title="Add your measurements"
          message="Height, weight, age and gender unlock your calorie window."
          actionLabel="Profile"
          onAction={() => router.push('/(app)/profile' as never)}
          tone="red"
        />
      )}
    </AnimatedScreen>

    <FoodPickerModal
      visible={pickerVisible}
      onClose={() => { setPickerVisible(false); setPickerAddsToScan(false) }}
      onSelect={handleSelectFood}
    />
  </>
}

function ActionTile({
  icon, title, subtitle, tone, onPress, busy = false, wide = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  tone: string
  onPress: () => void
  busy?: boolean
  /** Lays out horizontally across the full row, for the primary action. */
  wide?: boolean
}) {
  return (
    <AnimatedPressable
      style={[wide ? styles.tileWide : styles.tile, { borderColor: tone }]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      accessibilityState={{ disabled: busy }}
    >
      <View style={[styles.tileIcon, { backgroundColor: tone + '1F', borderColor: tone }]}>
        <Ionicons name={icon} size={wide ? 22 : 19} color={tone} />
      </View>
      <View style={wide ? styles.tileWideCopy : styles.tileCopy}>
        <Text style={[styles.tileTitle, wide && styles.tileTitleWide]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.tileSub, wide && styles.tileSubWide]} numberOfLines={2}>{subtitle}</Text>
      </View>
      {wide ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  section: { gap: 8 },
  actions: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1, minWidth: 0, alignItems: 'center', gap: 4,
    paddingVertical: 13, paddingHorizontal: 8,
    borderRadius: radius.sm, borderWidth: 1, backgroundColor: colors.card,
  },
  tileWide: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 13, minHeight: 68,
    borderRadius: radius.sm, borderWidth: 1, backgroundColor: colors.card,
  },
  tileCopy: { alignItems: 'center', gap: 2 },
  tileWideCopy: { flex: 1, minWidth: 0, gap: 2 },
  tileIcon: {
    width: 40, height: 40, borderRadius: radius.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  tileTitle: {
    color: colors.text, fontFamily: type.display, fontSize: 12.5, fontWeight: '900',
    textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center',
  },
  tileTitleWide: { fontSize: 17, textAlign: 'left', letterSpacing: 0.4 },
  tileSub: { color: colors.textMuted, fontSize: 9.5, lineHeight: 13, textAlign: 'center' },
  tileSubWide: { fontSize: 11, lineHeight: 15, textAlign: 'left' },
  scanningRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  scanThumb: { width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.surface },
  scanningTitle: { color: colors.gold, fontFamily: type.display, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  scanningCopy: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  draftCard: { gap: 10 },
  draftHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  draftThumb: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.surface },
  draftName: { color: colors.text, fontFamily: type.display, fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  draftMeta: { color: colors.gold, fontSize: 11, marginTop: 2 },
  quantityRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  quantityField: { width: 132 },
  unitField: { flex: 1, gap: 4, minWidth: 0 },
  fieldLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  hint: { color: colors.cornerBlue, fontSize: 10.5, marginTop: -4 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // flexBasis forces a tidy 2x2 rather than three across and one orphaned.
  macroField: { flexGrow: 1, flexBasis: 130 },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recentChip: {
    paddingHorizontal: 11, paddingVertical: 7, minHeight: layout.touch - 6,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.gold, backgroundColor: colors.card,
    maxWidth: 190,
  },
  recentName: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  recentMeta: { color: colors.textMuted, fontSize: 10 },
  listCard: { paddingHorizontal: 11 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  listIndex: { width: 16, color: colors.gold, fontFamily: type.display, fontSize: 13, fontWeight: '900' },
  listName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  listMeta: { color: colors.textMuted, fontSize: 10.5, marginTop: 1 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewTitle: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
})
