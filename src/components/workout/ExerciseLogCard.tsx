import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactCard } from '../ui/CompactCard'
import { CompactButton } from '../ui/CompactButton'
import { IconButton } from '../ui/IconButton'
import { SegmentedControl } from '../ui/SegmentedControl'
import { TextField } from '../ui/TextField'
import { Chip } from '../ui/Chip'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { ExerciseAutosuggest } from './ExerciseAutosuggest'
import { MeasurementPicker } from './MeasurementPicker'
import { SetHeader, SetRow } from './SetRow'
import { RestTimer } from './RestTimer'
import { TaleOfTapeSection } from './TaleOfTapeSection'
import { schemaFor, emptySet, duplicateSet, type SetDraft } from '../../lib/measurementSchemas'
import { loadPreviousPerformance, type ExerciseDraft, type PreviousPerformance } from '../../lib/workoutDraft'
import { totalVolumeKg } from '../../lib/workoutFormat'
import type { PickedExercise } from '../../lib/wger'
import type { MeasurementType } from '../../types/database'
import type { ExerciseType } from '../../types/app'

interface ExerciseLogCardProps {
  exercise: ExerciseDraft
  index: number
  total: number
  userId: string | null
  recentNames: string[]
  onChange: (patch: Partial<ExerciseDraft>) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onOpenLibrary: () => void
}

const WEIGHT_MODES = [
  { value: 'added' as const, label: 'Added' },
  { value: 'assisted' as const, label: 'Assisted' },
]

/**
 * One exercise, fully logged. The card carries a single accent rail; the only
 * strong emphasis inside it belongs to the working set, so the eye lands on
 * the row about to be filled in rather than on the card furniture.
 */
