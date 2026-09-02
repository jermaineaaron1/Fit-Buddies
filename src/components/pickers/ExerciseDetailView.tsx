import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { Button } from '../ui/Button'
import { getExerciseDetail, type ExerciseDetail } from '../../lib/wger'
import { ExerciseVideoSection } from './ExerciseVideoSection'

interface ExerciseDetailViewProps {
  exerciseId: number
  onBack: () => void
  onUse: (detail: ExerciseDetail) => void
}

export function ExerciseDetailView({ exerciseId, onBack, onUse }: ExerciseDetailViewProps) {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setFailed(false)
    getExerciseDetail(exerciseId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{detail?.name ?? 'Exercise'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!detail && !failed && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {failed && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Couldn't load this exercise's details. Go back and try another, or enter it manually.</Text>
        </View>
      )}

      {detail && (
        <ScrollView style={styles.scrollBody} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {detail.imageUrl ? (
            <Image source={{ uri: detail.imageUrl }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
              <Ionicons name="barbell-outline" size={40} color={colors.textMuted} />
            </View>
          )}

          {!!detail.categoryName && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{detail.categoryName.toUpperCase()}</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>DEMO</Text>
          <ExerciseVideoSection exerciseName={detail.name} videoUrl={detail.videoUrl} posterUrl={detail.imageUrl} />

          <Button label="Use This Exercise" onPress={() => onUse(detail)} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center', textTransform: 'uppercase' },
  headerSpacer: { width: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  scrollBody: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  heroImage: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.card },
  heroImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  categoryTag: {
    alignSelf: 'flex-start', backgroundColor: colors.primaryGlow, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.primary + '40', paddingHorizontal: 10, paddingVertical: 5,
  },
  categoryTagText: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
})
