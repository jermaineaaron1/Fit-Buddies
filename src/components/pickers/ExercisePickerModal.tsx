import React, { useEffect, useState } from 'react'
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, combatChip, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { Input } from '../ui/Input'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { getExerciseIndex, searchExercises, EXERCISE_CATEGORIES, type ExerciseSummary, type ExerciseDetail, type PickedExercise } from '../../lib/wger'
import { ExerciseDetailView } from './ExerciseDetailView'

interface ExercisePickerModalProps {
  visible: boolean
  onClose: () => void
  onSelect: (picked: PickedExercise) => void
}

type LoadState = 'loading' | 'error' | 'ready'

export function ExercisePickerModal({ visible, onClose, onSelect }: ExercisePickerModalProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [index, setIndex] = useState<ExerciseSummary[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null)

  const debouncedQuery = useDebouncedValue(query, 150)

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setCategoryId(null)
      setSelectedExerciseId(null)
      return
    }
    let cancelled = false
    setLoadState('loading')
    getExerciseIndex()
      .then((data) => {
        if (cancelled) return
        setIndex(data)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [visible])

  function retryLoad() {
    setLoadState('loading')
    getExerciseIndex()
      .then((data) => {
        setIndex(data)
        setLoadState('ready')
      })
      .catch(() => setLoadState('error'))
  }

  function handleUse(detail: ExerciseDetail) {
    onSelect({ exerciseId: detail.id, name: detail.name, imageUrl: detail.imageUrl })
  }

  const results = loadState === 'ready' ? searchExercises(index, debouncedQuery, categoryId) : []

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      {selectedExerciseId !== null ? (
        <ExerciseDetailView exerciseId={selectedExerciseId} onBack={() => setSelectedExerciseId(null)} onUse={handleUse} />
      ) : (
        <View style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.title}>Pick an Exercise</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Input value={query} onChangeText={setQuery} placeholder="Search exercises..." autoCapitalize="none" />
          </View>

          <View style={styles.chipRow}>
            {EXERCISE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadState === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {loadState === 'error' && (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Couldn't reach the exercise database. Check your connection and try again.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retryLoad}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {loadState === 'ready' && (
            <FlatList
              style={styles.resultsList}
              data={results}
              keyExtractor={(e) => String(e.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>
                    {query.trim() ? `No exercises found for "${query}".` : 'No exercises in this category.'}
                  </Text>
                  <Text style={styles.emptySubtext}>You can always close this and type the name in manually instead.</Text>
                </View>
              }
              renderItem={({ item }) => (
                <AnimatedPressable style={styles.resultRow} onPress={() => setSelectedExerciseId(item.id)}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.resultImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                      <Ionicons name="barbell-outline" size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </AnimatedPressable>
              )}
            />
          )}
        </View>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 22, fontWeight: '900', textTransform: 'uppercase' },
  closeBtn: { padding: 4 },
  searchRow: { paddingHorizontal: 20, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  chip: combatChip.base,
  chipActive: { ...combatChip.active, backgroundColor: colors.primary },
  chipText: combatChip.text,
  chipTextActive: combatChip.textActive,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptySubtext: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.primary },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  resultsList: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: 10, marginBottom: 8,
  },
  resultImage: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surface },
  resultImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  resultName: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
})
