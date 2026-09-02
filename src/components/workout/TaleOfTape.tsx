import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { colors, radius, type } from '../../constants/theme'
import type { ExerciseType, WeightMode, CardioIntensity } from '../../types/app'

export interface HistoryEntry {
  id: string
  date: string
  workoutTitle: string
  exerciseType: ExerciseType
  weight: number
  reps: number
  sets: number
  volume: number
  weightMode: WeightMode | null
  durationSeconds: number
  distanceKm: number | null
  avgHeartRateBpm: number | null
  cardioIntensity: CardioIntensity | null
}

interface TaleOfTapeProps {
  current: { exercise_type: ExerciseType; weight_kg: number | null; reps: number | null; sets: number | null; duration_seconds: number | null; distance_km: number | null }
  entries: HistoryEntry[]
  selectedIndex: number
  onSelect: (index: number) => void
}

// Per-exercise "how does today compare to your history" comparison, shown
// while filling in an exercise row. Dispatches to a strength (weight × reps,
// volume) or cardio (duration, distance, pace) variant depending on the
// exercise's current type.
export function TaleOfTape({ current, entries, selectedIndex, onSelect }: TaleOfTapeProps) {
  if (current.exercise_type === 'cardio') {
    return <CardioTaleOfTape current={current} entries={entries} selectedIndex={selectedIndex} onSelect={onSelect} />
  }
  return <StrengthTaleOfTape current={current} entries={entries} selectedIndex={selectedIndex} onSelect={onSelect} />
}

function StrengthTaleOfTape({ current, entries, selectedIndex, onSelect }: TaleOfTapeProps) {
  const selected = entries[selectedIndex] ?? entries[0]
  const weight = Number(current.weight_kg ?? 0), reps = Number(current.reps ?? 0), sets = Number(current.sets ?? 0)
  const volume = weight * reps * sets, loadDelta = weight - selected.weight, volumeDelta = volume - selected.volume
  const loadPct = selected.weight ? loadDelta / selected.weight * 100 : 0
  const maximum = Math.max(weight, ...entries.map((entry) => entry.weight), 1)
  return <View style={styles.tapeSection}>
    <LinearGradient colors={['#2A0B0B', '#130E0E']} style={styles.tapeCard}>
      <View style={styles.tapeHeading}><Text style={styles.eyebrow}>TALE OF THE TAPE</Text><Text style={styles.tapeTitle}>Today's best vs. selected bout</Text></View>
      <View style={styles.tapeSides}><View style={styles.tapeSide}><Text style={styles.pastDate}>{longDate(selected.date)}</Text><Text style={styles.bigNumber}>{selected.weight || '—'} kg × {selected.reps || '—'}</Text><Text style={styles.muted}>{Math.round(selected.volume).toLocaleString()} kg volume</Text></View><View style={styles.versus}><Text style={styles.versusText}>VS</Text></View><View style={[styles.tapeSide, styles.alignRight]}><Text style={styles.muted}>TODAY</Text><Text style={styles.bigNumber}>{weight || '—'} kg × {reps || '—'}</Text><Text style={loadDelta >= 0 ? styles.positive : styles.negative}>{weight ? `${signed(loadPct, 1)}% load` : 'Enter your set'}</Text></View></View>
    </LinearGradient>
    <View style={styles.deltaStrip}><Text style={styles.deltaLabel}>LONGER-TERM GAIN</Text><Text style={volumeDelta >= 0 ? styles.positive : styles.negative}>{volume ? `${signed(volumeDelta, 0)} kg total volume` : 'Waiting for today’s numbers'}</Text></View>
    <View style={styles.historyHeader}><View><Text style={styles.eyebrow}>FIGHT HISTORY</Text><Text style={styles.historyTitle}>Previous sessions</Text></View><Text style={styles.muted}>Best set load</Text></View>
    <View style={styles.chart}>{entries.slice().reverse().map((entry, reverseIndex) => { const originalIndex = entries.length - 1 - reverseIndex; return <HistoryBar key={entry.id} label={shortDate(entry.date)} value={entry.weight} maximum={maximum} selected={originalIndex === selectedIndex} onPress={() => onSelect(originalIndex)} /> })}<HistoryBar label="TODAY" value={weight} maximum={maximum} today /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRow}>{entries.map((entry, i) => <TouchableOpacity key={entry.id} style={[styles.sessionButton, i === selectedIndex && styles.sessionSelected]} onPress={() => onSelect(i)} accessibilityRole="radio" accessibilityState={{ checked: i === selectedIndex }}><Text style={styles.sessionDate}>{shortDate(entry.date)}</Text><Text style={styles.sessionWeight}>{entry.weight} kg × {entry.reps}</Text><Text style={styles.sessionDelta}>{weight ? `${signed((weight - entry.weight) / Math.max(entry.weight, 1) * 100, 1)}%` : 'Compare'}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.changeCard}><Text style={styles.changeTitle}>What changed since {shortDate(selected.date)}</Text><ComparisonRow label="Load" value={`${signed(loadDelta, 1)} kg`} progress={Math.min(1, Math.abs(loadDelta) / 15)} positive={loadDelta >= 0} /><ComparisonRow label="Volume" value={`${signed(volumeDelta, 0)} kg`} progress={Math.min(1, Math.abs(volumeDelta) / 500)} positive={volumeDelta >= 0} /></View>
  </View>
}

