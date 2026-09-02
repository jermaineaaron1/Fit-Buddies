import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import { WeightTrendChart } from '../../../src/components/body/WeightTrendChart'
import { CompositionSummaryCard } from '../../../src/components/body/CompositionSummaryCard'
import {
  loadMeasurements, saveMeasurement, summarise,
  type BodyMeasurement, type MeasurementSource,
} from '../../../src/lib/bodyComposition'
import { estimateBaseMaintenance } from '../../../src/lib/energyEstimates'
import { pickPhoto } from '../../../src/lib/photoPicker'
import { analyseBodyScan, type BodyScanResult } from '../../../src/lib/bodyScan'
import { colors, combatChip, radius, type } from '../../../src/constants/theme'

const SOURCES: { value: MeasurementSource; label: string }[] = [
  { value: 'manual', label: 'By hand' },
  { value: 'scale', label: 'Smart scale' },
  { value: 'inbody', label: 'InBody' },
]

export default function LogBodyScreen() {
  const { profile } = useAuthStore()

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([])
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [muscle, setMuscle] = useState('')
  const [visceral, setVisceral] = useState('')
  const [source, setSource] = useState<MeasurementSource>('manual')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [averageCalories, setAverageCalories] = useState<number | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scan, setScan] = useState<BodyScanResult | null>(null)
  const [measuredOn, setMeasuredOn] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    const rows = await loadMeasurements(profile.id)
    setMeasurements(rows)

    // Average daily intake over the same span the summary covers, so the
    // energy-balance comparison lines up with the weight change.
    const since = new Date(Date.now() - 30 * 86400000)
    const { data: meals } = await supabase
      .from('meal_logs')
      .select('calories, logged_at')
      .eq('user_id', profile.id)
      .gte('logged_at', since.toISOString())

    const byDay = new Map<string, number>()
    for (const meal of meals ?? []) {
      if (meal.calories === null) continue
      const day = String(meal.logged_at).split('T')[0]
      byDay.set(day, (byDay.get(day) ?? 0) + Number(meal.calories))
    }
    // Averaged over days actually logged — dividing by 30 would invent zero-calorie
    // days for anyone who doesn't log every single day and skew the estimate low.
    setAverageCalories(byDay.size ? Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size) : null)
  }, [profile?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const summary = useMemo(() => summarise(measurements), [measurements])
  const maintenance = profile ? estimateBaseMaintenance(profile) : null

  async function handleScan(imageSource: 'camera' | 'library') {
    if (!profile?.id) return
    setMessage(null)
    const picked = await pickPhoto(imageSource)
    if (!picked) return
    if (picked.reason) { setMessage({ tone: 'error', text: picked.reason }); return }

    setScanning(true)
    const outcome = await analyseBodyScan(picked.uri, profile.id)
    setScanning(false)
    if (!outcome.ok) { setMessage({ tone: 'error', text: outcome.error }); return }

    // Prefills the form rather than saving. A misread digit on body fat would
    // bend the trend line silently, so every value gets confirmed by a person.
    const result = outcome.scan
    setScan(result)
    if (result.weight_kg !== null) setWeight(String(result.weight_kg))
    if (result.body_fat_percentage !== null) setBodyFat(String(result.body_fat_percentage))
    if (result.skeletal_muscle_mass_kg !== null) setMuscle(String(result.skeletal_muscle_mass_kg))
    if (result.visceral_fat_level !== null) setVisceral(String(result.visceral_fat_level))
    setSource('inbody')
    // The sheet's own test date wins, so back-filling an old printout records
    // it on the day it was actually taken.
    setMeasuredOn(/^\d{4}-\d{2}-\d{2}$/.test(result.measured_on) ? result.measured_on : null)
  }

  async function handleSave() {
    if (!profile?.id) return
    const weightValue = weight.trim() ? Number(weight) : null
    if (weightValue !== null && (!Number.isFinite(weightValue) || weightValue <= 20 || weightValue >= 400)) {
      setMessage({ tone: 'error', text: 'Enter a weight between 20 and 400 kg.' })
      return
    }
    const bodyFatValue = bodyFat.trim() ? Number(bodyFat) : null
    if (bodyFatValue !== null && (!Number.isFinite(bodyFatValue) || bodyFatValue < 1 || bodyFatValue > 75)) {
      setMessage({ tone: 'error', text: 'Body fat should be between 1 and 75%.' })
      return
    }
    if (weightValue === null && bodyFatValue === null) {
      setMessage({ tone: 'error', text: 'Enter at least a weight or a body fat reading.' })
      return
    }

    setSaving(true)
    const { error } = await saveMeasurement({
      userId: profile.id,
      measuredAt: measuredOn ?? new Date().toISOString().split('T')[0],
      scanPath: scan?.scanPath ?? null,
      muscleMassBasis: scan ? 'skeletal' : null,
      weightKg: weightValue,
      bodyFatPercentage: bodyFatValue,
      muscleMassKg: muscle.trim() ? Number(muscle) : null,
      visceralFatRating: visceral.trim() ? Number(visceral) : null,
      source,
      notes: notes.trim() || null,
    })
    setSaving(false)

    if (error) { setMessage({ tone: 'error', text: error }); return }
    setMessage({
      tone: 'ok',
      text: measuredOn ? `Saved against the sheet's date, ${measuredOn}.` : "Saved. Today's entry is recorded.",
    })
    setWeight(''); setBodyFat(''); setMuscle(''); setVisceral(''); setNotes('')
    setScan(null); setMeasuredOn(null); setSource('manual')
    load()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={styles.eyebrow}>THE TALE OF THE SCALE</Text>
        <Text style={styles.title}>Weigh-In</Text>
        <Text style={styles.subtitle}>
          Weight alone can't tell you whether you're losing fat or losing muscle. Add body fat and it can.
        </Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardLabel}>WEIGHT TREND</Text>
        <WeightTrendChart measurements={measurements} />
      </View>

      <CompositionSummaryCard
        summary={summary}
        averageDailyCalories={averageCalories}
        maintenanceCalories={maintenance}
      />

      <View style={styles.scanCard}>
        <View style={styles.scanHead}>
          <Ionicons name="document-text-outline" size={17} color={colors.gold} />
          <View style={styles.flex1}>
            <Text style={styles.cardLabel}>GOT AN INBODY SHEET?</Text>
            <Text style={styles.scanTitle}>Scan the Printout</Text>
          </View>
        </View>
        <Text style={styles.scanBlurb}>
          Photograph the results sheet and the numbers get read off it. You check them before anything is saved.
        </Text>

        {scanning ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.tip}>Reading the sheet…</Text>
          </View>
        ) : (
          <View style={styles.scanActions}>
            <TouchableOpacity style={styles.scanAction} onPress={() => handleScan('camera')} accessibilityRole="button">
              <Ionicons name="camera-outline" size={17} color={colors.primary} />
              <Text style={styles.scanActionText}>Photograph</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanAction} onPress={() => handleScan('library')} accessibilityRole="button">
              <Ionicons name="images-outline" size={17} color={colors.primary} />
              <Text style={styles.scanActionText}>From library</Text>
            </TouchableOpacity>
          </View>
        )}

        {scan && (
          <View style={styles.scanResult}>
            <Text style={styles.scanResultText}>
              Read from {scan.device || 'the sheet'}
              {measuredOn ? ` · dated ${measuredOn}` : ' · no date found, saving as today'}
              {scan.units_were_pounds ? ' · converted from lb' : ''}
            </Text>
            {scan.unreadable_fields.length > 0 && (
              <Text style={styles.scanWarning}>
                Couldn't read: {scan.unreadable_fields.join(', ')} — type those in yourself.
              </Text>
            )}
            {!!scan.notes && <Text style={styles.tip}>{scan.notes}</Text>}
            <Text style={styles.tip}>
              Muscle figure is Skeletal Muscle Mass, which reads lower than the number most bathroom
              scales show. Compare InBody with InBody.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.cardLabel}>
          {measuredOn ? `NUMBERS FOR ${measuredOn}` : "TODAY'S NUMBERS"}
        </Text>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 78.4" />
          </View>
          <View style={styles.flex1}>
            <Input label="Body fat (%)" value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" placeholder="e.g. 22.5" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex1}>
            <Input label="Muscle mass (kg)" value={muscle} onChangeText={setMuscle} keyboardType="decimal-pad" placeholder="optional" />
          </View>
          <View style={styles.flex1}>
            <Input label="Visceral fat" value={visceral} onChangeText={setVisceral} keyboardType="decimal-pad" placeholder="optional" />
          </View>
        </View>

        <View>
          <Text style={styles.label}>WHERE FROM?</Text>
          <View style={styles.chipRow}>
            {SOURCES.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.chip, source === option.value && styles.chipActive]}
                onPress={() => setSource(option.value)}
              >
                <Text style={[styles.chipText, source === option.value && styles.chipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Fasted, post-workout, after a big weekend…" multiline />

        <Button label="Save Weigh-In" onPress={handleSave} loading={saving} />

        {message && (
          <View style={[styles.message, message.tone === 'error' && styles.messageError]}>
            <Ionicons
              name={message.tone === 'error' ? 'alert-circle' : 'checkmark-circle'}
              size={15}
              color={message.tone === 'error' ? colors.danger : colors.gold}
            />
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        )}

        <Text style={styles.tip}>
          Weigh under the same conditions each time — first thing, after the toilet, before eating.
          Consistency matters far more than the time of day you pick.
        </Text>
      </View>

      {measurements.length > 0 && (
        <View style={styles.historyCard}>
          <Text style={styles.cardLabel}>HISTORY</Text>
          {[...measurements].reverse().slice(0, 12).map((row) => (
            <View key={row.id} style={styles.historyRow}>
              <Text style={styles.historyDate}>
                {new Date(row.measured_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={styles.historyValue}>{row.weight_kg !== null ? `${row.weight_kg}kg` : '—'}</Text>
              <Text style={styles.historyMeta}>
                {row.body_fat_percentage !== null ? `${row.body_fat_percentage}% fat` : 'no body fat'}
                {row.source !== 'manual' ? ` · ${row.source}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 14, paddingTop: 14, paddingBottom: 96 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 30, fontWeight: '900', textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 4, lineHeight: 18 },
  chartCard: { gap: 8, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  formCard: { gap: 12, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: colors.card },
  historyCard: { gap: 6, padding: 14, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  cardLabel: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: combatChip.base,
  chipActive: { ...combatChip.active, backgroundColor: colors.primary },
  chipText: combatChip.text,
  chipTextActive: combatChip.textActive,
  message: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.accentGlow,
  },
  messageError: { borderColor: colors.danger, backgroundColor: colors.crimsonGlow },
  messageText: { color: colors.text, fontSize: 12, flex: 1 },
  tip: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  scanCard: {
    gap: 10, padding: 14, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#1A1508',
  },
  scanHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  scanTitle: { color: colors.text, fontFamily: type.display, fontSize: 19, fontWeight: '900', textTransform: 'uppercase' },
  scanBlurb: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  scanActions: { flexDirection: 'row', gap: 9 },
  scanAction: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryGlow,
  },
  scanActionText: { color: colors.text, fontFamily: type.display, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  scanResult: { gap: 5, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.goldDark },
  scanResultText: { color: colors.textSecondary, fontSize: 11 },
  scanWarning: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  historyDate: { color: colors.textMuted, fontSize: 11, width: 58 },
  historyValue: { color: colors.text, fontFamily: type.display, fontSize: 16, fontWeight: '800', width: 70 },
  historyMeta: { color: colors.textSecondary, fontSize: 11, flex: 1 },
})