export function ExerciseLogCard({
  exercise, index, total, userId, recentNames, onChange, onRemove, onMove, onOpenLibrary,
}: ExerciseLogCardProps) {
  const schema = schemaFor(exercise.measurement_type)
  // Resume where the session actually is. Defaulting to 0 left a finished
  // first set open for editing while the set about to be performed sat
  // collapsed below it — backwards for anyone reopening a part-done exercise.
  const [activeSet, setActiveSet] = useState(() => {
    const next = exercise.setRows.findIndex((set) => !set.completed)
    return next === -1 ? Math.max(0, exercise.setRows.length - 1) : next
  })
  const [previous, setPrevious] = useState<PreviousPerformance | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const showWeightMode = exercise.measurement_type === 'strength' || exercise.measurement_type === 'bodyweight'

  // Last time's numbers are the single most useful thing on this card, so they
  // are fetched as soon as there is a name to look up.
  useEffect(() => {
    if (!userId || !exercise.exercise_name.trim()) { setPrevious(null); return }
    let cancelled = false
    loadPreviousPerformance(userId, exercise.exercise_name, exercise.measurement_type)
      .then((result) => { if (!cancelled) setPrevious(result) })
    return () => { cancelled = true }
  }, [userId, exercise.exercise_name, exercise.measurement_type])

  function patchSet(setIndex: number, patch: Partial<SetDraft>) {
    const next = exercise.setRows.map((set, i) => i === setIndex ? { ...set, ...patch } : set)
    onChange({ setRows: next })
  }

  function addSet() {
    const last = exercise.setRows[exercise.setRows.length - 1]
    const next = last
      ? duplicateSet(last, exercise.setRows.length)
      : emptySet(exercise.measurement_type, 0)
    onChange({ setRows: [...exercise.setRows, next] })
    setActiveSet(exercise.setRows.length)
  }

  function addBlankSet() {
    onChange({ setRows: [...exercise.setRows, emptySet(exercise.measurement_type, exercise.setRows.length)] })
    setActiveSet(exercise.setRows.length)
  }

  function deleteSet(setIndex: number) {
    const next = exercise.setRows
      .filter((_, i) => i !== setIndex)
      .map((set, i) => ({ ...set, set_index: i }))
    onChange({ setRows: next.length ? next : [emptySet(exercise.measurement_type, 0)] })
    setActiveSet((current) => Math.max(0, Math.min(current, next.length - 1)))
  }

  function toggleComplete(setIndex: number) {
    const wasDone = exercise.setRows[setIndex].completed
    patchSet(setIndex, { completed: !wasDone })
    // Finishing a set moves the working row on, which is the whole rhythm of
    // logging mid-session: complete, rest, next.
    if (!wasDone && setIndex === activeSet && setIndex + 1 < exercise.setRows.length) {
      setActiveSet(setIndex + 1)
    }
  }

  function changeMeasurement(measurement: MeasurementType) {
    // Fields differ per schema, so carrying old values across would leave
    // numbers in columns that no longer mean the same thing.
    onChange({
      measurement_type: measurement,
      weight_mode: schemaFor(measurement).defaults?.weight_mode ?? null,
      setRows: [emptySet(measurement, 0)],
    })
    setActiveSet(0)
  }

  function pickLibrary(picked: PickedExercise) {
    onChange({
      exercise_name: picked.name,
      wger_exercise_id: picked.exerciseId,
      exercise_image_url: picked.imageUrl,
    })
  }

  function pickName(name: string, exerciseType?: ExerciseType) {
    // A curated pick carries a coarse strength/cardio type; map it onto the
    // closest measurement schema rather than leaving the row mismatched.
    const measurement: MeasurementType | null = exerciseType === 'cardio' ? 'distance_cardio' : null
    if (measurement && measurement !== exercise.measurement_type) {
      onChange({
        exercise_name: name,
        wger_exercise_id: null,
        exercise_image_url: null,
        measurement_type: measurement,
        setRows: [emptySet(measurement, 0)],
      })
      setActiveSet(0)
      return
    }
    onChange({ exercise_name: name, wger_exercise_id: null, exercise_image_url: null })
  }

  const volume = totalVolumeKg(exercise.setRows)
  const doneCount = exercise.setRows.filter((set) => set.completed).length

  return (
    <CompactCard accent="red" style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.order}>{String(index + 1).padStart(2, '0')}</Text>
        {exercise.exercise_image_url ? (
          <Image source={{ uri: exercise.exercise_image_url }} style={styles.thumb} contentFit="cover" />
        ) : null}
        <View style={styles.headCopy}>
          <Text style={styles.name} numberOfLines={1}>
            {exercise.exercise_name || 'Choose an exercise'}
          </Text>
          <Text style={styles.headMeta} numberOfLines={1}>
            {schema.label}
            {exercise.equipment ? ` · ${exercise.equipment}` : ''}
            {doneCount ? ` · ${doneCount}/${exercise.setRows.length} done` : ''}
          </Text>
        </View>
        <View style={styles.headActions}>
          <IconButton icon="chevron-up" size="sm" onPress={() => onMove(-1)} disabled={index === 0} accessibilityLabel={`Move ${exercise.exercise_name || 'exercise'} up`} />
          <IconButton icon="chevron-down" size="sm" onPress={() => onMove(1)} disabled={index === total - 1} accessibilityLabel={`Move ${exercise.exercise_name || 'exercise'} down`} />
          <IconButton icon="trash-outline" size="sm" tone="danger" onPress={onRemove} accessibilityLabel={`Remove ${exercise.exercise_name || 'exercise'}`} />
        </View>
      </View>

      <ExerciseAutosuggest
        value={exercise.exercise_name}
        imageUrl={exercise.exercise_image_url}
        recent={recentNames}
        onChangeText={(value) => onChange({ exercise_name: value, wger_exercise_id: null, exercise_image_url: null })}
        onPickLibrary={pickLibrary}
        onPickName={pickName}
        onCommit={() => {}}
        onOpenLibrary={onOpenLibrary}
      />

      <View style={styles.metaRow}>
        <View style={styles.metaField}>
          <MeasurementPicker value={exercise.measurement_type} onChange={changeMeasurement} />
        </View>
        <View style={styles.metaField}>
          <TextField
            value={exercise.equipment ?? ''}
            onChangeText={(value) => onChange({ equipment: value || null })}
            placeholder="Equipment (optional)"
            accessibilityLabel="Equipment"
          />
        </View>
      </View>

      {showWeightMode && (
        <SegmentedControl
          segments={WEIGHT_MODES}
          value={exercise.weight_mode ?? 'added'}
          onChange={(mode) => onChange({ weight_mode: mode })}
          accessibilityLabel="Weight is added or assisted"
          style={styles.weightMode}
        />
      )}

      {exercise.measurement_type === 'isometric_force' && (
        <View style={styles.deviceNote}>
          <Ionicons name="information-circle-outline" size={13} color={colors.cornerBlue} />
          <Text style={styles.deviceNoteText}>
            Force values must come from a dynamometer or force plate. Nothing here estimates them —
            without a device, use an isometric hold and record perceived effort instead.
          </Text>
        </View>
      )}

      {previous && (
        <View style={styles.previous}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.previousText} numberOfLines={1}>
            Last time · {previous.summary}
          </Text>
          <Text style={styles.previousDate}>
            {new Date(previous.loggedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      )}

      <View style={styles.sets}>
        <SetHeader measurementType={exercise.measurement_type} />
        {exercise.setRows.map((set, setIndex) => (
          <SetRow
            key={setIndex}
            set={set}
            index={setIndex}
            measurementType={exercise.measurement_type}
            active={setIndex === activeSet}
            onChange={(patch) => patchSet(setIndex, patch)}
            onToggleComplete={() => toggleComplete(setIndex)}
            onDelete={exercise.setRows.length > 1 ? () => deleteSet(setIndex) : undefined}
            onFocus={() => setActiveSet(setIndex)}
          />
        ))}
      </View>

      <View style={styles.setActions}>
        <CompactButton label={`Add ${schema.unitNoun}`} icon="add" size="sm" onPress={addBlankSet} />
        {exercise.setRows.length > 0 && (
          <CompactButton label="Duplicate last" icon="copy-outline" size="sm" onPress={addSet} />
        )}
        {volume > 0 && <Chip label={`${Math.round(volume).toLocaleString()} kg volume`} tone="blue" />}
      </View>

      <RestTimer
        seconds={exercise.rest_seconds}
        onChangeSeconds={(seconds) => onChange({ rest_seconds: seconds })}
      />

      <TaleOfTapeSection userId={userId} exercise={exercise} />

      <AnimatedPressable
        style={styles.notesToggle}
        onPress={() => setNotesOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: notesOpen }}
        accessibilityLabel="Technique notes"
      >
        <Ionicons name="document-text-outline" size={13} color={colors.textMuted} />
        <Text style={styles.notesToggleText}>
          {exercise.notes ? 'Technique notes' : 'Add technique notes'}
        </Text>
        <Ionicons name={notesOpen ? 'chevron-up' : 'chevron-down'} size={13} color={colors.textMuted} />
      </AnimatedPressable>

      {notesOpen && (
        <TextField
          value={exercise.notes ?? ''}
          onChangeText={(value) => onChange({ notes: value || null })}
          placeholder="Cues, setup, how it felt…"
          multiline
          accessibilityLabel="Technique notes"
        />
      )}
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  order: { color: colors.primary, fontFamily: type.display, fontSize: 15, fontWeight: '900' },
  thumb: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface },
  headCopy: { flex: 1, minWidth: 0, gap: 1 },
  name: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  headMeta: { color: colors.textMuted, fontSize: 10.5 },
  headActions: { flexDirection: 'row', gap: 4 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaField: { flex: 1, minWidth: 150 },
  // Full width: shrink-to-fit clipped 'Assisted' to 'ASSIS…'.
  weightMode: { alignSelf: 'stretch' },
  deviceNote: {
    flexDirection: 'row', gap: 7, padding: 9, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.cornerBlue + '55', backgroundColor: colors.cornerBlue + '12',
  },
  deviceNoteText: { flex: 1, color: colors.textSecondary, fontSize: 11, lineHeight: 15 },
  previous: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.cardRaised,
  },
  previousText: { flex: 1, color: colors.textSecondary, fontSize: 11.5 },
  previousDate: { color: colors.textMuted, fontSize: 10 },
  sets: { gap: 3 },
  setActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 30 },
  notesToggleText: { flex: 1, color: colors.textMuted, fontSize: 11.5 },
})
