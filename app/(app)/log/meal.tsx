import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { IconButton } from '../../../src/components/ui/IconButton'
import { SectionHeader } from '../../../src/components/ui/SectionHeader'
import { SegmentedControl } from '../../../src/components/ui/SegmentedControl'
import { NumericInput } from '../../../src/components/ui/NumericInput'
import { TextField } from '../../../src/components/ui/TextField'
import { UnitSelector } from '../../../src/components/ui/UnitSelector'
import { Chip } from '../../../src/components/ui/Chip'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { PhotoPicker } from '../../../src/components/ui/PhotoPicker'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import { FoodPickerModal } from '../../../src/components/pickers/FoodPickerModal'
import { FoodAutosuggest, type RecentFood } from '../../../src/components/pickers/FoodAutosuggest'
import { PlateScanReview } from '../../../src/components/nutrition/PlateScanReview'
import { EnergyCorner } from '../../../src/components/nutrition/EnergyCorner'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { analyseMealPhoto } from '../../../src/lib/mealPhoto'
import { toReviewItems, type ReviewItem } from '../../../src/lib/plateReview'
import { scaleFoodMacros, type FoodResult } from '../../../src/lib/openFoodFacts'
import { toGrams, gramHint, type QuantityUnit } from '../../../src/lib/units'
import { estimateWorkoutCalories, recommendedNutritionTargets } from '../../../src/lib/energyEstimates'
import { colors, radius, type } from '../../../src/constants/theme'

const MEAL_TYPES = [
  { value: 'breakfast' as const, label: 'Breakfast' },
  { value: 'lunch' as const, label: 'Lunch' },
  { value: 'dinner' as const, label: 'Dinner' },
  { value: 'snack' as const, label: 'Snack' },
]
type MealType = typeof MEAL_TYPES[number]['value']

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

type Mode = 'entry' | 'review'

let itemSeed = 0
const nextKey = () => `meal-${(itemSeed += 1)}`

