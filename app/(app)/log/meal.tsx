import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useCircleStore } from '../../../src/store/circleStore'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { IconButton } from '../../../src/components/ui/IconButton'
import { Chip } from '../../../src/components/ui/Chip'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { MealLogger, type MealType } from '../../../src/components/nutrition/MealLogger'
import { colors, type } from '../../../src/constants/theme'

/**
 * Quick Log's route into meal logging. The Fuel tab is the other one; both
 * render the same `MealLogger`, so a change to how food is logged lands in
 * both places at once.
 *
 * The difference is framing: this arrives pushed onto a stack, so it has a
 * back button and returns whence it came after saving.
 */
export default function LogMealScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ mode?: string; repeat?: string; meal?: string }>()
  const { isDesktop } = useBreakpoint()
  const { circle } = useCircleStore()

  return (
    <PageContainer width={isDesktop ? 'content' : 'form'}>
      <View style={styles.head}>
        <IconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Log a meal</Text>
        <Chip label="+15 XP" tone="gold" icon="flash" />
      </View>

      {!circle && <NoCircleBanner />}

      <MealLogger
        initialAction={params.mode === 'scan' ? 'scan' : params.mode === 'search' ? 'search' : null}
        repeatName={params.repeat ? String(params.repeat) : null}
        initialMealType={(params.meal as MealType) ?? 'lunch'}
      />
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
})
