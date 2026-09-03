import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { XP_VALUES } from '../../../src/constants/xp'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { IconButton } from '../../../src/components/ui/IconButton'
import { NumericInput } from '../../../src/components/ui/NumericInput'
import { Chip } from '../../../src/components/ui/Chip'
import { ProgressBar } from '../../../src/components/ui/ProgressBar'
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stepCount = parseInt(steps, 10) || 0
  const goalCount = parseInt(goal, 10) || 10000
  const goalHit = stepCount >= goalCount
  const xpEarned = goalHit ? XP_VALUES.STEPS_GOAL_HIT : XP_VALUES.STEPS_LOGGED
  const progress = Math.min(stepCount / Math.max(goalCount, 1), 1)
  const remaining = Math.max(0, goalCount - stepCount)

  async function handleSave() {
    setError(null)
    if (stepCount <= 0) { setError('Enter your step count first.'); return }
    if (!profile?.id || !circle?.id) { setError('You need to be in a circle to log steps.'); return }

    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    // Upsert on (user_id, log_date), so correcting today's count updates the
    // existing row rather than adding one. XP is per-day, not per-save —
    // without this check, re-logging would pay out again each time.
    const { data: alreadyLogged } = await supabase
      .from('step_logs').select('id')
      .eq('user_id', profile.id).eq('log_date', today).maybeSingle()

    const { data, error: saveError } = await supabase
      .from('step_logs')
      .upsert({
        user_id: profile.id,
        circle_id: circle.id,
        step_count: stepCount,
        step_goal: goalCount,
        goal_hit: goalHit,
        xp_earned: xpEarned,
        log_date: today,
      }, { onConflict: 'user_id,log_date' })
      .select().single()

    if (saveError) { setSaving(false); setError(saveError.message); return }

    if (!alreadyLogged) {
      await earn('steps', data?.id, `${stepCount.toLocaleString()} steps`)
      await completeQuestByType('steps', profile.id, circle.id, earn)
    }
    setSaving(false)
    // Alert.alert's button callbacks never fire on web, so navigation must not
    // be nested inside one.
    router.back()
  }

  return (
    <PageContainer width="form">
      <View style={styles.head}>
        <IconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Log steps</Text>
        <Chip label={`+${xpEarned} XP`} tone="gold" icon="flash" />
      </View>

      {!circle && <NoCircleBanner />}

      <CompactCard accent={goalHit ? 'gold' : 'blue'}>
        <View style={styles.progressHead}>
          <View style={styles.progressCopy}>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.count}>
              {stepCount.toLocaleString()}
              <Text style={styles.countGoal}> / {goalCount.toLocaleString()}</Text>
            </Text>
          </View>
          {goalHit && <Chip label="Goal hit" tone="gold" icon="checkmark-circle" />}
        </View>
        <ProgressBar
          progress={progress}
          color={goalHit ? colors.gold : colors.cornerBlue}
          trackColor={colors.surface}
          height={8}
        />
        <Text style={styles.progressNote}>
          {stepCount === 0
            ? 'Enter your count from your phone or watch.'
            : goalHit
              ? `${(stepCount - goalCount).toLocaleString()} past your goal.`
              : `${remaining.toLocaleString()} to go.`}
        </Text>
      </CompactCard>

      <View style={styles.fields}>
        <NumericInput
          label="Steps today"
          value={steps}
          onChangeText={setSteps}
          placeholder="8500"
          integer
          step={500}
          min={0}
          style={styles.field}
        />
        <NumericInput
          label="Daily goal"
          value={goal}
          onChangeText={setGoal}
          placeholder="10000"
          integer
          step={1000}
          min={1000}
          style={styles.field}
        />
      </View>

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <CompactButton
        label={`Save steps · ${xpEarned} XP`}
        tone="primary"
        icon="checkmark"
        block
        loading={saving}
        onPress={handleSave}
      />

      <Text style={styles.footnote}>
        Steps count toward Movement in the championship. Automatic syncing from your phone&apos;s
        health data is not connected yet, so this is entered by hand for now.
      </Text>
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  eyebrow: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  progressHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 9 },
  progressCopy: { flex: 1, minWidth: 0 },
  count: { color: colors.text, fontFamily: type.display, fontSize: 30, fontWeight: '900', letterSpacing: 0.3 },
  countGoal: { color: colors.textMuted, fontSize: 15 },
  progressNote: { color: colors.textSecondary, fontSize: 11.5, marginTop: 7 },
  fields: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: 2, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
  footnote: { color: colors.textMuted, fontSize: 10.5, lineHeight: 15 },
})