function CardioTaleOfTape({ current, entries, selectedIndex, onSelect }: TaleOfTapeProps) {
  const selected = entries[selectedIndex] ?? entries[0]
  const durationSeconds = current.duration_seconds ?? 0
  const durationMin = durationSeconds / 60
  const distanceKm = current.distance_km ?? null
  const durationDelta = durationMin - selected.durationSeconds / 60
  const distanceDelta = distanceKm !== null && selected.distanceKm !== null ? distanceKm - selected.distanceKm : null
  const pace = distanceKm ? durationMin / distanceKm : null
  const selectedPace = selected.distanceKm ? selected.durationSeconds / 60 / selected.distanceKm : null
  const paceDelta = pace !== null && selectedPace !== null ? pace - selectedPace : null
  const maximum = Math.max(durationMin, ...entries.map((entry) => entry.durationSeconds / 60), 1)
  return <View style={styles.tapeSection}>
    <LinearGradient colors={['#2A0B0B', '#130E0E']} style={styles.tapeCard}>
      <View style={styles.tapeHeading}><Text style={styles.eyebrow}>TALE OF THE TAPE</Text><Text style={styles.tapeTitle}>Today's best vs. selected bout</Text></View>
      <View style={styles.tapeSides}>
        <View style={styles.tapeSide}>
          <Text style={styles.pastDate}>{longDate(selected.date)}</Text>
          <Text style={styles.bigNumber}>{formatDuration(selected.durationSeconds / 60)}{selected.distanceKm ? ` · ${selected.distanceKm}km` : ''}</Text>
          <Text style={styles.muted}>{selectedPace ? `${selectedPace.toFixed(1)} min/km` : 'No distance logged'}</Text>
        </View>
        <View style={styles.versus}><Text style={styles.versusText}>VS</Text></View>
        <View style={[styles.tapeSide, styles.alignRight]}>
          <Text style={styles.muted}>TODAY</Text>
          <Text style={styles.bigNumber}>{formatDuration(durationMin)}{distanceKm ? ` · ${distanceKm}km` : ''}</Text>
          <Text style={durationDelta >= 0 ? styles.positive : styles.negative}>
            {durationSeconds ? (paceDelta !== null ? `${signed(-paceDelta, 1)} min/km pace` : `${signed(durationDelta, 1)} min`) : 'Log your session'}
          </Text>
        </View>
      </View>
    </LinearGradient>
    <View style={styles.historyHeader}><View><Text style={styles.eyebrow}>FIGHT HISTORY</Text><Text style={styles.historyTitle}>Previous sessions</Text></View><Text style={styles.muted}>Minutes</Text></View>
    <View style={styles.chart}>{entries.slice().reverse().map((entry, reverseIndex) => { const originalIndex = entries.length - 1 - reverseIndex; return <HistoryBar key={entry.id} label={shortDate(entry.date)} value={Math.round(entry.durationSeconds / 60)} maximum={maximum} selected={originalIndex === selectedIndex} onPress={() => onSelect(originalIndex)} /> })}<HistoryBar label="TODAY" value={Math.round(durationMin)} maximum={maximum} today /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionRow}>{entries.map((entry, i) => <TouchableOpacity key={entry.id} style={[styles.sessionButton, i === selectedIndex && styles.sessionSelected]} onPress={() => onSelect(i)} accessibilityRole="radio" accessibilityState={{ checked: i === selectedIndex }}><Text style={styles.sessionDate}>{shortDate(entry.date)}</Text><Text style={styles.sessionWeight}>{formatDuration(entry.durationSeconds / 60)}</Text><Text style={styles.sessionDelta}>{entry.distanceKm ? `${entry.distanceKm}km` : 'Compare'}</Text></TouchableOpacity>)}</ScrollView>
    <View style={styles.changeCard}>
      <Text style={styles.changeTitle}>What changed since {shortDate(selected.date)}</Text>
      <ComparisonRow label="Duration" value={`${signed(durationDelta, 1)} min`} progress={Math.min(1, Math.abs(durationDelta) / 20)} positive={durationDelta >= 0} />
      {distanceDelta !== null ? (
        <ComparisonRow label="Distance" value={`${signed(distanceDelta, 1)} km`} progress={Math.min(1, Math.abs(distanceDelta) / 5)} positive={distanceDelta >= 0} />
      ) : (
        <Text style={styles.muted}>Log distance on both sessions to compare pace.</Text>
      )}
    </View>
  </View>
}

