import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { XP_VALUES } from '../../../src/constants/xp'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import { Card } from '../../../src/components/ui/Card'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { colors, type } from '../../../src/constants/theme'

export default function LogStepsScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [steps, setSteps] = useState('')
  const [goal, setGoal] = useState('10000')
  const [loading, setLoading] = useState(false)

  const stepCount = parseInt(steps) || 0
  const goalCount = parseInt(goal) || 10000
  const goalHit = stepCount >= goalCount
  const xpEarned = goalHit ? XP_VALUES.STEPS_GOAL_HIT : XP_VALUES.STEPS_LOGGED
  const progress = Math.min(stepCount / goalCount, 1)

  async function handleSave() {
    if (!steps || stepCount <= 0) {
      Alert.alert('Missing steps', 'Enter your step count.')
      return
    }
    if (!profile?.id || !circle?.id) return
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

    // This is an upsert on (user_id, log_date), so correcting today's count
    // updates the existing row rather than adding one. XP is per-day, not
    // per-save — without this check, re-logging would pay out again each time.
    const { data: alreadyLogged } = await supabase
      .from('step_logs')
      .select('id')
      .eq('user_id', profile.id)
      .eq('log_date', today)
      .maybeSingle()

    const { data, error } = await supabase
      .from('step_logs')
      .upsert(
        {
          user_id: profile.id,
          circle_id: circle.id,
          step_count: stepCount,
          step_goal: goalCount,
          goal_hit: goalHit,
          xp_earned: xpEarned,
          log_date: today,
        },
        { onConflict: 'user_id,log_date' }
      )
      .select()
      .single()

    if (error) {
      setLoading(false)
      Alert.alert('Error', error.message)
      return
    }

    if (!alreadyLogged) {
      await earn('steps', data?.id, `${stepCount.toLocaleString()} steps`)
      await completeQuestByType('steps', profile.id, circle.id, earn)
    }
    setLoading(false)

    // Alert.alert's button callbacks never fire on web, so navigating from
    // inside one strands the user on a form they already saved. Go back directly.
    router.back()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Log Steps</Text>
      {!circle && <NoCircleBanner />}

      <Card style={styles.progressCard}>
        <Text style={styles.progressLabel}>Today's Progress</Text>
        <Text style={styles.stepCount}>{stepCount > 0 ? stepCount.toLocaleString() : '—'}</Text>
        <Text style={styles.stepGoal}>of {goalCount.toLocaleString()} goal</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }, goalHit && styles.fillGoal]} />
        </View>
        {goalHit && <Text style={styles.goalHitText}>Goal hit! +{XP_VALUES.STEPS_GOAL_HIT} XP</Text>}
      </Card>

      <Input
        label="Steps Today"
        value={steps}
        onChangeText={setSteps}
        keyboardType="numeric"
        placeholder="e.g. 8500"
      />
      <Input
        label="Daily Goal"
        value={goal}
        onChangeText={setGoal}
        keyboardType="numeric"
        placeholder="10000"
      />

      <Text style={styles.xpNote}>
        {goalHit ? `+${XP_VALUES.STEPS_GOAL_HIT} XP for hitting your goal` : `+${XP_VALUES.STEPS_LOGGED} XP for logging steps`}
      </Text>

      <Button label={`Save Steps (+${xpEarned} XP)`} onPress={handleSave} loading={loading} celebrate />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 16, paddingBottom: 96, paddingTop: 14 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 27, fontWeight: '900', letterSpacing: 0.2, marginBottom: 4, textTransform: 'uppercase' },
  progressCard: { alignItems: 'center', gap: 8 },
  progressLabel: { color: colors.textMuted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  stepCount: { color: colors.text, fontSize: 48, fontWeight: '800' },
  stepGoal: { color: colors.textMuted, fontSize: 14 },
  track: { width: '100%', height: 8, backgroundColor: colors.bg, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  fillGoal: { backgroundColor: colors.accent },
  goalHitText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
  xpNote: { color: colors.primary, fontSize: 14, textAlign: 'center' },
})
