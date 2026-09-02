import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, type } from '../../constants/theme'
import type { BodyMeasurement } from '../../lib/bodyComposition'

interface WeightTrendChartProps {
  measurements: BodyMeasurement[]
  height?: number
}

/**
 * A plain column chart built from Views — no charting dependency, matching how
 * Tale of the Tape already draws its history bars.
 *
 * Bars are scaled to the observed range rather than to zero: body weight varies
 * by a few percent, so a zero-based axis would render every session as an
 * identical full-height bar and hide the very trend this is here to show.
 */
export function WeightTrendChart({ measurements, height = 96 }: WeightTrendChartProps) {
  const points = measurements.filter((m) => m.weight_kg !== null)
  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>
          {points.length === 0 ? 'No weigh-ins yet.' : 'One weigh-in so far — add another to see a trend.'}
        </Text>
      </View>
    )
  }

  const weights = points.map((p) => p.weight_kg as number)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  // A flat run would divide by zero; give it a nominal band so bars sit mid-height.
  const span = max - min || 1
  const latest = weights[weights.length - 1]
  const first = weights[0]
  const falling = latest < first

  return (
    <View style={styles.wrap}>
      <View style={[styles.plot, { height }]}>
        {points.map((point, index) => {
          const value = point.weight_kg as number
          const ratio = (value - min) / span
          const isLast = index === points.length - 1
          return (
            <View key={point.id} style={styles.column}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(4, 10 + ratio * (height - 18)) },
                  isLast && styles.barLatest,
                  !isLast && (falling ? styles.barFalling : styles.barRising),
                ]}
              />
            </View>
          )
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{shortDate(points[0].measured_at)} · {first.toFixed(1)}kg</Text>
        <Text style={styles.axisRange}>{min.toFixed(1)}–{max.toFixed(1)}kg</Text>
        <Text style={styles.axisText}>{shortDate(points[points.length - 1].measured_at)} · {latest.toFixed(1)}kg</Text>
      </View>
    </View>
  )
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  plot: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 3,
    padding: 6, borderRadius: radius.sm, backgroundColor: colors.surface,
  },
  column: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2, backgroundColor: colors.steel },
  barFalling: { backgroundColor: colors.cornerBlue },
  barRising: { backgroundColor: colors.accent },
  barLatest: { backgroundColor: colors.primary },
  axis: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  axisText: { color: colors.textMuted, fontSize: 10 },
  axisRange: { color: colors.steel, fontFamily: type.display, fontSize: 10, fontWeight: '700' },
  empty: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, backgroundColor: colors.surface,
  },
  emptyText: { color: colors.textMuted, fontSize: 12 },
})
