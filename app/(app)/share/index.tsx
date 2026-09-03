import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useCircleStore } from '../../../src/store/circleStore'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { MealLogger, type MealType } from '../../../src/components/nutrition/MealLogger'
import { colors, layout, radius, type } from '../../../src/constants/theme'

/**
 * Fuel — the food page.
 *
 * This is where food gets logged, not a launcher that sends you somewhere else
 * to do it. The crew's shared recipes and grocery finds are real features but
 * secondary to the thing people open this tab to do several times a day, so
 * they live one tap away rather than above the fold.
 *
 * The logging itself is `MealLogger`, shared with /log/meal so the two entry
 * points cannot drift apart.
 */
export default function FuelScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string; repeat?: string; meal?: string }>()
  const { isDesktop } = useBreakpoint()
  const { circle } = useCircleStore()

  if (!circle) {
    return <PageContainer><NoCircleBanner /></PageContainer>
  }

  return (
    <PageContainer width={isDesktop ? 'content' : 'form'}>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>FUEL</Text>
          <Text style={styles.title}>What did you eat?</Text>
        </View>
        <AnimatedPressable
          style={styles.crewLink}
          onPress={() => router.push('/(app)/share/crew' as never)}
          accessibilityRole="link"
          accessibilityLabel="Crew kitchen — recipes, grocery finds and supplements"
        >
          <Ionicons name="people-outline" size={15} color={colors.gold} />
          <Text style={styles.crewLinkText}>Crew</Text>
        </AnimatedPressable>
      </View>

      <MealLogger
        initialAction={params.mode === 'scan' ? 'scan' : params.mode === 'search' ? 'search' : null}
        repeatName={params.repeat ? String(params.repeat) : null}
        initialMealType={(params.meal as MealType) ?? defaultMealForNow()}
        // Hosted as a tab: there is nothing to go back to, so a save clears the
        // form and the next meal is logged from the same screen.
        onSaved={() => {}}
      />
    </PageContainer>
  )
}

/** Saves a tap by opening on the meal it probably is right now. */
function defaultMealForNow(): MealType {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 16) return 'lunch'
  if (hour < 22) return 'dinner'
  return 'snack'
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.4 },
  crewLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, minHeight: layout.touch - 6,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.card,
  },
  crewLinkText: { color: colors.gold, fontFamily: type.display, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
})
