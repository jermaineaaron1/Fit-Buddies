import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { supabase } from '../../../src/lib/supabase'
import { colors, combatChip, radius, type } from '../../../src/constants/theme'
import { getCalloutFormatForRank, type CalloutFormatInfo } from '../../../src/lib/callouts'
import { compareContenders } from '../../../src/lib/circleSnapshot'
import { notifyCircle } from '../../../src/lib/push'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'

const ACTIVITY_TYPES = ['Workout', 'Steps', 'Walk', 'Meal', 'Sleep']
const STAKES_PRESETS = [
  'Loser buys smoothies',
  'Loser does the dishes this week',
  'Loser posts an embarrassing photo',
  'Bragging rights only',
]
const WHEN_OPTIONS = [
  { label: 'Tonight, 7 PM', getDate: () => setTime(new Date(), 19, 0) },
  { label: 'Tomorrow, 7 AM', getDate: () => setTime(addDays(new Date(), 1), 7, 0) },
  { label: 'This Weekend', getDate: () => setTime(nextSaturday(), 9, 0) },
]

function setTime(d: Date, h: number, m: number) { const c = new Date(d); c.setHours(h, m, 0, 0); return c }
function addDays(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c }
function nextSaturday() { const d = new Date(); const diff = (6 - d.getDay() + 7) % 7 || 7; return addDays(d, diff) }

type PoolMember = { user_id: string; display_name: string; rank: number }