function HistoryBar({ label, value, maximum, selected = false, today = false, onPress }: { label: string; value: number; maximum: number; selected?: boolean; today?: boolean; onPress?: () => void }) {
  const height = useSharedValue(8)
  useEffect(() => { height.value = withTiming(Math.max(8, value / maximum * 68), { duration: 420 }) }, [value, maximum, height])
  const animatedStyle = useAnimatedStyle(() => ({ height: height.value }))
  return <TouchableOpacity style={styles.barColumn} onPress={onPress} disabled={today} accessibilityLabel={`${label}, ${value}`}><Text style={[styles.barValue, (selected || today) && styles.barActiveText]}>{value || '—'}</Text><View style={styles.barTrack}><Animated.View style={[styles.bar, selected && styles.barSelected, today && styles.barToday, animatedStyle]} /></View><Text style={[styles.barDate, (selected || today) && styles.barActiveText]}>{label}</Text></TouchableOpacity>
}

function ComparisonRow({ label, value, progress, positive }: { label: string; value: string; progress: number; positive: boolean }) {
  return <View style={styles.comparisonRow}><Text style={styles.comparisonLabel}>{label}</Text><View style={styles.comparisonTrack}><View style={[styles.comparisonFill, { width: `${Math.max(8, progress * 100)}%` }, !positive && styles.negativeFill]} /></View><Text style={[styles.comparisonValue, positive ? styles.positive : styles.negative]}>{value}</Text></View>
}

function formatDuration(minutes: number) {
  if (!minutes) return '—'
  return `${minutes.toFixed(minutes < 10 ? 1 : 0)} min`
}
function shortDate(date: string) { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() }
function longDate(date: string) { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() }
function signed(value: number, decimals: number) { const rounded = Number(value.toFixed(decimals)); return `${rounded >= 0 ? '+' : ''}${rounded}` }

const styles = StyleSheet.create({
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  muted: { color: colors.textMuted, fontSize: 10 },
  tapeSection: { gap: 10 },
  tapeCard: { padding: 13, borderTopWidth: 3, borderBottomWidth: 3, borderColor: colors.primary },
  tapeHeading: { alignItems: 'center', marginBottom: 10 },
  tapeTitle: { color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '800', textTransform: 'uppercase' },
  tapeSides: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tapeSide: { width: '41%' },
  alignRight: { alignItems: 'flex-end' },
  pastDate: { color: colors.gold, fontSize: 9, fontWeight: '800' },
  bigNumber: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '900', marginTop: 2 },
  versus: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.primary, transform: [{ rotate: '-8deg' }] },
  versusText: { color: colors.text, fontFamily: type.display, fontWeight: '900' },
  positive: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  negative: { color: colors.danger, fontSize: 10, fontWeight: '800' },
  deltaStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#251B08' },
  deltaLabel: { color: colors.gold, fontFamily: type.display, fontSize: 11, fontWeight: '900' },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  historyTitle: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  chart: { height: 108, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 5, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 96 },
  barValue: { color: colors.textMuted, fontSize: 9, marginBottom: 3 },
  barActiveText: { color: colors.text, fontWeight: '800' },
  barTrack: { height: 68, width: 15, justifyContent: 'flex-end', borderRadius: 4, backgroundColor: '#241919', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 4, backgroundColor: colors.primaryDark },
  barSelected: { backgroundColor: colors.gold },
  barToday: { backgroundColor: colors.primary },
  barDate: { color: colors.textMuted, fontSize: 8, marginTop: 3 },
  sessionRow: { gap: 7 },
  sessionButton: { minWidth: 91, minHeight: 68, padding: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  sessionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryGlow, borderBottomWidth: 3 },
  sessionDate: { color: colors.textMuted, fontSize: 9 },
  sessionWeight: { color: colors.text, fontFamily: type.display, fontSize: 14, fontWeight: '800', marginTop: 3 },
  sessionDelta: { color: colors.accent, fontSize: 10, fontWeight: '800', marginTop: 2 },
  changeCard: { gap: 8, padding: 11, borderRadius: radius.sm, borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: colors.surface },
  changeTitle: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '800', textTransform: 'uppercase' },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comparisonLabel: { width: 60, color: colors.textMuted, fontSize: 10 },
  comparisonTrack: { flex: 1, height: 5, overflow: 'hidden', borderRadius: 3, backgroundColor: colors.border },
  comparisonFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  negativeFill: { backgroundColor: colors.danger },
  comparisonValue: { width: 70, textAlign: 'right', fontSize: 10, fontWeight: '800' },
})
