import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { colors, radius } from '../../constants/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { StatItem } from '../ui/StatItem'
import type { WeekSummary } from '../../lib/circleSnapshot'

interface WeekSummaryStripProps {
  summary: WeekSummary
  /** Weekly workout target, for the "3 / 5" form. */
  workoutTarget?: number
  mealTarget?: number
}

/**
 * Five figures in one bordered strip. On a phone it scrolls horizontally
 * rather than wrapping to two rows or shrinking each figure to unreadability;
 * from 900px up all five sit in a single row with room to spare.
 */
export function WeekSummaryStrip({ summary, workoutTarget = 5, mealTarget = 21 }: WeekSummaryStripProps) {
  const { isDesktop } = useBreakpoint()

  const items = (
    <>
      <StatItem
        label="Progress"
        value={`${summary.points}`}
        icon="stats-chart"
        tone="red"
        caption={summary.improvement === null ? 'Building baseline' : undefined}
        trend={summary.improvement === null ? undefined : {
          direction: summary.improvement >= 0 ? 'up' : 'down',
          label: `${Math.abs(Math.round(summary.improvement * 100))}% vs baseline`,
        }}
        style={isDesktop ? styles.flexItem : styles.scrollItem}
      />
      <View style={styles.divider} />
      <StatItem
        label="Workouts"
        value={`${summary.workouts} / ${workoutTarget}`}
        icon="flame"
        caption="This week"
        style={isDesktop ? styles.flexItem : styles.scrollItem}
      />
      <View style={styles.divider} />
      <StatItem
        label="Meals logged"
        value={`${summary.meals} / ${mealTarget}`}
        icon="restaurant"
        caption="This week"
        style={isDesktop ? styles.flexItem : styles.scrollItem}
      />
      <View style={styles.divider} />
      <StatItem
        label="Avg steps"
        value={summary.avgSteps === null ? '—' : summary.avgSteps.toLocaleString()}
        icon="footsteps"
        tone={summary.avgSteps === null ? 'plain' : 'blue'}
        caption={summary.avgSteps === null ? 'Not logged' : 'Daily average'}
        style={isDesktop ? styles.flexItem : styles.scrollItem}
      />
      <View style={styles.divider} />
      <StatItem
        label="Sleep avg"
        value={summary.avgSleepHours === null ? '—' : `${summary.avgSleepHours}h`}
        icon="moon"
        tone={summary.avgSleepHours === null ? 'plain' : 'blue'}
        caption={summary.avgSleepHours === null ? 'Not logged' : 'This week'}
        style={isDesktop ? styles.flexItem : styles.scrollItem}
      />
    </>
  )

  if (isDesktop) return <View style={[styles.strip, styles.stripRow]}>{items}</View>

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.stripScroll}
    >
      {items}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.gold, backgroundColor: colors.card,
  },
  stripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 14 },
  stripScroll: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 12 },
  flexItem: { flex: 1 },
  scrollItem: { minWidth: 84 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
})
