import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useUIStore } from '../../../src/store/uiStore'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { SectionHeader } from '../../../src/components/ui/SectionHeader'
import { StatItem } from '../../../src/components/ui/StatItem'
import { Chip } from '../../../src/components/ui/Chip'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { LoadingState } from '../../../src/components/ui/LoadingState'
import { ExerciseRow } from '../../../src/components/workout/ExerciseRow'
import { EquipmentScanner, type ConfirmedEquipment } from '../../../src/components/workout/EquipmentScanner'
import { estimateWorkoutCalories } from '../../../src/lib/energyEstimates'
import { colors, type } from '../../../src/constants/theme'
import type { WorkoutWithExercises, WorkoutPlanWithSource } from '../../../src/types/app'
import type { MeasurementType } from '../../../src/types/database'

/** Rough session length when the source workout never recorded one. */
const MINUTES_PER_SET = 3.2

interface PlannedExercise {
  name: string
  imageUrl: string | null
  equipment: string | null
  measurementType: MeasurementType
  sets: number | null
  muscleHint: string | null
}

export default function TrainingScreen() {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const openQuickLog = useUIStore((store) => store.openQuickLog)

  const [plans, setPlans] = useState<WorkoutPlanWithSource[]>([])
  const [recent, setRecent] = useState<WorkoutWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  /** Local-only reordering of the preview, carried into the logger on start. */
  const [order, setOrder] = useState<number[] | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return }
    const [{ data: planRows }, { data: workoutRows }] = await Promise.all([
      supabase.from('workout_plans')
        .select('*, source_workout:workouts(id, title)')
        .eq('user_id', profile.id).eq('is_active', true),
      supabase.from('workouts')
        .select('*, exercises:workout_exercises(*)')
        .eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(8),
    ])
    setPlans((planRows as unknown as WorkoutPlanWithSource[]) ?? [])
    setRecent((workoutRows as unknown as WorkoutWithExercises[]) ?? [])
    setOrder(null)
    setLoading(false)
  }, [profile?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  const today = new Date().getDay()
  const todaysPlans = plans.filter((plan) => plan.days_of_week.includes(today))

  // Today's plan, or failing that the most recent session — which is the thing
  // most people are about to repeat anyway.
  const source: { workout: WorkoutWithExercises | null; title: string; scheduled: boolean } = useMemo(() => {
    const planned = todaysPlans[0]
    if (planned) {
      const linked = recent.find((workout) => workout.id === planned.source_workout_id) ?? null
      return { workout: linked, title: planned.title, scheduled: true }
    }
    const last = recent[0] ?? null
    return { workout: last, title: last?.title ?? 'No plan yet', scheduled: false }
  }, [todaysPlans, recent])

  const planned: PlannedExercise[] = useMemo(() => {
    const exercises = (source.workout?.exercises ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((exercise) => ({
        name: exercise.exercise_name,
        imageUrl: exercise.exercise_image_url,
        equipment: exercise.equipment ?? null,
        measurementType: (exercise.measurement_type ?? 'strength') as MeasurementType,
        sets: exercise.sets,
        muscleHint: null,
      }))
    if (!order) return exercises
    return order.map((index) => exercises[index]).filter(Boolean)
  }, [source.workout, order])

  const estimate = useMemo(() => {
    if (!source.workout) return null
    const recorded = source.workout.duration_minutes
    if (recorded) return recorded
    const totalSets = source.workout.exercises.reduce((sum, exercise) => sum + (exercise.sets ?? 1), 0)
    return Math.max(10, Math.round(totalSets * MINUTES_PER_SET))
  }, [source.workout])

  const burn = useMemo(() => {
    if (!source.workout) return null
    return estimateWorkoutCalories(
      profile?.weight_kg ?? null,
      estimate,
      source.workout.difficulty,
      source.workout.exercises as never,
    )
  }, [source.workout, estimate, profile?.weight_kg])

  // Derived focus, not a stored field: naming the movements is more honest
  // than inventing a muscle-group label the data does not carry.
  const focus = useMemo(() => {
    if (!planned.length) return null
    return planned.slice(0, 3).map((exercise) => exercise.name).join(' · ')
  }, [planned])

  function move(from: number, direction: -1 | 1) {
    const current = order ?? planned.map((_, index) => index)
    const to = from + direction
    if (to < 0 || to >= current.length) return
    const next = [...current]
    ;[next[from], next[to]] = [next[to], next[from]]
    setOrder(next)
  }

  function startWorkout() {
    if (!source.workout) { router.push('/(app)/log/workout' as never); return }
    const sequence = order ? `&order=${order.join(',')}` : ''
    router.push(`/(app)/log/workout?repeat=${source.workout.id}${sequence}` as never)
  }

  function handleScanned(equipment: ConfirmedEquipment) {
    const params = new URLSearchParams({
      exercise: equipment.exerciseName,
      measurement: equipment.measurementType,
    })
    if (equipment.equipment) params.set('equipment', equipment.equipment)
    if (equipment.photoPath) params.set('equipmentPhoto', equipment.photoPath)
    router.push(`/(app)/log/workout?${params.toString()}` as never)
  }

  const planCard = (
    <AnimatedScreen>
      <CompactCard accent={source.scheduled ? 'gold' : 'red'} style={styles.planCard}>
        <View style={styles.planHead}>
          <View style={styles.planCopy}>
            <Text style={styles.eyebrow}>{source.scheduled ? "TODAY'S PLAN" : 'PICK UP WHERE YOU LEFT OFF'}</Text>
            <Text style={styles.planTitle} numberOfLines={2}>{source.title}</Text>
          </View>
          {source.scheduled && <Chip label="Scheduled" tone="gold" icon="calendar" />}
        </View>

        {source.workout ? (
          <View style={styles.planStats}>
            <StatItem label="Exercises" value={String(planned.length)} icon="list" style={styles.stat} />
            <View style={styles.divider} />
            <StatItem label="Est. time" value={estimate ? `${estimate} min` : '—'} icon="time-outline" style={styles.stat} />
            <View style={styles.divider} />
            <StatItem label="Est. burn" value={burn ? `${burn} kcal` : '—'} icon="flame" tone="red" style={styles.stat} />
          </View>
        ) : null}

        {focus ? <Text style={styles.focus} numberOfLines={2}>Focus · {focus}</Text> : null}

        <View style={styles.planActions}>
          <CompactButton label="Start Workout" icon="play" tone="primary" onPress={startWorkout} style={styles.primaryAction} />
          <CompactButton label="Use Routine" icon="repeat" onPress={() => router.push('/(app)/log/workout' as never)} />
          <CompactButton label="Scan Equipment" icon="camera" onPress={() => setScannerOpen(true)} />
        </View>
      </CompactCard>
    </AnimatedScreen>
  )

  const sequence = (
    <AnimatedScreen delay={60}>
      <View style={styles.section}>
        <SectionHeader
          title="Exercises"
          meta={planned.length ? `${planned.length} in sequence` : undefined}
        />
        {loading ? (
          <LoadingState rows={4} rowHeight={54} />
        ) : planned.length ? (
          <View style={styles.rows}>
            {planned.map((exercise, index) => (
              <ExerciseRow
                key={`${exercise.name}-${index}`}
                order={index + 1}
                name={exercise.name}
                imageUrl={exercise.imageUrl}
                equipment={exercise.equipment}
                measurementType={exercise.measurementType}
                plannedSets={exercise.sets}
                onMoveUp={index > 0 ? () => move(index, -1) : undefined}
                onMoveDown={index < planned.length - 1 ? () => move(index, 1) : undefined}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="barbell-outline"
            title="No sequence yet"
            message="Log a workout and it becomes a routine you can repeat."
            actionLabel="Build one"
            onAction={() => router.push('/(app)/log/workout' as never)}
            tone="red"
          />
        )}
      </View>
    </AnimatedScreen>
  )

  const history = (
    <AnimatedScreen delay={90}>
      <View style={styles.section}>
        <SectionHeader title="Recent Sessions" />
        {recent.length ? (
          <View style={styles.rows}>
            {recent.slice(0, 5).map((workout) => (
              <ExerciseRow
                key={workout.id}
                order={workout.exercises.length}
                name={workout.title}
                measurementType="strength"
                plannedSets={null}
                equipment={new Date(workout.logged_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                onPress={() => router.push(`/(app)/log/workout?repeat=${workout.id}` as never)}
              />
            ))}
          </View>
        ) : (
          <EmptyState icon="time-outline" title="No sessions logged" message="Your history builds from here." compact />
        )}
      </View>
    </AnimatedScreen>
  )

  const otherLogs = (
    <AnimatedScreen delay={120}>
      <CompactCard>
        <View style={styles.quickHead}>
          <Ionicons name="add-circle-outline" size={15} color={colors.gold} />
          <Text style={styles.quickTitle}>Log something else</Text>
        </View>
        <Text style={styles.quickCopy}>Meals, steps, sleep and weigh-ins all live in Quick Log.</Text>
        <View style={styles.quickActions}>
          <CompactButton label="Quick Log" icon="add" tone="gold" onPress={openQuickLog} />
          <CompactButton label="Nearby routes" icon="map-outline" onPress={() => router.push('/(app)/discover' as never)} />
        </View>
      </CompactCard>
    </AnimatedScreen>
  )

  return <>
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.main}>
            {planCard}
            {sequence}
          </View>
          <View style={styles.side}>
            {otherLogs}
            {history}
          </View>
        </View>
      ) : (
        <>
          {planCard}
          {sequence}
          {history}
          {otherLogs}
        </>
      )}
    </PageContainer>

    {profile?.id && (
      <EquipmentScanner
        visible={scannerOpen}
        userId={profile.id}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleScanned}
      />
    )}
  </>
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  rows: { gap: 6 },
  planCard: { gap: 10 },
  planHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  planCopy: { flex: 1, minWidth: 0, gap: 2 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  planTitle: { color: colors.text, fontFamily: type.display, fontSize: 21, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.3 },
  planStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat: { flex: 1 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
  focus: { color: colors.textSecondary, fontSize: 11.5 },
  planActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryAction: { minWidth: 148 },
  quickHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quickTitle: { color: colors.text, fontFamily: type.display, fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  quickCopy: { color: colors.textMuted, fontSize: 11.5, marginTop: 4, marginBottom: 10 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  main: { flex: 1.9, gap: 20, minWidth: 0 },
  side: { flex: 1, gap: 12, minWidth: 260, maxWidth: 360 },
})