export default function LogMealScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string; repeat?: string; meal?: string }>()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [mode, setMode] = useState<Mode>('entry')
  const [mealType, setMealType] = useState<MealType>((params.meal as MealType) ?? 'lunch')

  // Manual entry
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
  const [manualOpen, setManualOpen] = useState(false)

  // Photo scan
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
  const [prefilled, setPrefilled] = useState(false)

  const recommendation = profile
    ? recommendedNutritionTargets(profile, profile.fitness_goal ?? 'recomposition', exerciseCalories)
    : null
  const calorieGoal = profile?.calorie_goal_mode === 'custom' && profile.custom_calorie_goal
    ? profile.custom_calorie_goal
    : recommendation?.calories ?? null

  // Queued items count toward today as soon as they are added, not only after
  // saving — otherwise scanning a meal moves nothing on screen.
  const pendingCalories = playlist.reduce((sum, item) => sum + (item.calories ?? 0), 0) + (Number(calories) || 0)
  const pendingProtein = playlist.reduce((sum, item) => sum + (item.protein ?? 0), 0) + (Number(protein) || 0)

  useEffect(() => {
    if (!profile?.id) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    Promise.all([
      supabase.from('meal_logs').select('calories, protein_g').eq('user_id', profile.id).gte('logged_at', start.toISOString()),
      supabase.from('workouts')
        .select('duration_minutes, difficulty, exercises:workout_exercises(exercise_type, duration_seconds, sets, cardio_intensity)')
        .eq('user_id', profile.id).gte('logged_at', start.toISOString()),
    ]).then(([mealsResult, workoutsResult]) => {
      setDailyCalories((mealsResult.data ?? []).reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0))
      setDailyProtein((mealsResult.data ?? []).reduce((sum, meal) => sum + Number(meal.protein_g ?? 0), 0))
      setExerciseCalories((workoutsResult.data ?? []).reduce(
        (sum, workout: any) => sum + estimateWorkoutCalories(profile.weight_kg, workout.duration_minutes, workout.difficulty, workout.exercises ?? []),
        0,
      ))
    })
  }, [profile?.id, profile?.weight_kg])

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

  // Quick Log's "repeat recent meal" arrives as a name; fill the form from the
  // matching recent entry once it has loaded.
  useEffect(() => {
    if (prefilled || !params.repeat || !recentFoods.length) return
    const match = recentFoods.find((food) => food.name.toLowerCase() === String(params.repeat).toLowerCase())
    if (!match) return
    setPrefilled(true)
    setManualOpen(true)
    handlePickRecentFood(match)
  }, [params.repeat, recentFoods, prefilled])

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

  const startedScanning = params.mode === 'scan'
  useEffect(() => { if (startedScanning) setManualOpen(false) }, [startedScanning])

  async function runScan(uri: string) {
    if (!profile?.id) return
    setPhotoUri(uri)
    setScanning(true)
    setScanError(null)
    const outcome = await analyseMealPhoto(uri, profile.id, recentFoods.map((food) => food.name))
    setScanning(false)
    if (!outcome.ok) { setScanError(outcome.error); return }
    if (!outcome.analysis.items.length) {
      setScanError(outcome.analysis.notes || 'No food was recognised in that photo.')
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

  function handlePickRecentFood(food: RecentFood) {
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
    setManualOpen(true)
  }

  function handleSelectFood(food: FoodResult) {
    setSelectedFood(food)
    setFoodName(food.name)
    setMacrosDirty(false)
    if (food.servingGrams) { setQuantity('1'); setUnit('serving') }
    setPickerVisible(false)
    setManualOpen(true)
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

  function addToPlaylist() {
    const item = currentItem()
    if (!item) { setSaveError('Search for a food or enter one before adding it.'); return }
    setSaveError(null)
    setPlaylist((current) => [...current, item])
    setFoodName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('')
    setSelectedFood(null); setQuantity('100'); setUnit('g'); setMacrosDirty(false)
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
    // Alert.alert's callbacks never fire on web, so navigate directly.
    router.back()
  }

  const lastMeal = recentFoods[0] ?? null

  if (mode === 'review') {
    return (
      <PageContainer width="form">
        <View style={styles.pageHead}>
          <IconButton icon="arrow-back" onPress={discardScan} accessibilityLabel="Back to entry" />
          <Text style={styles.pageTitle}>Review scan</Text>
        </View>
        <PlateScanReview
          photoUri={photoUri}
          items={reviewItems}
          onChange={setReviewItems}
          onConfirm={confirmScan}
          onDiscard={discardScan}
          onReplace={() => setPickerVisible(true)}
        />
        <FoodPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={handleSelectFood} />
      </PageContainer>
    )
  }

  const startCard = (
    <AnimatedScreen>
      <CompactCard accent="gold" style={styles.startCard}>
        <SegmentedControl
          segments={MEAL_TYPES}
          value={mealType}
          onChange={setMealType}
          tone="gold"
          scrollable
          accessibilityLabel="Meal type"
        />
        <View style={styles.startActions}>
          <CompactButton label="Scan Plate" icon="camera" tone="gold" onPress={() => setManualOpen(false)} style={styles.startAction} />
          <CompactButton label="Search Food" icon="search" onPress={() => setPickerVisible(true)} style={styles.startAction} />
          {lastMeal && (
            <CompactButton label="Repeat Recent" icon="repeat" onPress={() => handlePickRecentFood(lastMeal)} style={styles.startAction} />
          )}
        </View>
      </CompactCard>
    </AnimatedScreen>
  )

  const scanBlock = (
    <AnimatedScreen delay={40}>
      <CompactCard>
        <SectionHeader title="Scan your plate" />
        <Text style={styles.blurb}>
          Photograph the meal and get an editable estimate. No weighing, and no need to know the recipe.
        </Text>
        <PhotoPicker
          uri={photoUri}
          onPicked={runScan}
          onCleared={discardScan}
          label="Photograph your meal"
          hint="One plate, lit from above, with something for scale if you can."
          busy={scanning}
          busyLabel="Reading your plate…"
          previewHeight={150}
          style={styles.photoPicker}
        />
        {scanError ? (
          <View style={styles.error} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={14} color={colors.danger} />
            <Text style={styles.errorText}>{scanError}</Text>
          </View>
        ) : null}
      </CompactCard>
    </AnimatedScreen>
  )

  const manualBlock = (
    <AnimatedScreen delay={60}>
      <CompactCard>
        <AnimatedPressable
          style={styles.manualToggle}
          onPress={() => setManualOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: manualOpen }}
          accessibilityLabel="Enter food manually"
        >
          <Ionicons name="create-outline" size={15} color={colors.gold} />
          <Text style={styles.manualTitle}>Search or enter food</Text>
          <Ionicons name={manualOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} />
        </AnimatedPressable>

        {manualOpen && (
          <View style={styles.manualBody}>
            <FoodAutosuggest
              value={foodName}
              selectedImageUrl={selectedFood?.imageUrl ?? null}
              recent={recentFoods}
              onChangeText={(value) => { setFoodName(value); setSelectedFood(null) }}
              onPickFood={handleSelectFood}
              onPickRecent={handlePickRecentFood}
              onOpenLibrary={() => setPickerVisible(true)}
            />

            <View style={styles.quantityRow}>
              <NumericInput
                label="Quantity" value={quantity} onChangeText={setQuantity}
                step={unit === 'g' ? 10 : 0.5} min={0} style={styles.quantityField}
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

            <TextField
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes — restaurant, meal prep…"
              accessibilityLabel="Meal notes"
            />

            <CompactButton label="Add to meal" icon="add" onPress={addToPlaylist} />
          </View>
        )}
      </CompactCard>
    </AnimatedScreen>
  )

  const playlistBlock = (
    <AnimatedScreen delay={80}>
      <View style={styles.section}>
        <SectionHeader title="This meal" meta={playlist.length ? `${playlist.length} items` : undefined} />
        {playlist.length ? (
          <CompactCard padded={false} style={styles.playlistCard}>
            {playlist.map((item, index) => (
              <View key={item.key} style={styles.playlistRow}>
                <Text style={styles.playlistIndex}>{index + 1}</Text>
                <View style={styles.playlistCopy}>
                  <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.playlistMeta} numberOfLines={1}>
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
        ) : (
          <EmptyState
            icon="restaurant-outline"
            title="Nothing added yet"
            message="Scan a plate or search for a food to start."
            compact
          />
        )}
      </View>
    </AnimatedScreen>
  )

  const energyBlock = (
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
  )

  const footer = (
    <View style={styles.footer}>
      {saveError ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      ) : null}
      <CompactButton
        label={`Log meal · 15 XP`}
        tone="primary"
        icon="checkmark"
        block
        loading={saving}
        onPress={handleSave}
      />
    </View>
  )

  return <>
    <PageContainer width={isDesktop ? 'content' : 'form'}>
      <View style={styles.pageHead}>
        <IconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.pageTitle}>Log a meal</Text>
        <Chip label="+15 XP" tone="gold" icon="flash" />
      </View>

      {!circle && <NoCircleBanner />}

      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.main}>
            {startCard}
            {scanBlock}
            {manualBlock}
          </View>
          <View style={styles.side}>
            {energyBlock}
            {playlistBlock}
            {footer}
          </View>
        </View>
      ) : (
        <>
          {startCard}
          {energyBlock}
          {scanBlock}
          {manualBlock}
          {playlistBlock}
          {footer}
        </>
      )}
    </PageContainer>

    <FoodPickerModal visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={handleSelectFood} />
  </>
}

