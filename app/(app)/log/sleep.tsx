import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { IconButton } from '../../../src/components/ui/IconButton'
import { SegmentedControl } from '../../../src/components/ui/SegmentedControl'
import { Chip } from '../../../src/components/ui/Chip'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import { colors, layout, radius, type } from '../../../src/constants/theme'

const MINUTES = [
  { value: '0', label: ':00' },
  { value: '15', label: ':15' },
  { value: '30', label: ':30' },
  { value: '45', label: ':45' },
]
const MERIDIEM = [
  { value: 'am' as const, label: 'AM' },
  { value: 'pm' as const, label: 'PM' },
]
const QUALITIES = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'OK' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
]

type Meridiem = 'am' | 'pm'

/** 12-hour display back to the 0–23 the calculation and storage use. */
function to24(hour12: number, meridiem: Meridiem): number {
  if (meridiem === 'am') return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

/**
 * Declared at module scope on purpose: defined inside the screen it became a
 * new component type on every render, remounting the hour grid and both
 * segmented controls each time any state changed.
 */
function TimeBlock({
  label, hour, setHour, minute, setMinute, meridiem, setMeridiem, icon,
}: {
  label: string
  hour: number
  setHour: (value: number) => void
  minute: number
  setMinute: (value: number) => void
  meridiem: Meridiem
  setMeridiem: (value: Meridiem) => void
  icon: keyof typeof Ionicons.glyphMap
}) {
  return (
    <CompactCard>
      <View style={styles.timeHead}>
        <Ionicons name={icon} size={15} color={colors.cornerBlue} />
        <Text style={styles.timeLabel}>{label}</Text>
        <Text style={styles.timeValue}>
          {hour}:{String(minute).padStart(2, '0')} {meridiem.toUpperCase()}
        </Text>
      </View>

      {/* Twelve hours with an AM/PM toggle, rather than a 24-wide scroller
          that put bedtime at the far end of a horizontal swipe. */}
      <View style={styles.hourGrid}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
          <AnimatedPressable
            key={value}
            style={[styles.hour, hour === value && styles.hourActive]}
            onPress={() => setHour(value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: hour === value }}
            accessibilityLabel={`${value} o'clock`}
          >
            <Text style={[styles.hourText, hour === value && styles.hourTextActive]}>{value}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <View style={styles.timeControls}>
        <SegmentedControl
          segments={MINUTES}
          value={String(minute)}
          onChange={(value) => setMinute(Number(value))}
          tone="blue"
          accessibilityLabel={`${label} minutes`}
          style={styles.minutes}
        />
        <SegmentedControl
          segments={MERIDIEM}
          value={meridiem}
          onChange={setMeridiem}
          tone="blue"
          accessibilityLabel={`${label} morning or evening`}
        />
      </View>
    </CompactCard>
  )
}

export default function LogSleepScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  // Defaults: 10:30 PM to 6:30 AM.
  const [bedHour, setBedHour] = useState(10)
  const [bedMinute, setBedMinute] = useState(30)
  const [bedMeridiem, setBedMeridiem] = useState<Meridiem>('pm')
  const [wakeHour, setWakeHour] = useState(6)
  const [wakeMinute, setWakeMinute] = useState(30)
  const [wakeMeridiem, setWakeMeridiem] = useState<Meridiem>('am')
  const [quality, setQuality] = useState(3)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bedH = to24(bedHour, bedMeridiem)
  const wakeH = to24(wakeHour, wakeMeridiem)
  const bedTotal = bedH * 60 + bedMinute
  let wakeTotal = wakeH * 60 + wakeMinute
  if (wakeTotal <= bedTotal) wakeTotal += 24 * 60
  const durationMins = wakeTotal - bedTotal
  const hours = Math.floor(durationMins / 60)
  const minutes = durationMins % 60
  const durationHrs = durationMins / 60
  const xpEarned = durationHrs >= 7 ? 30 : 20

  function buildDatetime(hour24: number, minute: number, isWake: boolean): string {
    const date = new Date()
    // Bedtime in the afternoon or evening belongs to yesterday; waking is today.
    if (!isWake && hour24 >= 12) date.setDate(date.getDate() - 1)
    date.setHours(hour24, minute, 0, 0)
    return date.toISOString()
  }

  async function handleSave() {
    setError(null)
    if (!profile?.id || !circle?.id) { setError('You need to be in a circle to log sleep.'); return }

    setSaving(true)
    const today = new Date().toISOString().split('T')[0]

    // Upsert on (user_id, log_date): correcting last night's times updates the
    // existing row. XP is per-night, not per-save.
    const { data: alreadyLogged } = await supabase
      .from('sleep_logs').select('id')
      .eq('user_id', profile.id).eq('log_date', today).maybeSingle()

    const { data, error: saveError } = await supabase
      .from('sleep_logs')
      .upsert({
        user_id: profile.id,
        circle_id: circle.id,
        bedtime: buildDatetime(bedH, bedMinute, false),
        wake_time: buildDatetime(wakeH, wakeMinute, true),
        quality,
        xp_earned: xpEarned,
        log_date: today,
      }, { onConflict: 'user_id,log_date' })
      .select().single()

    if (saveError) { setSaving(false); setError(saveError.message); return }

    if (!alreadyLogged) {
      await earn('sleep', data?.id, `${(durationMins / 60).toFixed(1)}h sleep`, xpEarned)
      await completeQuestByType('sleep', profile.id, circle.id, earn)
    }
    setSaving(false)
    // Alert.alert's callbacks never fire on web, so navigate directly.
    router.back()
  }

  return (
    <PageContainer width="form">
      <View style={styles.head}>
        <IconButton icon="arrow-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Log sleep</Text>
        <Chip label={`+${xpEarned} XP`} tone="gold" icon="flash" />
      </View>

      {!circle && <NoCircleBanner />}

      <CompactCard accent="blue">
        <View style={styles.durationRow}>
          <Ionicons name="moon" size={22} color={colors.cornerBlue} />
          <View style={styles.durationCopy}>
            <Text style={styles.duration}>{hours}h {minutes > 0 ? `${minutes}m` : ''}</Text>
            <Text style={styles.durationNote}>
              {durationHrs >= 8 ? 'A full night' : durationHrs >= 7 ? 'Enough to recover on' : 'Short of the 7 hours recovery needs'}
            </Text>
          </View>
        </View>
      </CompactCard>

      <TimeBlock
        label="Bedtime" icon="bed-outline"
        hour={bedHour} setHour={setBedHour}
        minute={bedMinute} setMinute={setBedMinute}
        meridiem={bedMeridiem} setMeridiem={setBedMeridiem}
      />
      <TimeBlock
        label="Woke up" icon="sunny-outline"
        hour={wakeHour} setHour={setWakeHour}
        minute={wakeMinute} setMinute={setWakeMinute}
        meridiem={wakeMeridiem} setMeridiem={setWakeMeridiem}
      />

      <View style={styles.qualityBlock}>
        <Text style={styles.fieldLabel}>How did you sleep?</Text>
        <SegmentedControl
          segments={QUALITIES.map((entry) => ({ value: String(entry.value), label: entry.label }))}
          value={String(quality)}
          onChange={(value) => setQuality(Number(value))}
          tone="blue"
          accessibilityLabel="Sleep quality"
        />
      </View>

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <CompactButton
        label={`Save sleep · ${xpEarned} XP`}
        tone="primary"
        icon="checkmark"
        block
        loading={saving}
        onPress={handleSave}
      />
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  durationCopy: { flex: 1, minWidth: 0 },
  duration: { color: colors.text, fontFamily: type.display, fontSize: 28, fontWeight: '900' },
  durationNote: { color: colors.textSecondary, fontSize: 11.5, marginTop: 2 },
  timeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  timeLabel: { flex: 1, color: colors.text, fontFamily: type.display, fontSize: 12.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.9 },
  timeValue: { color: colors.cornerBlue, fontFamily: type.display, fontSize: 15, fontWeight: '900' },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hour: {
    width: 44, minHeight: 34, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  hourActive: { borderColor: colors.cornerBlue, backgroundColor: colors.cornerBlue },
  hourText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 14, fontWeight: '800' },
  hourTextActive: { color: '#FFFFFF' },
  timeControls: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  minutes: { flex: 1, minWidth: 168 },
  qualityBlock: { gap: 6 },
  fieldLabel: { color: colors.textMuted, fontFamily: type.display, fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 7, padding: 9,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.crimsonGlow,
  },
  errorText: { flex: 1, color: colors.text, fontSize: 11.5 },
})
