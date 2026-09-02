import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import type { WorkoutWithExercises } from '../../types/app'
import { ExerciseProgressSnippet } from './ExerciseProgressSnippet'
import type { FlatEntry } from './WorkoutHistoryBrowser'

interface PastWorkoutCardProps {
  workout: WorkoutWithExercises
  isRecurringSource: boolean
  priorMap: Map<string, FlatEntry>
  onRepeat: () => void
  onUseAsBase: () => void
  onMakeRecurring: () => void
}

// One card in the "database of workouts" browser — image cluster, title,
// meta, a brief per-exercise progress glance, and explicit inline action
// buttons. Deliberately not an Alert.alert action sheet: those are a
// confirmed no-op on web, which would silently break this on the one
// platform used for verification all session.
export function PastWorkoutCard({ workout, isRecurringSource, priorMap, onRepeat, onUseAsBase, onMakeRecurring }: PastWorkoutCardProps) {
  const images = workout.exercises.map((e) => e.exercise_image_url).filter((url): url is string => !!url).slice(0, 3)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.thumbCluster}>
          {images.length > 0 ? (
            images.map((url, i) => <Image key={i} source={{ uri: url }} style={[styles.thumb, i > 0 && styles.thumbOverlap]} contentFit="cover" />)
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="barbell-outline" size={18} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.flex1}>
          <Text style={styles.title} numberOfLines={1}>{workout.title}</Text>
          <Text style={styles.meta}>{formatDate(workout.logged_at)} · {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}</Text>
        </View>
        {isRecurringSource && (
          <View style={styles.recurringBadge}>
            <Ionicons name="repeat" size={11} color={colors.gold} />
          </View>
        )}
      </View>

      <ExerciseProgressSnippet workout={workout} priorMap={priorMap} />

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onRepeat}>
          <Ionicons name="refresh" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Repeat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onUseAsBase}>
          <Ionicons name="create-outline" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Use as Base</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onMakeRecurring}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.actionText}>Recurring</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

const styles = StyleSheet.create({
  card: { width: 226, gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbCluster: { flexDirection: 'row' },
  thumb: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.card },
  thumbOverlap: { marginLeft: -14 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '800', textTransform: 'uppercase' },
  meta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  recurringBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#251B08', borderWidth: 1, borderColor: colors.goldDark },
  actionRow: { flexDirection: 'row', gap: 6 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary + '40' },
  actionText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
})
