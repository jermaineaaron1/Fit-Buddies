import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
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
import { NumericInput } from '../../../src/components/ui/NumericInput'
import { TextField } from '../../../src/components/ui/TextField'
import { Chip } from '../../../src/components/ui/Chip'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import { ExercisePickerModal } from '../../../src/components/pickers/ExercisePickerModal'
import { ExerciseLogCard } from '../../../src/components/workout/ExerciseLogCard'
import { EquipmentScanner, type ConfirmedEquipment } from '../../../src/components/workout/EquipmentScanner'
import { RecurringSchedulePicker } from '../../../src/components/workout/RecurringSchedulePicker'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { newExerciseDraft, draftFromWorkout, saveWorkout, type ExerciseDraft } from '../../../src/lib/workoutDraft'
import { emptySet, type SetDraft } from '../../../src/lib/measurementSchemas'
import { colors, radius, type } from '../../../src/constants/theme'
import type { WorkoutWithExercises } from '../../../src/types/app'
import type { MeasurementType } from '../../../src/types/database'
import type { PickedExercise } from '../../../src/lib/wger'

export default function LogWorkoutScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    repeat?: string; order?: string; focus?: string
    exercise?: string; equipment?: string; measurement?: string; equipmentPhoto?: string
  }>()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [durationMinutes, setDurationMinutes] = useState('')
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    newExerciseDraft(params.focus === 'cardio' ? 'distance_cardio' : 'strength'),
  ])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [makeRecurring, setMakeRecurring] = useState(false)
  const [recurringFor, setRecurringFor] = useState<{ workoutId: string; title: string } | null>(null)
  const [recentNames, setRecentNames] = useState<string[]>([])
  /** Guards the one-shot prefill so re-renders never clobber edits in progress. */
  const [prefilled, setPrefilled] = useState(false)

  const loadRecentNames = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('workouts')
      .select('exercises:workout_exercises(exercise_name, sort_order)')
      .eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(12)

    const seen = new Set<string>()
    const names: string[] = []
    for (const workout of (data as any[]) ?? []) {
      for (const exercise of workout.exercises ?? []) {
        const key = (exercise.exercise_name ?? '').trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        names.push(exercise.exercise_name.trim())
      }
    }
    setRecentNames(names)
  }, [profile?.id])

  useFocusEffect(useCallback(() => { loadRecentNames() }, [loadRecentNames]))

  // Prefill from Quick Log, Training's Start Workout, or the equipment scanner.
  // Runs exactly once — a repeat of this while the form is dirty would discard
  // whatever had been typed.
  useEffect(() => {
    if (prefilled || !profile?.id) return

    if (params.exercise) {
      setPrefilled(true)
      const measurement = (params.measurement as MeasurementType | undefined) ?? 'strength'
      setExercises([{
        ...newExerciseDraft(measurement),
        exercise_name: String(params.exercise),
        equipment: params.equipment ? String(params.equipment) : null,
        equipment_photo_path: params.equipmentPhoto ? String(params.equipmentPhoto) : null,
      }])
      return
    }

    if (!params.repeat) return
    setPrefilled(true)
    let cancelled = false

    ;(async () => {
      const { data } = await supabase
        .from('workouts').select('*, exercises:workout_exercises(*)')
        .eq('id', String(params.repeat)).single()
      if (cancelled || !data) return

      const workout = data as unknown as WorkoutWithExercises
      const exerciseIds = workout.exercises.map((exercise) => exercise.id)
      // Per-set detail from the source session, so a repeat starts from the
      // real numbers rather than from a reconstruction of the rollups.
      const bySource: Record<string, SetDraft[]> = {}
      if (exerciseIds.length) {
        const { data: setRows } = await supabase
          .from('workout_sets').select('*').in('workout_exercise_id', exerciseIds)
          .order('set_index', { ascending: true })
        for (const row of (setRows as any[]) ?? []) {
          const { id, workout_exercise_id, created_at, ...rest } = row
          ;(bySource[workout_exercise_id] ??= []).push(rest as SetDraft)
        }
      }

      if (cancelled) return
      let drafts = draftFromWorkout(workout, bySource)

      // Training's sequence reordering travels as an index list.
      if (params.order) {
        const indices = String(params.order).split(',').map(Number).filter((value) => Number.isInteger(value))
        const reordered = indices.map((index) => drafts[index]).filter(Boolean)
        if (reordered.length === drafts.length) drafts = reordered
      }

      setTitle(workout.title)
      setNotes(workout.notes ?? '')
      setDifficulty(workout.difficulty ?? 3)
      setDurationMinutes(workout.duration_minutes?.toString() ?? '')
      setExercises(drafts.length ? drafts : [newExerciseDraft()])
    })()

    return () => { cancelled = true }
  }, [params.repeat, params.exercise, params.order, params.equipment, params.measurement, params.equipmentPhoto, profile?.id, prefilled])

  function patchExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((current) => current.map((exercise, i) => i === index ? { ...exercise, ...patch } : exercise))
  }

  function removeExercise(index: number) {
    setExercises((current) => {
      const next = current.filter((_, i) => i !== index)
      return next.length ? next : [newExerciseDraft()]
    })
  }

  function moveExercise(index: number, direction: -1 | 1) {
    setExercises((current) => {
      const to = index + direction
      if (to < 0 || to >= current.length) return current
      const next = [...current]
      ;[next[index], next[to]] = [next[to], next[index]]
      return next
    })
  }

  function handlePickExercise(picked: PickedExercise) {
    if (pickerIndex === null) return
    patchExercise(pickerIndex, {
      exercise_name: picked.name,
      wger_exercise_id: picked.exerciseId,
      exercise_image_url: picked.imageUrl,
    })
    setPickerIndex(null)
  }

  function handleScanned(equipment: ConfirmedEquipment) {
    setExercises((current) => [...current, {
      ...newExerciseDraft(equipment.measurementType),
      exercise_name: equipment.exerciseName,
      equipment: equipment.equipment,
      equipment_photo_path: equipment.photoPath,
    }])
  }

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.setRows.filter((set) => set.completed).length, 0),
    [exercises],
  )

  async function handleSave() {
    setSaveError(null)
    if (!title.trim()) { setSaveError('Give your workout a name.'); return }
    if (!profile?.id || !circle?.id) { setSaveError('You need to be in a circle to log a workout.'); return }

    setSaving(true)
    const result = await saveWorkout({
      userId: profile.id,
      circleId: circle.id,
      title: title.trim(),
      notes: notes.trim() || null,
      difficulty,
      durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      exercises,
    })

    if (result.error || !result.workoutId) {
      setSaving(false)
      setSaveError(result.error ?? 'Could not save workout.')
      return
    }

    await earn('workout', result.workoutId, title.trim())
    await completeQuestByType('workout', profile.id, circle.id, earn)
    setSaving(false)

    // Alert.alert's button callbacks never fire on web, so navigation must not
    // be nested inside one — go back directly.
    if (makeRecurring) setRecurringFor({ workoutId: result.workoutId, title: title.trim() })
    else router.back()
  }

  async function handleSaveRecurring({ title: planTitle, daysOfWeek }: { title: string; daysOfWeek: number[] }) {
    if (!profile?.id || !circle?.id || !recurringFor) return
    const { error } = await supabase.from('workout_plans').insert({
      user_id: profile.id, circle_id: circle.id, title: planTitle,
      source_workout_id: recurringFor.workoutId, days_of_week: daysOfWeek,
    })
    if (error) { setSaveError(`Schedule not saved: ${error.message}`); setRecurringFor(null); return }
    setRecurringFor(null)
    router.back()
  }

  const details = (
    <AnimatedScreen>
      <CompactCard accent="gold" style={styles.detailsCard}>
        <TextField
          label="Workout title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Push Day, Morning Run"
          error={saveError && !title.trim() ? 'Give your workout a name.' : undefined}
        />

        <View style={styles.inlineFields}>
          <NumericInput
            label="Duration"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="45"
            suffix="min"
            integer
            style={styles.durationField}
          />
          <View style={styles.effortField}>
            <Text style={styles.fieldLabel}>Effort</Text>
            <View style={styles.flames}>
              {[1, 2, 3, 4, 5].map((level) => (
                <AnimatedPressable
                  key={level}
                  onPress={() => setDifficulty(level)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: level === difficulty }}
                  accessibilityLabel={`Effort ${level} of 5`}
                  hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                >
                  <Ionicons
                    name={level <= difficulty ? 'flame' : 'flame-outline'}
                    size={22}
                    color={level <= difficulty ? colors.primary : colors.textMuted}
                  />
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </View>

        <TextField
          label="Session notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it feel?"
          multiline
        />
      </CompactCard>
    </AnimatedScreen>
  )

  const list = (
    <View style={styles.section}>
      <SectionHeader title="Exercises" meta={`${exercises.length} · ${totalSets} sets done`}>
        <Chip label="Scan" tone="gold" icon="camera" onPress={() => setScannerOpen(true)} />
      </SectionHeader>

      {exercises.map((exercise, index) => (
        <AnimatedScreen key={exercise.key} delay={Math.min(index * 40, 160)}>
          <ExerciseLogCard
            exercise={exercise}
            index={index}
            total={exercises.length}
            userId={profile?.id ?? null}
            recentNames={recentNames}
            onChange={(patch) => patchExercise(index, patch)}
            onRemove={() => removeExercise(index)}
            onMove={(direction) => moveExercise(index, direction)}
            onOpenLibrary={() => setPickerIndex(index)}
          />
        </AnimatedScreen>
      ))}

      <View style={styles.addRow}>
        <CompactButton label="Add exercise" icon="add" onPress={() => setExercises((current) => [...current, newExerciseDraft()])} />
        <CompactButton label="Scan equipment" icon="camera-outline" onPress={() => setScannerOpen(true)} />
      </View>
    </View>
  )

  const footer = (
    <View style={styles.footer}>
      <AnimatedPressable
        style={styles.recurringRow}
        onPress={() => setMakeRecurring((value) => !value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: makeRecurring }}
        accessibilityLabel="Also make this recurring"
      >
        <Ionicons name={makeRecurring ? 'checkbox' : 'square-outline'} size={18} color={makeRecurring ? colors.gold : colors.textMuted} />
        <Text style={styles.recurringText}>Also make this recurring</Text>
      </AnimatedPressable>

      {saveError ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{saveError}</Text>
        </View>
      ) : null}

      <CompactButton
        label="Save workout · 50 XP"
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
        <Text style={styles.pageTitle}>Workout</Text>
        <Chip label="+50 XP" tone="gold" icon="flash" />
      </View>

      {!circle && <NoCircleBanner />}

      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.main}>{list}</View>
          <View style={styles.side}>{details}{footer}</View>
        </View>
      ) : (
        <>{details}{list}{footer}</>
      )}
    </PageContainer>

    <ExercisePickerModal
      visible={pickerIndex !== null}
      onClose={() => setPickerIndex(null)}
      onSelect={handlePickExercise}
    />
    {profile?.id && (
      <EquipmentScanner
        visible={scannerOpen}
        userId={profile.id}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleScanned}
      />
    )}
    <RecurringSchedulePicker
      visible={recurringFor !== null}
      onClose={() => { setRecurringFor(null); router.back() }}
      onSave={handleSaveRecurring}
      initialTitle={recurringFor?.title ?? ''}
    />
  </>
}

const styles = StyleSheet.create({
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageTitle: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  section: { gap: 10 },
  detailsCard: { gap: 11 },
  fieldLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  inlineFields: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  durationField: { width: 120 },
  effortField: { flex: 1, gap: 5 },
  flames: { flexDirection: 'row', gap: 8, minHeight: 40, alignItems: 'center' },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { gap: 10 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34 },
  recurringText: { flex: 1, color: colors.textSecondary, fontSize: 12.5 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  main: { flex: 2, gap: 20, minWidth: 0 },
  side: { flex: 1, gap: 12, minWidth: 280, maxWidth: 380 },
})
