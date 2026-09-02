import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Input } from '../ui/Input'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { getExerciseIndex, suggestExercises, type ExerciseSummary, type PickedExercise } from '../../lib/wger'
import { suggestCommonExercises, type CommonExercise } from '../../constants/commonExercises'
import { colors, radius, type } from '../../constants/theme'
import type { ExerciseType } from '../../types/app'

interface ExerciseAutosuggestProps {
  value: string
  imageUrl: string | null
  /** Exercise names this user has logged before — ranked above the library. */
  recent: string[]
  onChangeText: (value: string) => void
  onPickLibrary: (picked: PickedExercise) => void
  onPickName: (name: string, exerciseType?: ExerciseType) => void
  onCommit: () => void
  onOpenLibrary: () => void
}

type Suggestion =
  | { kind: 'recent'; name: string }
  | { kind: 'common'; exercise: CommonExercise }
  | { kind: 'library'; exercise: ExerciseSummary }

export function ExerciseAutosuggest({
  value, imageUrl, recent, onChangeText, onPickLibrary, onPickName, onCommit, onOpenLibrary,
}: ExerciseAutosuggestProps) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState<ExerciseSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  // Suppresses the list right after a pick, so choosing "Push Up" doesn't
  // immediately re-open the menu with "Push Up" as the new query.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  const query = useDebouncedValue(value, 180)

  // Tapping a suggestion blurs the input, and closing the list on blur unmounts
  // the row mid-press so the tap never lands. So the close is deferred and the
  // press cancels it — the reason selecting an exercise silently did nothing.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }
  // onCommit rides along with the close: it looks up history for whatever is
  // typed, so firing it on a raw blur would race the pick's own lookup and
  // could overwrite the result with an empty one for the half-typed text.
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => { setOpen(false); onCommit() }, 200)
  }
  useEffect(() => cancelClose, [])

  // The index is bulk-fetched once per session and cached in the module, so
  // this only actually hits the network for the first field that opens.
  useEffect(() => {
    if (!open || index || loading) return
    setLoading(true)
    getExerciseIndex()
      .then(setIndex)
      .catch(() => setIndex([]))
      .finally(() => setLoading(false))
  }, [open, index, loading])

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []

    const seen = new Set<string>()
    const out: Suggestion[] = []

    // Your own vocabulary first: repeating an exercise you already track is the
    // common case, and it keeps Tale of the Tape matching on the same name.
    for (const name of recent) {
      const lower = name.toLowerCase()
      if (lower.startsWith(q) && !seen.has(lower)) {
        seen.add(lower)
        out.push({ kind: 'recent', name })
      }
      if (out.length >= 3) break
    }

    // Curated staples next. wger's index is small and misses most plainly-named
    // movements, so without these "push" would never offer "Push Up".
    for (const exercise of suggestCommonExercises(q, 5)) {
      const lower = exercise.name.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)
      out.push({ kind: 'common', exercise })
      if (out.length >= 6) break
    }

    for (const exercise of suggestExercises(index ?? [], q, 6)) {
      const lower = exercise.name.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)
      out.push({ kind: 'library', exercise })
      if (out.length >= 7) break
    }
    return out
  }, [query, recent, index])

  const showList = open && dismissedFor !== value && (suggestions.length > 0 || loading)

  function pickRecent(name: string) {
    cancelClose()
    setDismissedFor(name)
    setOpen(false)
    onPickName(name)
  }

  function pickCommon(exercise: CommonExercise) {
    cancelClose()
    setDismissedFor(exercise.name)
    setOpen(false)
    onPickName(exercise.name, exercise.type)
  }

  function pickLibrary(exercise: ExerciseSummary) {
    cancelClose()
    setDismissedFor(exercise.name)
    setOpen(false)
    onPickLibrary({ exerciseId: exercise.id, name: exercise.name, imageUrl: exercise.imageUrl })
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {imageUrl && <Image source={{ uri: imageUrl }} style={styles.thumbnail} contentFit="cover" />}
        <View style={styles.flex1}>
          <Input
            placeholder="Exercise name"
            value={value}
            onChangeText={(next) => { setDismissedFor(null); onChangeText(next) }}
            onFocus={() => { cancelClose(); setOpen(true) }}
            onBlur={scheduleClose}
          />
        </View>
        <TouchableOpacity style={styles.libraryButton} onPress={onOpenLibrary} accessibilityLabel="Search exercise library">
          <Ionicons name="search" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Rendered inline rather than as a floating overlay: the exercise card
          sets overflow:hidden for its rail, which would clip an absolutely
          positioned dropdown on Android. */}
      {showList && (
        <View style={styles.list}>
          {loading && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading exercise library…</Text>
            </View>
          ) : (
            suggestions.map((item) => item.kind === 'recent' ? (
              <TouchableOpacity
                key={`r:${item.name}`}
                style={styles.item}
                onPressIn={cancelClose}
                onPress={() => pickRecent(item.name)}
                accessibilityRole="button"
              >
                <View style={styles.recentBadge}><Ionicons name="repeat" size={12} color={colors.gold} /></View>
                <Text style={styles.itemText} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemTag}>YOURS</Text>
              </TouchableOpacity>
            ) : item.kind === 'common' ? (
              <TouchableOpacity
                key={`c:${item.exercise.name}`}
                style={styles.item}
                onPressIn={cancelClose}
                onPress={() => pickCommon(item.exercise)}
                accessibilityRole="button"
              >
                <View style={styles.commonBadge}>
                  <Ionicons name={item.exercise.type === 'cardio' ? 'walk' : 'barbell'} size={13} color={colors.primary} />
                </View>
                <Text style={styles.itemText} numberOfLines={1}>{item.exercise.name}</Text>
                {item.exercise.type === 'cardio' && <Text style={styles.cardioTag}>CARDIO</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={`l:${item.exercise.id}`}
                style={styles.item}
                onPressIn={cancelClose}
                onPress={() => pickLibrary(item.exercise)}
                accessibilityRole="button"
              >
                {item.exercise.imageUrl
                  ? <Image source={{ uri: item.exercise.imageUrl }} style={styles.itemThumb} contentFit="cover" />
                  : <View style={[styles.itemThumb, styles.itemThumbEmpty]}><Ionicons name="barbell-outline" size={13} color={colors.textMuted} /></View>}
                <Text style={styles.itemText} numberOfLines={1}>{item.exercise.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1 },
  thumbnail: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surface },
  libraryButton: {
    width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.primaryGlow,
    borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  list: {
    marginTop: 6,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.surface,
    borderRadius: radius.sm, overflow: 'hidden',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  loadingText: { color: colors.textMuted, fontSize: 12 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemThumb: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: colors.card },
  itemThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  recentBadge: {
    width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.goldDark,
  },
  itemText: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '700', textTransform: 'uppercase' },
  itemTag: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  commonBadge: {
    width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primaryDark,
  },
  cardioTag: { color: colors.cornerBlue, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
})
