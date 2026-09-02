import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Input } from '../ui/Input'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { searchFoods, type FoodResult, type QuantityUnit } from '../../lib/openFoodFacts'
import { MALAYSIAN_FOODS } from '../../constants/malaysianFoods'
import { colors, radius, type } from '../../constants/theme'

// A meal you've already logged, replayed exactly — same quantity, same macros.
// meal_logs stores macros for the portion eaten, not per 100 g, so these can't
// be treated as a FoodResult and rescaled; they're applied verbatim.
export interface RecentFood {
  name: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  quantity: number | null
  unit: QuantityUnit | null
  imageUrl: string | null
}

interface FoodAutosuggestProps {
  value: string
  selectedImageUrl: string | null
  recent: RecentFood[]
  onChangeText: (value: string) => void
  onPickFood: (food: FoodResult) => void
  onPickRecent: (food: RecentFood) => void
  onOpenLibrary: () => void
}

type Suggestion =
  | { kind: 'recent'; food: RecentFood }
  | { kind: 'food'; food: FoodResult }

// Prefix matches first so "nas" offers Nasi lemak before Roti nasi.
function rankLocal(query: string, limit: number): FoodResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const prefix: FoodResult[] = []
  const contains: FoodResult[] = []
  for (const food of MALAYSIAN_FOODS) {
    const name = food.name.toLowerCase()
    if (name.startsWith(q)) prefix.push(food)
    else if (name.includes(q) && contains.length < limit) contains.push(food)
  }
  return [...prefix, ...contains].slice(0, limit)
}

export function FoodAutosuggest({
  value, selectedImageUrl, recent, onChangeText, onPickFood, onPickRecent, onOpenLibrary,
}: FoodAutosuggestProps) {
  const [open, setOpen] = useState(false)
  const [remote, setRemote] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  // Longer than the exercise field's debounce: that one filters a cached index
  // locally, whereas every keystroke here can cost a network call against an
  // endpoint that throttles aggressively.
  const query = useDebouncedValue(value, 450)

  // Same cancellable-close dance as the exercise field: closing on blur would
  // unmount the row mid-press and swallow the tap.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 200)
  }
  useEffect(() => cancelClose, [])

  // Open Food Facts is a live lookup, unlike the exercise index. Local results
  // render instantly; remote ones land when they arrive. `cancelled` guards
  // against a slow earlier query overwriting a newer one.
  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) { setRemote([]); return }
    let cancelled = false
    setLoading(true)
    searchFoods(q)
      .then((results) => { if (!cancelled) setRemote(results.slice(0, 8)) })
      .catch(() => { if (!cancelled) setRemote([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query, open])

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const seen = new Set<string>()
    const out: Suggestion[] = []

    for (const food of recent) {
      const key = food.name.toLowerCase()
      if (!key.includes(q) || seen.has(key)) continue
      seen.add(key)
      out.push({ kind: 'recent', food })
      if (out.length >= 3) break
    }

    for (const food of rankLocal(q, 5)) {
      const key = food.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ kind: 'food', food })
      if (out.length >= 6) break
    }

    for (const food of remote) {
      const key = food.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ kind: 'food', food })
      if (out.length >= 9) break
    }
    return out
  }, [query, recent, remote])

  const showList = open && dismissedFor !== value && (suggestions.length > 0 || loading)

  function choose(name: string, apply: () => void) {
    cancelClose()
    setDismissedFor(name)
    setOpen(false)
    apply()
  }

  return (
    <View>
      <View style={styles.row}>
        {selectedImageUrl && <Image source={{ uri: selectedImageUrl }} style={styles.thumbnail} contentFit="cover" />}
        <View style={styles.flex1}>
          <Input
            label="Selected Food"
            value={value}
            onChangeText={(next) => { setDismissedFor(null); onChangeText(next) }}
            onFocus={() => { cancelClose(); setOpen(true) }}
            onBlur={scheduleClose}
            placeholder="e.g. Chicken rice bowl"
            autoCapitalize="words"
          />
        </View>
        <TouchableOpacity style={styles.libraryBtn} onPress={onOpenLibrary} accessibilityLabel="Browse the full food library">
          <Ionicons name="search" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Inline rather than floating — an absolute dropdown gets clipped by
          ancestors with overflow:hidden on Android. */}
      {showList && (
        <View style={styles.list}>
          {suggestions.map((item, i) => item.kind === 'recent' ? (
            <TouchableOpacity
              key={`r:${item.food.name}:${i}`}
              style={styles.item}
              onPressIn={cancelClose}
              onPress={() => choose(item.food.name, () => onPickRecent(item.food))}
              accessibilityRole="button"
            >
              <View style={styles.recentBadge}><Ionicons name="repeat" size={12} color={colors.gold} /></View>
              <View style={styles.flex1}>
                <Text style={styles.itemText} numberOfLines={1}>{item.food.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.food.calories !== null ? `${Math.round(item.food.calories)} kcal` : 'No macros'}
                  {item.food.quantity ? ` · ${item.food.quantity}${item.food.unit ?? ''}` : ''}
                </Text>
              </View>
              <Text style={styles.itemTag}>AGAIN</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={`f:${item.food.code}:${i}`}
              style={styles.item}
              onPressIn={cancelClose}
              onPress={() => choose(item.food.name, () => onPickFood(item.food))}
              accessibilityRole="button"
            >
              {item.food.imageUrl
                ? <Image source={{ uri: item.food.imageUrl }} style={styles.itemThumb} contentFit="cover" />
                : <View style={[styles.itemThumb, styles.itemThumbEmpty]}><Ionicons name="restaurant-outline" size={13} color={colors.textMuted} /></View>}
              <View style={styles.flex1}>
                <Text style={styles.itemText} numberOfLines={1}>{item.food.name}</Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {item.food.caloriesPer100g !== null ? `${Math.round(item.food.caloriesPer100g)} kcal/100g` : 'No macros'}
                  {item.food.brand ? ` · ${item.food.brand}` : ''}
                </Text>
              </View>
              {item.food.source === 'myfcd' && <Text style={styles.localTag}>LOCAL</Text>}
            </TouchableOpacity>
          ))}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Searching food database…</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  flex1: { flex: 1 },
  thumbnail: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surface },
  libraryBtn: {
    width: 46, height: 46, borderRadius: radius.sm, backgroundColor: colors.primaryGlow,
    borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  list: {
    marginTop: 6,
    borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.surface,
    borderRadius: radius.sm, overflow: 'hidden',
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemThumb: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: colors.card },
  itemThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  recentBadge: {
    width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.goldDark,
  },
  itemText: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '700', textTransform: 'uppercase' },
  itemMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  itemTag: { color: colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  localTag: { color: colors.cornerBlue, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 },
  loadingText: { color: colors.textMuted, fontSize: 12 },
})
