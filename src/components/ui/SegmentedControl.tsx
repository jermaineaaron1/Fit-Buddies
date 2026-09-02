import React from 'react'
import { View, Text, StyleSheet, ScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

export interface Segment<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  segments: ReadonlyArray<Segment<T>>
  value: T
  onChange: (value: T) => void
  tone?: 'primary' | 'gold' | 'blue'
  /** Scrolls horizontally rather than wrapping. For 4+ segments on a phone. */
  scrollable?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

const ACCENT = { primary: colors.primary, gold: colors.gold, blue: colors.cornerBlue }

/**
 * Joined single-choice control — one bordered strip rather than N floating
 * pills, which reads as a single decision and saves vertical space.
 */
export function SegmentedControl<T extends string>({
  segments, value, onChange, tone = 'primary', scrollable = false, disabled = false, style, accessibilityLabel,
}: SegmentedControlProps<T>) {
  const accent = ACCENT[tone]

  const items = segments.map((segment, index) => {
    const selected = segment.value === value
    return (
      <AnimatedPressable
        key={segment.value}
        onPress={() => onChange(segment.value)}
        disabled={disabled}
        accessibilityRole="tab"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={segment.label}
        style={[
          styles.segment,
          scrollable ? styles.segmentScroll : styles.segmentFlex,
          index > 0 && styles.divided,
          selected && { backgroundColor: accent },
        ]}
      >
        <Text
          style={[styles.label, selected && { color: tone === 'gold' ? colors.bg : '#FFFFFF' }]}
          numberOfLines={1}
        >
          {segment.label}
        </Text>
      </AnimatedPressable>
    )
  })

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
        style={[styles.scrollOuter, style]}
        contentContainerStyle={styles.track}
      >
        {items}
      </ScrollView>
    )
  }

  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[styles.track, disabled && styles.disabled, style]}>
      {items}
    </View>
  )
}

const styles = StyleSheet.create({
  scrollOuter: { flexGrow: 0 },
  track: {
    flexDirection: 'row', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    backgroundColor: colors.card, overflow: 'hidden',
  },
  segment: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 8, minHeight: layout.touch },
  segmentFlex: { flex: 1 },
  segmentScroll: { minWidth: 76 },
  divided: { borderLeftWidth: 1, borderLeftColor: colors.border },
  disabled: { opacity: 0.45 },
  label: { color: colors.textSecondary, fontFamily: type.display, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
})