export default function NewCalloutScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()

  const [myRank, setMyRank] = useState<number | null>(null)
  const [pool, setPool] = useState<PoolMember[]>([])
  const [activity, setActivity] = useState(ACTIVITY_TYPES[0])
  const [target, setTarget] = useState('')
  const [stakes, setStakes] = useState('')
  const [whenIndex, setWhenIndex] = useState(0)
  const [selectedOpenIds, setSelectedOpenIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadRankAndPool() {
      if (!circle?.id || !profile?.id) return
      const { data: memberProfiles } = await supabase
        .from('circle_members')
        .select('user_id, profiles(display_name, weekly_xp, baseline_weekly_xp)')
        .eq('circle_id', circle.id)
      if (!memberProfiles) return

      // Ranked by improvement against each member's own baseline — the same
      // rule the standings and The Belt use. Sorting on raw weekly XP here
      // handed the easiest title format to whoever simply logged the most,
      // and this screen is where the format and the eligible opponent pool
      // are actually decided.
      const ranked: PoolMember[] = [...memberProfiles]
        .map((member: any) => {
          const weeklyXp = member.profiles?.weekly_xp ?? 0
          const baseline = member.profiles?.baseline_weekly_xp
          return {
            user_id: member.user_id as string,
            display_name: member.profiles?.display_name ?? 'Unknown',
            weekly_xp: weeklyXp,
            improvement_pct: baseline == null || baseline <= 0 ? null : (weeklyXp - baseline) / baseline,
          }
        })
        .sort(compareContenders)
        .map((member, index) => ({ user_id: member.user_id, display_name: member.display_name, rank: index + 1 }))

      const myEntry = ranked.find((member) => member.user_id === profile.id)
      setMyRank(myEntry?.rank ?? ranked.length)
      setPool(ranked)
    }
    loadRankAndPool()
  }, [circle?.id, profile?.id])

  if (myRank === null) return null

  const format: CalloutFormatInfo = getCalloutFormatForRank(myRank)
  const tieredParticipants = format.poolSize > 0 ? pool.filter(m => m.rank <= format.poolSize) : []
  const openCandidates = pool.filter(m => m.user_id !== profile?.id)

  function toggleOpenSelection(userId: string) {
    setSelectedOpenIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : prev.length < 4 ? [...prev, userId] : prev
    )
  }

  async function handleSubmit() {
    if (!circle?.id || !profile?.id) return
    if (!target.trim()) { Alert.alert('Missing target', 'Set your personal target for this callout.'); return }
    if (format.poolSize === 0 && selectedOpenIds.length === 0) {
      Alert.alert('Pick contenders', 'Select at least one contender to call out.')
      return
    }

    setLoading(true)
    const startTime = WHEN_OPTIONS[whenIndex].getDate().toISOString()

    const { data: callout, error } = await supabase
      .from('callouts')
      .insert({
        circle_id: circle.id,
        format: format.format,
        issuer_id: profile.id,
        activity_type: activity,
        personal_target: target.trim(),
        stakes: stakes.trim() || null,
        start_time: startTime,
      })
      .select()
      .single()

    if (error || !callout) {
      setLoading(false)
      Alert.alert('Error', error?.message ?? 'Could not create callout.')
      return
    }

    const participantIds = format.poolSize > 0
      ? tieredParticipants.map(m => m.user_id)
      : [profile.id, ...selectedOpenIds]

    // A callout with no participants is a dead match room nobody can accept,
    // so surface this rather than navigating into a broken card.
    const { error: participantError } = await supabase.from('callout_participants').insert(
      participantIds.map(userId => ({
        callout_id: callout.id,
        user_id: userId,
        status: userId === profile.id ? 'accepted' : 'invited',
      }))
    )
    if (participantError) {
      setLoading(false)
      Alert.alert('Fighters not added', participantError.message)
      return
    }

    // Not awaited: the callout is already saved, and nobody should wait on a
    // push round-trip before seeing their own match room.
    notifyCircle({ event: 'callout_issued', calloutId: callout.id })

    setLoading(false)
    router.replace(`/(app)/callouts/${callout.id}` as any)
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>ISSUE A FITBUDDY TITLE CALLOUT</Text>
      <Text style={styles.title}>Book the Match</Text>
      <Text style={styles.subtitle}>You're ranked #{myRank}. Format is set automatically by your rank.</Text>

      <View style={styles.formatCard}>
        <Text style={styles.formatEyebrow}>YOUR ELIGIBLE TITLE MATCH</Text>
        <Text style={styles.formatLabel}>{format.label}</Text>
        <Text style={styles.formatDesc}>{format.description}</Text>
      </View>

      {format.poolSize > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTENDERS IN THIS MATCH</Text>
          {tieredParticipants.map(m => (
            <View key={m.user_id} style={styles.participantRow}>
              <Text style={styles.participantRank}>#{m.rank}</Text>
              <Text style={styles.participantName}>{m.display_name}{m.user_id === profile?.id ? ' (you)' : ''}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PICK 1-4 CONTENDERS</Text>
          {openCandidates.map(m => {
            const selected = selectedOpenIds.includes(m.user_id)
            return (
              <TouchableOpacity key={m.user_id} style={[styles.pickRow, selected && styles.pickRowSelected]} onPress={() => toggleOpenSelection(m.user_id)}>
                <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={20} color={selected ? colors.primary : colors.textMuted} />
                <Text style={styles.participantName}>{m.display_name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.sectionLabel}>ACTIVITY</Text>
          <View style={styles.chipRow}>
            {ACTIVITY_TYPES.map(a => (
              <TouchableOpacity key={a} style={[styles.chip, activity === a && styles.chipActive]} onPress={() => setActivity(a)}>
                <Text style={[styles.chipText, activity === a && styles.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Input label="My Personal Target" value={target} onChangeText={setTarget} placeholder="e.g. 5,000 steps" />

      <View>
        <Text style={styles.sectionLabel}>START TIME</Text>
        <View style={styles.chipRow}>
          {WHEN_OPTIONS.map((w, i) => (
            <TouchableOpacity key={w.label} style={[styles.chip, whenIndex === i && styles.chipActive]} onPress={() => setWhenIndex(i)}>
              <Text style={[styles.chipText, whenIndex === i && styles.chipTextActive]}>{w.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>STIPULATION (OPTIONAL)</Text>
        <View style={styles.chipRow}>
          {STAKES_PRESETS.map(s => (
            <TouchableOpacity key={s} style={[styles.chip, stakes === s && styles.chipActive]} onPress={() => setStakes(s)}>
              <Text style={[styles.chipText, stakes === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input value={stakes} onChangeText={setStakes} placeholder="Or write your own stipulation..." style={styles.stakesInput} />
      </View>

      <View style={styles.consentBox}>
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
        <Text style={styles.consentText}>Every participant must accept. Personal targets may differ by ability, and anyone may modify, pause, decline, or stop.</Text>
      </View>

      <Button label="Send Official Callout" onPress={handleSubmit} loading={loading} celebrate />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingTop: 14, gap: 18, paddingBottom: 96 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 28, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },

  formatCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary + '40', padding: 16, gap: 4,
  },
  formatEyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  formatLabel: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  formatDesc: { color: colors.textSecondary, fontSize: 13 },

  section: { gap: 8 },
  sectionLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  participantRank: { color: colors.primary, fontSize: 13, fontWeight: '800', width: 28 },
  participantName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  pickRowSelected: { borderColor: colors.primary },

  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: combatChip.base,
  chipActive: { ...combatChip.active, backgroundColor: colors.primary },
  chipText: combatChip.text,
  chipTextActive: combatChip.textActive,
  stakesInput: { marginTop: 10 },

  consentBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.accentGlow, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accent + '30', padding: 12,
  },
  consentText: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, flex: 1 },
})
