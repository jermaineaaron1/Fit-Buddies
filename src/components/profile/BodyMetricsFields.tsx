import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Input } from '../ui/Input'
import { colors, radius, type } from '../../constants/theme'

export type BodyMetricsDraft = {
  gender: 'male' | 'female' | null
  heightUnit: 'cm' | 'ft'
  height: string
  heightInches: string
  weightUnit: 'kg' | 'lb'
  weight: string
  age: string
  bodyFat: string
  muscleMass: string
}

export type BodyMetricsPayload = {
  gender: 'male' | 'female'
  height_cm: number
  weight_kg: number
  age: number
  body_fat_percentage: number | null
  muscle_mass_kg: number | null
  preferred_height_unit: 'cm' | 'ft'
  preferred_weight_unit: 'kg' | 'lb'
}

export function emptyBodyMetrics(): BodyMetricsDraft {
  return { gender: null, heightUnit: 'cm', height: '', heightInches: '', weightUnit: 'kg', weight: '', age: '', bodyFat: '', muscleMass: '' }
}

type StoredBodyMetrics = {
  gender?: 'male' | 'female' | null
  height_cm?: number | null
  weight_kg?: number | null
  age?: number | null
  body_fat_percentage?: number | null
  muscle_mass_kg?: number | null
  preferred_height_unit?: 'cm' | 'ft' | null
  preferred_weight_unit?: 'kg' | 'lb' | null
}

export function profileToBodyMetrics(profile: StoredBodyMetrics): BodyMetricsDraft {
  const heightUnit = profile.preferred_height_unit ?? 'cm'
  const weightUnit = profile.preferred_weight_unit ?? 'kg'
  const cm = profile.height_cm ?? 0
  const totalInches = cm / 2.54
  return {
    gender: profile.gender ?? null,
    heightUnit,
    height: cm ? (heightUnit === 'cm' ? round(cm, 1) : String(Math.floor(totalInches / 12))) : '',
    heightInches: cm && heightUnit === 'ft' ? round(totalInches % 12, 1) : '',
    weightUnit,
    weight: profile.weight_kg ? round(weightUnit === 'kg' ? profile.weight_kg : profile.weight_kg * 2.20462, 1) : '',
    age: profile.age ? String(profile.age) : '',
    bodyFat: profile.body_fat_percentage ? round(profile.body_fat_percentage, 1) : '',
    muscleMass: profile.muscle_mass_kg ? round(weightUnit === 'kg' ? profile.muscle_mass_kg : profile.muscle_mass_kg * 2.20462, 1) : '',
  }
}

export function validateBodyMetrics(draft: BodyMetricsDraft): { payload?: BodyMetricsPayload; error?: string } {
  if (!draft.gender) return { error: 'Choose male or female.' }
  const heightCm = draft.heightUnit === 'cm'
    ? Number(draft.height)
    : Number(draft.height) * 30.48 + Number(draft.heightInches || 0) * 2.54
  const enteredWeight = Number(draft.weight)
  const weightKg = draft.weightUnit === 'kg' ? enteredWeight : enteredWeight / 2.20462
  const age = Number(draft.age)
  const bodyFat = draft.bodyFat.trim() ? Number(draft.bodyFat) : null
  const enteredMuscle = draft.muscleMass.trim() ? Number(draft.muscleMass) : null
  const muscleMassKg = enteredMuscle === null ? null : draft.weightUnit === 'kg' ? enteredMuscle : enteredMuscle / 2.20462

  if (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) return { error: 'Enter a height between 100–250 cm (3′3″–8′2″).' }
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 400) return { error: 'Enter a weight between 25–400 kg (55–882 lb).' }
  if (!Number.isInteger(age) || age < 13 || age > 120) return { error: 'Enter an age between 13 and 120.' }
  if (bodyFat !== null && (!Number.isFinite(bodyFat) || bodyFat < 1 || bodyFat > 75)) return { error: 'Body fat must be between 1% and 75%.' }
  if (muscleMassKg !== null && (!Number.isFinite(muscleMassKg) || muscleMassKg <= 0 || muscleMassKg > weightKg)) return { error: 'Muscle mass must be greater than 0 and no more than body weight.' }

  return {
    payload: {
      gender: draft.gender,
      height_cm: roundNumber(heightCm, 2),
      weight_kg: roundNumber(weightKg, 2),
      age,
      body_fat_percentage: bodyFat,
      muscle_mass_kg: muscleMassKg === null ? null : roundNumber(muscleMassKg, 2),
      preferred_height_unit: draft.heightUnit,
      preferred_weight_unit: draft.weightUnit,
    },
  }
}

