import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { Button } from '../../../src/components/ui/Button'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { colors, combatChip, radius, type } from '../../../src/constants/theme'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINS = [0, 15, 30, 45]

function fmt(h: number, m: number) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`
}

export default function LogSleepScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  // Default: bedtime 10:30 PM, wake 6:30 AM
  const [bedH, setBedH] = useState(22)
  const [bedM, setBedM] = useState(30)
  const [wakeH, setWakeH] = useState(6)
  const [wakeM, setWakeM] = useState(30)
  const [quality, setQuality] = useState(3)
  const [loading, setLoading] = useState(false)

  // Compute duration
  const bedTotal = bedH * 60 + bedM
  let wakeTotal = wakeH * 60 + wakeM
  if (wakeTotal <= bedTotal) wakeTotal += 24 * 60
  const durationMins = wakeTotal - bedTotal
  const durationHrs = (durationMins / 60).toFixed(1)

  function buildDatetime(h: number, m: number, isWake: boolean): string {
    const now = new Date()
    const d = new Date(now)
    if (isWake) {
      // wake time = today
      d.setHours(h, m, 0, 0)
    } else {
      // bedtime = yesterday if hour >= 12 (afternoon/evening)
      if (h >= 12) d.setDate(d.getDate() - 1)
      d.setHours(h, m, 0, 0)
    }
    return d.toISOString()
  }

  async function handleSave() {
    if (!profile?.id || !circle?.id) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const xpEarned = parseFloat(durationHrs) >= 7 ? 30 : 20

    // Upsert on (user_id, log_date): correcting last night's times updates the
    // existing row. XP is per-night, not per-save — without this check,
    // re-logging would pay out again each time.
    const { data: alreadyLogged } = await supabase
      .from('sleep_logs')
      .select('id')
      .eq('user_id', profile.id)
      .eq('log_date', today)
      .maybeSingle()

    const { data, error } = await supabase
      .from('sleep_logs')
      .upsert({
        user_id: profile.id,
        circle_id: circle.id,
        bedtime: buildDatetime(bedH, bedM, false),
        wake_time: buildDatetime(wakeH, wakeM, true),
        quality,
        xp_earned: xpEarned,
        log_date: today,
      }, { onConflict: 'user_id,log_date' })
      .select().single()

    if (error) { setLoading(false); Alert.alert('Error', error.message); return }
    if (!alreadyLogged) {
      await earn('sleep', data?.id, `${durationHrs}h sleep`, xpEarned)
      await completeQuestByType('sleep', profile.id, circle.id, earn)
    }
    setLoading(false)
    // Alert.alert's button callbacks never fire on web, so navigating from
    // inside one strands the user on a form they already saved. Go back directly.
    router.back()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Log Sleep</Text>
      {!circle && <NoCircleBanner />}

      {/* Duration display */}
      <View style={styles.durationCard}>
        <Ionicons name="moon" size={28} color={colors.primary} />
        <Text style={styles.durationValue}>{durationHrs}h</Text>
        <Text style={styles.durationLabel}>
          {parseFloat(durationHrs) >= 8 ? 'Great night' : parseFloat(durationHrs) >= 7 ? 'Good' : 'Could be better'}
        </Text>
        <Text style={styles.durationXP}>+{parseFloat(durationHrs) >= 7 ? 30 : 20} XP</Text>
      </View>

      {/* Bedtime */}
      <View style={styles.section}>
        <Text style={styles.label}>Bedtime</Text>
        <Text style={styles.timeDisplay}>{fmt(bedH, bedM)}</Text>
        <View style={styles.pickerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            {HOURS.map(h => (
              <TouchableOpacity key={h} style={[styles.chip, bedH === h && styles.chipActive]} onPress={() => setBedH(h)}>
                <Text style={[styles.chipText, bedH === h && styles.chipTextActive]}>{h.toString().padStart(2,'0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            {MINS.map(m => (
              <TouchableOpacity key={m} style={[styles.chip, bedM === m && styles.chipActive]} onPress={() => setBedM(m)}>
                <Text style={[styles.chipText, bedM === m && styles.chipTextActive]}>{m.toString().padStart(2,'0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Wake time */}
      <View style={styles.section}>
        <Text style={styles.label}>Wake Time</Text>
        <Text style={styles.timeDisplay}>{fmt(wakeH, wakeM)}</Text>
        <View style={styles.pickerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            {HOURS.map(h => (
              <TouchableOpacity key={h} style={[styles.chip, wakeH === h && styles.chipActive]} onPress={() => setWakeH(h)}>
                <Text style={[styles.chipText, wakeH === h && styles.chipTextActive]}>{h.toString().padStart(2,'0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
            {MINS.map(m => (
              <TouchableOpacity key={m} style={[styles.chip, wakeM === m && styles.chipActive]} onPress={() => setWakeM(m)}>
                <Text style={[styles.chipText, wakeM === m && styles.chipTextActive]}>{m.toString().padStart(2,'0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Quality */}
      <View style={styles.section}>
        <Text style={styles.label}>Sleep Quality</Text>
        <View style={styles.qualityRow}>
          {[1,2,3,4,5].map(q => (
            <TouchableOpacity key={q} style={[styles.qualityBtn, quality === q && styles.qualityBtnActive]} onPress={() => setQuality(q)}>
              <Text style={[styles.qualityText, quality === q && styles.qualityTextActive]}>
                {['Poor','Fair','Good','Great','Perfect'][q-1]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Button label={`Save Sleep (+${parseFloat(durationHrs) >= 7 ? 30 : 20} XP)`} onPress={handleSave} loading={loading} celebrate />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingTop: 14, gap: 20, paddingBottom: 96 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 27, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },

  durationCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 24,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border,
  },
  durationValue: { color: colors.text, fontSize: 52, fontWeight: '800' },
  durationLabel: { color: colors.textMuted, fontSize: 14 },
  durationXP: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 4 },

  section: { gap: 10 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  timeDisplay: { color: colors.text, fontSize: 28, fontWeight: '700' },

  pickerRow: { height: 44 },
  picker: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 2 },
  chip: combatChip.base,
  chipActive: { ...combatChip.active, backgroundColor: colors.primary },
  chipText: { ...combatChip.text, fontSize: 15 },
  chipTextActive: combatChip.textActive,

  qualityRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  qualityBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.sm, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  qualityBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  qualityText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  qualityTextActive: { color: '#fff' },
})
