import React, { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { Input } from '../ui/Input'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { featuredFoods, nutritionScore, searchFoods, type FoodResult } from '../../lib/openFoodFacts'

interface FoodPickerModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (food: FoodResult) => void
}

type LoadState = 'idle' | 'loading' | 'error' | 'success'

export function FoodPickerModal({ visible, onClose, onSelect }: FoodPickerModalProps) {
  const [query, setQuery] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [results, setResults] = useState<FoodResult[]>([])

  const debouncedQuery = useDebouncedValue(query, 450)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setLoadState('idle')
      setResults([])
    } else {
      setResults(featuredFoods())
      setLoadState('success')
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const q = debouncedQuery.trim()
    if (!q) {
      setLoadState('success')
      setResults(featuredFoods())
      return
    }
    let cancelled = false
    setLoadState('loading')
    searchFoods(q)
      .then((data) => {
        if (cancelled) return
        setResults(data)
        setLoadState('success')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, visible])

  function retry() {
    const q = debouncedQuery.trim()
    if (!q) return
    setLoadState('loading')
    searchFoods(q)
      .then((data) => {
        setResults(data)
        setLoadState('success')
      })
      .catch(() => setLoadState('error'))
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.screen}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>MALAYSIAN + GLOBAL LIBRARY</Text><Text style={styles.title}>Search Food</Text></View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Input value={query} onChangeText={setQuery} placeholder="e.g. chicken breast, banana..." autoCapitalize="none" />
        </View>

        {loadState === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {loadState === 'error' && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Couldn't reach the food database. Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {loadState === 'success' && (
          <FlatList
            style={styles.resultsList}
            data={results}
            keyExtractor={(f) => f.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListHeaderComponent={!query.trim() ? <View style={styles.featuredHeader}><Text style={styles.featuredTitle}>PROTEIN-FORWARD MALAYSIAN PICKS</Text><Text style={styles.emptySubtext}>Nutrition varies by recipe. Adjust before saving if needed.</Text></View> : null}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No results for "{query}".</Text>
                <Text style={styles.emptySubtext}>You can always close this and enter it manually instead.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <AnimatedPressable style={styles.resultRow} onPress={() => onSelect(item)}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.resultImage} contentFit="cover" />
                ) : (
                  <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                    <Ionicons name="fast-food-outline" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.resultTextCol}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  {!!item.brand && <Text style={styles.resultBrand} numberOfLines={1}>{item.brand}</Text>}
                  {item.caloriesPer100g !== null && (
                    <Text style={styles.resultCalories}>{Math.round(item.caloriesPer100g)} kcal · P {round(item.proteinPer100g)}g · C {round(item.carbsPer100g)}g · F {round(item.fatPer100g)}g</Text>
                  )}
                  <View style={styles.resultFooter}><Text style={styles.resultSource}>{item.source === 'myfcd' ? 'Malaysian estimate' : 'Open Food Facts'} · per 100g</Text>{nutritionScore(item) >= 25 && <View style={styles.proteinBadge}><Ionicons name="flash" size={10} color={colors.accent} /><Text style={styles.proteinBadgeText}>Protein-forward</Text></View>}</View>
                </View>
              </AnimatedPressable>
            )}
          />
        )}
      </View>
    </Modal>
  )
}

function round(value: number | null) { return value == null ? '—' : Math.round(value * 10) / 10 }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  closeBtn: { padding: 4 },
  searchRow: { paddingHorizontal: 20, marginBottom: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptySubtext: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.primary },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultsList: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
  featuredHeader: { paddingVertical: 10 },
  featuredTitle: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '900', letterSpacing: 0.6 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: 10, marginBottom: 8,
  },
  resultImage: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surface },
  resultImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  resultTextCol: { flex: 1, gap: 2 },
  resultName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  resultBrand: { color: colors.textMuted, fontSize: 12 },
  resultCalories: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  resultFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 },
  resultSource: { color: colors.textMuted, fontSize: 9, flex: 1 },
  proteinBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.accentGlow },
  proteinBadgeText: { color: colors.accent, fontSize: 9, fontWeight: '800' },
})
