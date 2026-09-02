import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { CompactCard } from '../ui/CompactCard'
import { totalWeight } from '../../lib/belt'
import type { CategoryWeights } from '../../types/app'

interface ChampionshipRulesProps {
  weights: CategoryWeights
  cycleLabel: string
}

const CATEGORY_COPY: { key: keyof CategoryWeights; label: string; blurb: string }[] = [
  { key: 'login_streak', label: 'Consistency', blurb: 'Showing up and logging, day after day.' },
  { key: 'training_volume', label: 'Training progression', blurb: 'Progressive overload against your own previous sessions.' },
  { key: 'nutrition', label: 'Nutrition', blurb: 'Logging meals and hitting a balanced intake, not eating least.' },
  { key: 'steps', label: 'Movement', blurb: 'Daily steps outside of training.' },
]

/**
 * Collapsed by default. The rules matter enormously to trust in the scoring,
 * and not at all to someone opening the screen to check a rank — so they are
 * always present and never in the way.
 */
export function ChampionshipRules({ weights, cycleLabel }: ChampionshipRulesProps) {
  const [open, setOpen] = useState(false)
  const max = totalWeight(weights) || 1

  return (
    <CompactCard accent="steel" padded={false}>
      <AnimatedPressable
        style={styles.head}
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Championship rules"
      >
        <Ionicons name="book-outline" size={15} color={colors.steel} />
        <Text style={styles.title}>Championship Rules</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textMuted} />
      </AnimatedPressable>

      {open && (
        <View style={styles.body}>
          <Text style={styles.lede}>
            The belt rewards improvement against your own baseline and sustainable consistency.
            It is not a ranking of who is strongest, fastest, or lightest — someone half your size
            can out-score you by improving more than you did.
          </Text>

          {CATEGORY_COPY.map((category) => {
            const weight = weights[category.key]
            if (!weight) return null
            return (
              <View key={category.key} style={styles.rule}>
                <View style={styles.ruleHead}>
                  <Text style={styles.ruleLabel}>{category.label}</Text>
                  <Text style={styles.ruleWeight}>{Math.round((weight / max) * 100)}%</Text>
                </View>
                <Text style={styles.ruleBlurb}>{category.blurb}</Text>
              </View>
            )
          })}

          {weights.steps === 0 && (
            <Text style={styles.footnote}>
              Movement is weighted at zero until step data can be synced automatically.
            </Text>
          )}
          <Text style={styles.footnote}>
            Scored on a {cycleLabel.toLowerCase()} defence cycle. Breaking your logging streak or
            missing the weekly session minimum eliminates you from the current cycle.
          </Text>
        </View>
      )}
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, minHeight: layout.touch },
  title: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 12.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  body: { gap: 10, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2, borderTopWidth: 1, borderTopColor: colors.border },
  lede: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, paddingTop: 10 },
  rule: { gap: 2 },
  ruleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleLabel: { color: colors.text, fontFamily: type.display, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  ruleWeight: { color: colors.gold, fontFamily: type.display, fontSize: 12, fontWeight: '900' },
  ruleBlurb: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  footnote: { color: colors.textMuted, fontSize: 10.5, lineHeight: 15, fontStyle: 'italic' },
  ruleTrack: { height: 3, borderRadius: 2, backgroundColor: colors.surface, overflow: 'hidden' },
})