export function BodyMetricsFields({ value, onChange }: { value: BodyMetricsDraft; onChange: (next: BodyMetricsDraft) => void }) {
  const set = (patch: Partial<BodyMetricsDraft>) => onChange({ ...value, ...patch })

  function switchHeightUnit(unit: 'cm' | 'ft') {
    if (unit === value.heightUnit) return
    const currentCm = value.heightUnit === 'cm' ? Number(value.height) : Number(value.height) * 30.48 + Number(value.heightInches || 0) * 2.54
    if (!Number.isFinite(currentCm) || currentCm <= 0) return set({ heightUnit: unit, height: '', heightInches: '' })
    const inches = currentCm / 2.54
    set(unit === 'cm'
      ? { heightUnit: unit, height: round(currentCm, 1), heightInches: '' }
      : { heightUnit: unit, height: String(Math.floor(inches / 12)), heightInches: round(inches % 12, 1) })
  }

  function switchWeightUnit(unit: 'kg' | 'lb') {
    if (unit === value.weightUnit) return
    const weight = Number(value.weight)
    const muscle = Number(value.muscleMass)
    const factor = unit === 'lb' ? 2.20462 : 1 / 2.20462
    set({ weightUnit: unit, weight: Number.isFinite(weight) && weight > 0 ? round(weight * factor, 1) : '', muscleMass: Number.isFinite(muscle) && muscle > 0 ? round(muscle * factor, 1) : '' })
  }

  return (
    <View style={styles.fields}>
      <Text style={styles.label}>Gender</Text>
      <View style={styles.segmented}>
        {(['male', 'female'] as const).map((gender) => <Choice key={gender} label={gender} active={value.gender === gender} onPress={() => set({ gender })} />)}
      </View>

      <View style={styles.labelRow}><Text style={styles.label}>Height</Text><View style={styles.units}><Choice label="cm" active={value.heightUnit === 'cm'} onPress={() => switchHeightUnit('cm')} /><Choice label="ft / in" active={value.heightUnit === 'ft'} onPress={() => switchHeightUnit('ft')} /></View></View>
      <View style={styles.inputRow}>
        <View style={styles.flex}><Input value={value.height} onChangeText={(height) => set({ height })} keyboardType="decimal-pad" placeholder={value.heightUnit === 'cm' ? '170' : '5'} /></View>
        <Text style={styles.unitLabel}>{value.heightUnit === 'cm' ? 'cm' : 'ft'}</Text>
        {value.heightUnit === 'ft' && <><View style={styles.flex}><Input value={value.heightInches} onChangeText={(heightInches) => set({ heightInches })} keyboardType="decimal-pad" placeholder="7" /></View><Text style={styles.unitLabel}>in</Text></>}
      </View>

      <View style={styles.labelRow}><Text style={styles.label}>Weight</Text><View style={styles.units}><Choice label="kg" active={value.weightUnit === 'kg'} onPress={() => switchWeightUnit('kg')} /><Choice label="lb" active={value.weightUnit === 'lb'} onPress={() => switchWeightUnit('lb')} /></View></View>
      <View style={styles.inputRow}><View style={styles.flex}><Input value={value.weight} onChangeText={(weight) => set({ weight })} keyboardType="decimal-pad" placeholder={value.weightUnit === 'kg' ? '70' : '154'} /></View><Text style={styles.unitLabel}>{value.weightUnit}</Text></View>

      <Input label="Age" value={value.age} onChangeText={(age) => set({ age })} keyboardType="number-pad" placeholder="35" />
      <Input label="Body Fat % (Optional)" value={value.bodyFat} onChangeText={(bodyFat) => set({ bodyFat })} keyboardType="decimal-pad" placeholder="18" />
      <View><Input label={`Muscle Mass (${value.weightUnit}) (Optional)`} value={value.muscleMass} onChangeText={(muscleMass) => set({ muscleMass })} keyboardType="decimal-pad" placeholder={value.weightUnit === 'kg' ? '30' : '66'} /><Text style={styles.helper}>Use a smart scale or body-composition scan if available.</Text></View>
    </View>
  )
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[styles.choice, active && styles.choiceActive]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: active }}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label.toUpperCase()}</Text></TouchableOpacity>
}

function round(value: number, places: number) { return String(roundNumber(value, places)) }
function roundNumber(value: number, places: number) { const factor = 10 ** places; return Math.round(value * factor) / factor }

const styles = StyleSheet.create({
  fields: { gap: 13 },
  label: { color: colors.textSecondary, fontFamily: type.display, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segmented: { flexDirection: 'row', gap: 8 },
  units: { flexDirection: 'row', gap: 5 },
  choice: { minHeight: 42, flex: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.primary },
  choiceText: { color: colors.textSecondary, fontFamily: type.display, fontWeight: '800', letterSpacing: 0.5 },
  choiceTextActive: { color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  unitLabel: { minWidth: 24, color: colors.textSecondary, fontSize: 14 },
  helper: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
})
