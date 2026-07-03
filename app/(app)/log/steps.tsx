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
    if (!profile?.id || !circle?.id) {
      Alert.alert('No circle', 'Join a circle to log steps.')
      return
    }
    setLoading(true)

    const today = new Date().toISOString().split('T')[0]

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

    await earn('steps', data?.id, `${stepCount.toLocaleString()} steps`)
    setLoading(false)

    const msg = goalHit
      ? `Goal smashed! +${xpEarned} XP 🎯`
      : `Steps logged! +${xpEarned} XP. Keep moving.`
    Alert.alert('Steps logged!', msg, [{ text: 'Done', onPress: () => router.back() }])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Log Steps</Text>

      <Card style={styles.progressCard}>
        <Text style={styles.progressLabel}>Today's Progress</Text>
        <Text style={styles.stepCount}>{stepCount > 0 ? stepCount.toLocaleString() : '—'}</Text>
        <Text style={styles.stepGoal}>of {goalCount.toLocaleString()} goal</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }, goalHit && styles.fillGoal]} />
        </View>
        {goalHit && <Text style={styles.goalHitText}>🎯 Goal hit! +{XP_VALUES.STEPS_GOAL_HIT} XP</Text>}
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

      <Button label={`Save Steps (+${xpEarned} XP)`} onPress={handleSave} loading={loading} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  progressCard: { alignItems: 'center', gap: 8 },
  progressLabel: { color: '#64748B', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  stepCount: { color: '#F1F5F9', fontSize: 48, fontWeight: '800' },
  stepGoal: { color: '#64748B', fontSize: 14 },
  track: { width: '100%', height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
  fillGoal: { backgroundColor: '#10B981' },
  goalHitText: { color: '#10B981', fontSize: 15, fontWeight: '700' },
  xpNote: { color: '#6366F1', fontSize: 14, textAlign: 'center' },
})
