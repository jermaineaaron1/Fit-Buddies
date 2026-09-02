import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useUIStore } from '../../store/uiStore'
import { AnimatedPressable } from '../ui/AnimatedPressable'
import { CompactButton } from '../ui/CompactButton'
import { SectionHeader } from '../ui/SectionHeader'
import { ResponsiveSidePanel } from './ResponsiveSidePanel'

interface QuickLogOption {
  key: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tone: string
  href: string
  /** Options offering a choice expand in place instead of navigating. */
  branches?: { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }[]
}

const OPTIONS: QuickLogOption[] = [
  { key: 'workout', label: 'Workout', icon: 'barbell', tone: colors.primary, href: '/(app)/log/workout' },
  {
    key: 'meal', label: 'Meal', icon: 'restaurant', tone: colors.gold, href: '/(app)/log/meal',
    branches: [
      { label: 'Scan Plate', icon: 'camera', href: '/(app)/log/meal?mode=scan' },
      { label: 'Enter Manually', icon: 'create-outline', href: '/(app)/log/meal' },
    ],
  },
  { key: 'steps', label: 'Steps', icon: 'footsteps', tone: colors.cornerBlue, href: '/(app)/log/steps' },
  { key: 'cardio', label: 'Cardio', icon: 'heart', tone: colors.crimson, href: '/(app)/log/workout?focus=cardio' },
  { key: 'sleep', label: 'Sleep', icon: 'moon', tone: colors.steel, href: '/(app)/log/sleep' },
  { key: 'weigh', label: 'Weigh-in', icon: 'speedometer', tone: colors.cornerBlue, href: '/(app)/log/body' },
]

interface Shortcut {
  label: string
  detail: string
  icon: keyof typeof Ionicons.glyphMap
  href: string
}

/**
 * The central Log action. Six destinations plus whatever this person actually
 * repeats — the shortcuts are the point, since most logging is a re-log of
 * something already recorded.
 */
export function QuickLogSheet() {
  const router = useRouter()
  const { quickLogOpen, closeQuickLog } = useUIStore()
  const { profile } = useAuthStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])

  // Loaded on open rather than on mount: the panel is closed almost always,
  // and these should reflect what was logged a minute ago.
  useEffect(() => {
    if (!quickLogOpen || !profile?.id) return
    let cancelled = false

    Promise.all([
      supabase.from('meal_logs').select('food_name, meal_type, logged_at')
        .eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(12),
      supabase.from('workouts').select('id, title, logged_at')
        .eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(1),
    ]).then(([mealsResult, workoutsResult]) => {
      if (cancelled) return
      const next: Shortcut[] = []

      const lastWorkout = workoutsResult.data?.[0]
      if (lastWorkout) {
        next.push({
          label: 'Repeat last workout',
          detail: lastWorkout.title,
          icon: 'repeat',
          href: `/(app)/log/workout?repeat=${lastWorkout.id}`,
        })
      }

      const meals = mealsResult.data ?? []
      const lastMeal = meals[0]
      if (lastMeal) {
        next.push({
          label: 'Repeat recent meal',
          detail: lastMeal.food_name,
          icon: 'restaurant-outline',
          href: `/(app)/log/meal?repeat=${encodeURIComponent(lastMeal.food_name)}`,
        })
      }

      // "Usual breakfast" only earns a slot once there is a genuine habit to
      // repeat — otherwise it is a shortcut to a guess.
      const breakfasts = meals.filter((meal) => meal.meal_type === 'breakfast')
      const counts = new Map<string, number>()
      for (const meal of breakfasts) counts.set(meal.food_name, (counts.get(meal.food_name) ?? 0) + 1)
      const usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      if (usual && usual[1] >= 2 && usual[0] !== lastMeal?.food_name) {
        next.push({
          label: 'Log usual breakfast',
          detail: usual[0],
          icon: 'sunny-outline',
          href: `/(app)/log/meal?repeat=${encodeURIComponent(usual[0])}&meal=breakfast`,
        })
      }

      setShortcuts(next)
    })

    return () => { cancelled = true }
  }, [quickLogOpen, profile?.id])

  function go(href: string) {
    closeQuickLog()
    setExpanded(null)
    router.push(href as never)
  }

  return (
    <ResponsiveSidePanel
      visible={quickLogOpen}
      onClose={() => { closeQuickLog(); setExpanded(null) }}
      title="Quick Log"
      subtitle="What did you just do?"
    >
      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const open = expanded === option.key
          return (
            <View key={option.key}>
              <AnimatedPressable
                style={[styles.option, open && styles.optionOpen]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ expanded: option.branches ? open : undefined }}
                onPress={() => option.branches ? setExpanded(open ? null : option.key) : go(option.href)}
              >
                <Ionicons name={option.icon} size={17} color={option.tone} />
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Ionicons
                  name={option.branches ? (open ? 'chevron-up' : 'chevron-down') : 'chevron-forward'}
                  size={15}
                  color={colors.textMuted}
                />
              </AnimatedPressable>

              {open && option.branches ? (
                <View style={styles.branches}>
                  {option.branches.map((branch) => (
                    <CompactButton
                      key={branch.label}
                      label={branch.label}
                      icon={branch.icon}
                      onPress={() => go(branch.href)}
                      style={styles.branch}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          )
        })}
      </View>

      {shortcuts.length > 0 && (
        <View style={styles.shortcuts}>
          <SectionHeader title="Pick up where you left off" />
          {shortcuts.map((shortcut) => (
            <AnimatedPressable
              key={shortcut.label}
              style={styles.shortcut}
              accessibilityRole="button"
              accessibilityLabel={`${shortcut.label}: ${shortcut.detail}`}
              onPress={() => go(shortcut.href)}
            >
              <Ionicons name={shortcut.icon} size={15} color={colors.cornerBlue} />
              <View style={styles.shortcutCopy}>
                <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
                <Text style={styles.shortcutDetail} numberOfLines={1}>{shortcut.detail}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </AnimatedPressable>
          ))}
        </View>
      )}
    </ResponsiveSidePanel>
  )
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    minHeight: layout.touch + 4, paddingHorizontal: 13,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  optionOpen: { borderColor: colors.gold },
  optionLabel: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  branches: { flexDirection: 'row', gap: 8, paddingTop: 8, paddingLeft: 12 },
  branch: { flex: 1 },
  shortcuts: { gap: 6, marginTop: 4 },
  shortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: layout.touch, paddingHorizontal: 11,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 3, borderLeftColor: colors.cornerBlue, backgroundColor: colors.card,
  },
  shortcutCopy: { flex: 1, minWidth: 0 },
  shortcutLabel: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  shortcutDetail: { color: colors.textMuted, fontSize: 10.5 },
})