const styles = StyleSheet.create({
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  section: { gap: 8 },
  startCard: { gap: 10 },
  startActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  startAction: { flexGrow: 1, flexBasis: 120 },
  blurb: { color: colors.textSecondary, fontSize: 11.5, lineHeight: 16, marginTop: 5, marginBottom: 9 },
  photoPicker: { marginTop: 2 },
  manualToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34 },
  manualTitle: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  manualBody: { gap: 11, paddingTop: 10 },
  quantityRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  quantityField: { width: 132 },
  unitField: { flex: 1, gap: 4, minWidth: 0 },
  fieldLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  hint: { color: colors.cornerBlue, fontSize: 10.5, marginTop: -6 },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroField: { flexGrow: 1, flexBasis: 100 },
  playlistCard: { paddingHorizontal: 11 },
  playlistRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  playlistIndex: { width: 16, color: colors.gold, fontFamily: type.display, fontSize: 13, fontWeight: '900' },
  playlistCopy: { flex: 1, minWidth: 0 },
  playlistName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  playlistMeta: { color: colors.textMuted, fontSize: 10.5, marginTop: 1 },
  footer: { gap: 10 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  main: { flex: 1.8, gap: 20, minWidth: 0 },
  side: { flex: 1, gap: 12, minWidth: 280, maxWidth: 380 },
})
