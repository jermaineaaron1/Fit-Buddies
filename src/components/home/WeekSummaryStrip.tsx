import React from 'react'
import { View, StyleSheet } from 'react-native'
import type { Ionicons } from '@expo/vector-icons'
import { colors, radius } from '../../constants/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { StatItem, type TrendDirection } from '../ui/StatItem'
import type { WeekSummary } from '../../lib/circleSnapshot'

interface WeekSummaryStripProps {
  summary: WeekSummary
  /** Weekly workout target, for the "3 / 5" form. */
  workoutTarget?: number
  mealTarget?: number
}

interface Stat {
  key: string
  label: string
  value: string
  caption?: string
  icon: keyof typeof Ionicons.glyphMap
  tone?: 'gold' | 'blue' | 'red' | 'plain'
  trend?: { direction: TrendDirection; label: string }
}

/**
 * The five weekly figures.
 *
 * On a phone they wrap to a 3 x 2 grid so all five are visible at once —
 * a horizontal scroller hid Avg Steps and Sleep behind a gesture nobody
 * knew was there. From 900px up they sit in one row with dividers, which
 * only reads well when the row is genuinely wide enough for it.
 */
export function WeekSummaryStrip({ summary, workoutTarget = 5, mealTarget = 21 }: WeekSummaryStripProps) {
  const { isDesktop } = useBreakpoint()

  const stats: Stat[] = [
    {
      key: 'progress',
      label: 'Progress',
      value: summary.points.toLocaleString(),
      icon: 'stats-chart',
      tone: 'red',
      caption: summary.improvement === null ? 'Building baseline' : undefined,
      trend: summary.improvement === null ? undefined : {
        direction: summary.improvement >= 0 ? 'up' : 'down',
        label: `${Math.abs(Math.round(summary.improvement * 100))}% vs baseline`,
      },
    },
    { key: 'workouts', label: 'Workouts', value: `${summary.workouts} / ${workoutTarget}`, icon: 'flame', caption: 'This week' },
    { key: 'meals', label: 'Meals', value: `${summary.meals} / ${mealTarget}`, icon: 'restaurant', caption: 'This week' },
    {
      key: 'steps',
      label: 'Avg steps',
      value: summary.avgSteps === null ? '—' : summary.avgSteps.toLocaleString(),
      icon: 'footsteps',
      tone: summary.avgSteps === null ? 'plain' : 'blue',
      caption: summary.avgSteps === null ? 'Not logged' : 'Daily average',
    },
    {
      key: 'sleep',
      label: 'Sleep avg',
      value: summary.avgSleepHours === null ? '—' : `${summary.avgSleepHours}h`,
      icon: 'moon',
      tone: summary.avgSleepHours === null ? 'plain' : 'blue',
      caption: summary.avgSleepHours === null ? 'Not logged' : 'This week',
    },
  ]

  if (isDesktop) {
    return (
      <View style={[styles.strip, styles.stripRow]}>
        {stats.map(({ key, ...stat }, index) => (
          <React.Fragment key={key}>
            {index > 0 && <View style={styles.divider} />}
            <StatItem {...stat} style={styles.flexItem} />
          </React.Fragment>
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.strip, styles.grid]}>
      {stats.map(({ key, ...stat }) => (
        <StatItem key={key} {...stat} style={styles.gridItem} />
      ))}
      {/* Five items in a three-column grid leave a gap; an inert spacer keeps
          the last row aligned left rather than letting Sleep stretch. */}
      <View style={styles.gridItem} />
    </View>
  )
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.gold, backgroundColor: colors.card,
  },
  stripRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 14 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingVertical: 11, paddingHorizontal: 12, rowGap: 12, columnGap: 8,
  },
  flexItem: { flex: 1 },
  // Three per row: a third of the width, less its share of the two gaps.
  gridItem: { width: '31%', minWidth: 0 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border },
})
