import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { ResponsiveSidePanel } from '../layout/ResponsiveSidePanel'
import { PhotoPicker } from '../ui/PhotoPicker'
import { CompactButton } from '../ui/CompactButton'
import { TextField } from '../ui/TextField'
import { CompactCard } from '../ui/CompactCard'
import { Chip } from '../ui/Chip'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { MeasurementPicker } from './MeasurementPicker'
import { analyseEquipmentPhoto, type EquipmentSuggestion } from '../../lib/equipmentRecognition'
import type { MeasurementType } from '../../types/database'

export interface ConfirmedEquipment {
  exerciseName: string
  equipment: string | null
  measurementType: MeasurementType
  /** Kept as a session reference only if the user asks for it. */
  photoPath: string | null
}

interface EquipmentScannerProps {
  visible: boolean
  userId: string
  onClose: () => void
  onConfirm: (equipment: ConfirmedEquipment) => void
}

/**
 * Photo → suggestion → confirm or correct → add.
 *
 * Every suggestion lands in an editable form rather than being applied
 * directly. Machines that look alike often are not: a plate-loaded row and a
 * selectorised one move differently and load differently, so an unconfirmed
 * identification would quietly corrupt the exercise history it feeds.
 */
export function EquipmentScanner({ visible, userId, onClose, onConfirm }: EquipmentScannerProps) {
  const [uri, setUri] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<EquipmentSuggestion[] | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [notes, setNotes] = useState('')
  const [photoPath, setPhotoPath] = useState<string | null>(null)

  // The editable confirmation form.
  const [exerciseName, setExerciseName] = useState('')
  const [equipment, setEquipment] = useState('')
  const [measurementType, setMeasurementType] = useState<MeasurementType>('strength')
  const [keepPhoto, setKeepPhoto] = useState(false)

  function reset() {
    setUri(null); setBusy(false); setError(null); setSuggestions(null)
    setIsMock(false); setNotes(''); setPhotoPath(null)
    setExerciseName(''); setEquipment(''); setMeasurementType('strength'); setKeepPhoto(false)
  }

  async function analyse(pickedUri: string) {
    setUri(pickedUri)
    setBusy(true)
    setError(null)
    const outcome = await analyseEquipmentPhoto(pickedUri, userId)
    setBusy(false)
    if (!outcome.ok) { setError(outcome.error); return }
    setSuggestions(outcome.analysis.suggestions)
    setIsMock(outcome.analysis.isMock)
    setNotes(outcome.analysis.notes)
    setPhotoPath(outcome.analysis.photoPath)
  }

  function applySuggestion(suggestion: EquipmentSuggestion) {
    setExerciseName(suggestion.exerciseName)
    setEquipment(suggestion.equipment === 'Not identified' ? '' : suggestion.equipment)
    setMeasurementType(suggestion.measurementType)
  }

  function confirm() {
    if (!exerciseName.trim()) return
    onConfirm({
      exerciseName: exerciseName.trim(),
      equipment: equipment.trim() || null,
      measurementType,
      photoPath: keepPhoto ? photoPath : null,
    })
    reset()
    onClose()
  }

  return (
    <ResponsiveSidePanel
      visible={visible}
      onClose={() => { reset(); onClose() }}
      title="Scan equipment"
      subtitle="Identify a machine, then confirm before adding"
    >
      <PhotoPicker
        uri={uri}
        onPicked={analyse}
        onCleared={reset}
        label="Photograph the machine"
        hint="Include the whole frame and any label or plate stack."
        busy={busy}
        busyLabel="Looking at it…"
        previewHeight={170}
      />

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {suggestions && (
        <>
          <View style={styles.suggestHead}>
            <Text style={styles.sectionTitle}>Suggestions</Text>
            <Chip
              label={isMock ? 'Samples only' : 'Suggestion'}
              tone={isMock ? 'danger' : 'gold'}
              icon={isMock ? 'alert-circle' : 'sparkles'}
            />
          </View>

          {/* Said plainly, every time. A guess dressed as a reading is the one
              failure mode this feature must not have. */}
          <Text style={styles.caveat}>
            {isMock
              ? notes
              : 'A photo cannot tell you a machine’s movement path or resistance curve. Check the suggestion against what you are actually using.'}
          </Text>

          {suggestions.map((suggestion, index) => (
            <AnimatedPressable
              key={`${suggestion.exerciseName}-${index}`}
              onPress={() => applySuggestion(suggestion)}
              accessibilityRole="button"
              accessibilityLabel={`Use suggestion: ${suggestion.exerciseName}`}
              style={[styles.suggestion, exerciseName === suggestion.exerciseName && styles.suggestionActive]}
            >
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionName} numberOfLines={1}>{suggestion.exerciseName}</Text>
                <Text style={styles.suggestionMeta} numberOfLines={1}>
                  {suggestion.equipment}
                  {suggestion.caveat ? ` · ${suggestion.caveat}` : ''}
                </Text>
              </View>
              <Chip
                label={suggestion.confidence}
                tone={suggestion.confidence === 'high' ? 'blue' : suggestion.confidence === 'medium' ? 'gold' : 'danger'}
              />
            </AnimatedPressable>
          ))}

          <CompactCard accent="gold" style={styles.form}>
            <Text style={styles.sectionTitle}>Confirm or correct</Text>

            <TextField
              label="Exercise"
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="e.g. Seated Cable Row"
            />

            <TextField
              label="Equipment"
              value={equipment}
              onChangeText={setEquipment}
              placeholder="e.g. Hammer Strength row"
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>How it is measured</Text>
              <MeasurementPicker value={measurementType} onChange={setMeasurementType} />
            </View>

            <AnimatedPressable
              style={styles.keepRow}
              onPress={() => setKeepPhoto((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: keepPhoto }}
              accessibilityLabel="Keep this photo as a session reference"
            >
              <Ionicons name={keepPhoto ? 'checkbox' : 'square-outline'} size={18} color={keepPhoto ? colors.gold : colors.textMuted} />
              <Text style={styles.keepText}>Keep the photo as a session reference</Text>
            </AnimatedPressable>

            <CompactButton
              label="Add to workout"
              tone="gold"
              icon="add"
              block
              disabled={!exerciseName.trim()}
              onPress={confirm}
            />
          </CompactCard>
        </>
      )}
    </ResponsiveSidePanel>
  )
}

const styles = StyleSheet.create({
  suggestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  sectionTitle: { color: colors.text, fontFamily: type.display, fontSize: 12.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  caveat: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 48, paddingHorizontal: 11,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  suggestionActive: { borderColor: colors.gold },
  suggestionCopy: { flex: 1, minWidth: 0, gap: 1 },
  suggestionName: { color: colors.text, fontFamily: type.display, fontSize: 13.5, fontWeight: '800', textTransform: 'uppercase' },
  suggestionMeta: { color: colors.textMuted, fontSize: 10.5 },
  form: { gap: 11, marginTop: 6 },
  field: { gap: 5 },
  fieldLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  keepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34 },
  keepText: { flex: 1, color: colors.textSecondary, fontSize: 12 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
})
