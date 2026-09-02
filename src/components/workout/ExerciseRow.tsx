import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { IconButton } from '../ui/IconButton'
import { schemaFor } from '../../lib/measurementSchemas'
import type { MeasurementType } from '../../types/database'

export interface ExerciseRowProps {
  order: number
  name: string
  imageUrl?: string | null
  equipment?: string | null
  measurementType: MeasurementType
  /** Planned count of sets, rounds or holds. */
  plannedSets: number | null
  completed?: boolean
  onPress?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

/**
 * A planned exercise in a session's sequence. Deliberately a row, not a tile:
 * six of these have to be scannable on one phone screen alongside the start
 * controls, which a photo tile grid makes impossible.
 */
export function ExerciseRow({
  order, name, imageUrl, equipment, measurementType, plannedSets,
  completed = false, onPress, onMoveUp, onMoveDown,
}: ExerciseRowProps) {
  const schema = schemaFor(measurementType)
  const noun = plannedSets === 1 ? schema.unitNoun : `${schema.unitNoun}s`

  const body = (
    <>
      <Text style={[styles.order, completed && styles.orderDone]}>{order}</Text>

      <View style={styles.thumbWrap}>
        {imageUrl
          ? <Image source={{ uri: imageUrl }} style={styles.thumb} contentFit="cover" />
          : <Ionicons name={schema.icon} size={16} color={colors.textMuted} />}
      </View>

      <View style={styles.copy}>
        <Text style={[styles.name, completed && styles.nameDone]} numberOfLines={1}>{name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {plannedSets ? `${plannedSets} ${noun}` : schema.label}
          {equipment ? ` · ${equipment}` : ''}
        </Text>
      </View>

      {completed
        ? <Ionicons name="checkmark-circle" size={17} color={colors.cornerBlue} />
        : null}

      {(onMoveUp || onMoveDown) && (
        <View style={styles.reorder}>
          <IconButton icon="chevron-up" size="sm" onPress={onMoveUp ?? (() => {})} disabled={!onMoveUp} accessibilityLabel={`Move ${name} up`} />
          <IconButton icon="chevron-down" size="sm" onPress={onMoveDown ?? (() => {})} disabled={!onMoveDown} accessibilityLabel={`Move ${name} down`} />
        </View>
      )}
    </>
  )

  const label = `${order}. ${name}, ${plannedSets ? `${plannedSets} ${noun}` : schema.label}${completed ? ', completed' : ''}`
  const box = [styles.row, completed && styles.rowDone]

  if (!onPress) return <View style={box} accessible accessibilityLabel={label}>{body}</View>
  return (
    <AnimatedPressable style={box} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: layout.touch + 8, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  rowDone: { opacity: 0.65, borderColor: colors.cornerBlue + '55' },
  order: { width: 16, textAlign: 'center', color: colors.primary, fontFamily: type.display, fontSize: 14, fontWeight: '900' },
  orderDone: { color: colors.textMuted },
  thumbWrap: {
    width: 36, height: 36, borderRadius: radius.sm, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  thumb: { width: '100%', height: '100%' },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  name: { color: colors.text, fontFamily: type.display, fontSize: 13.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  nameDone: { color: colors.textSecondary },
  meta: { color: colors.textMuted, fontSize: 10.5 },
  reorder: { gap: 2 },
})
