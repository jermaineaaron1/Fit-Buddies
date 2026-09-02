import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { useCircleStore } from '../../src/store/circleStore'
import { useXP } from '../../src/hooks/useXP'
import { Ionicons } from '@expo/vector-icons'
import { XPBar } from '../../src/components/xp/XPBar'
import { Card } from '../../src/components/ui/Card'
import { Button } from '../../src/components/ui/Button'
import { getLevelLabel } from '../../src/constants/xp'
import { colors, radius, type } from '../../src/constants/theme'
import { supabase } from '../../src/lib/supabase'
import { BodyMetricsFields, emptyBodyMetrics, profileToBodyMetrics, validateBodyMetrics } from '../../src/components/profile/BodyMetricsFields'
import { NutritionGoalCard } from '../../src/components/profile/NutritionGoalCard'
import { ProfileIdentityStudio } from '../../src/components/profile/ProfileIdentityStudio'
import { ChampionshipRecordCard } from '../../src/components/belt/ChampionshipRecordCard'

export default function ProfileScreen() {
  const router = useRouter()
  const { profile, signOut, setProfile } = useAuthStore()
  const { circle } = useCircleStore()
  const { weeklyXP, totalXP, level, streak, recentEvents } = useXP()
  const [editingMetrics, setEditingMetrics] = useState(false)
  const [savingMetrics, setSavingMetrics] = useState(false)
  const [bodyMetrics, setBodyMetrics] = useState(emptyBodyMetrics)
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  useEffect(() => {
    if (profile) setBodyMetrics(profileToBodyMetrics(profile))
  }, [profile])

  // Alert.alert's buttons are a no-op on web, so the confirmation dialog never
  // appeared and Sign Out did nothing at all there. A two-tap confirm keeps the
  // "are you sure" intent and works on every platform.
  function handleSignOut() {
    if (!confirmingSignOut) {
      setConfirmingSignOut(true)
      setTimeout(() => setConfirmingSignOut(false), 4000)
      return
    }
    signOut()
  }

  async function saveBodyMetrics() {
    if (!profile) return
    const result = validateBodyMetrics(bodyMetrics)
    if (!result.payload) return Alert.alert('Check your measurements', result.error)
    setSavingMetrics(true)
    const { data, error } = await supabase.from('profiles').update(result.payload).eq('id', profile.id).select('*').single()
    setSavingMetrics(false)
    if (error || !data) return Alert.alert('Could not save', error?.message ?? 'Please try again.')
    setProfile(data)
    setEditingMetrics(false)
  }

  if (!profile) return null

  const stats = [
    { label: 'Total XP', value: totalXP.toLocaleString(), icon: 'flash-outline' },
    { label: 'Weekly XP', value: weeklyXP.toLocaleString(), icon: 'calendar-outline' },
    { label: 'Current Streak', value: `${streak}d`, icon: 'flame-outline' },
    { label: 'Longest Streak', value: `${profile.longest_streak}d`, icon: 'trophy-outline' },
    { label: 'Level', value: `${level} · ${getLevelLabel(level)}`, icon: 'medal-outline' },
  ]

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.display_name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.displayName}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {circle && (
        <View style={styles.circleRow}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={styles.circleName}>{circle.name}</Text>
        </View>
      )}
      </View>

      <ProfileIdentityStudio />

      {/* XP Bar */}
      <Card>
        <XPBar totalXP={totalXP} level={level} weeklyXP={weeklyXP} />
      </Card>

      <Card style={styles.measurementsCard}>
        <View style={styles.measurementsHeader}>
          <View style={styles.measurementsTitleRow}>
            <Ionicons name="body-outline" size={19} color={colors.primary} />
            <View><Text style={styles.sectionTitle}>Your Measurements</Text><Text style={styles.privateLabel}>Private · editable anytime</Text></View>
          </View>
          {!editingMetrics && <TouchableOpacity style={styles.editButton} onPress={() => setEditingMetrics(true)} accessibilityRole="button"><Ionicons name="pencil" size={15} color={colors.primary} /><Text style={styles.editButtonText}>Edit</Text></TouchableOpacity>}
        </View>

        {editingMetrics ? (
          <View style={styles.editor}>
            <BodyMetricsFields value={bodyMetrics} onChange={setBodyMetrics} />
            <View style={styles.editorActions}>
              <View style={styles.editorAction}><Button label="Cancel" variant="secondary" onPress={() => { setBodyMetrics(profileToBodyMetrics(profile)); setEditingMetrics(false) }} /></View>
              <View style={styles.editorAction}><Button label="Save" onPress={saveBodyMetrics} loading={savingMetrics} celebrate /></View>
            </View>
          </View>
        ) : profile.height_cm && profile.weight_kg && profile.age && profile.gender ? (
          <View style={styles.measurementsGrid}>
            <Measurement label="Height" value={formatHeight(profile.height_cm, profile.preferred_height_unit)} />
            <Measurement label="Weight" value={formatWeight(profile.weight_kg, profile.preferred_weight_unit)} />
            <Measurement label="Age" value={`${profile.age}`} />
            <Measurement label="Gender" value={profile.gender === 'male' ? 'Male' : 'Female'} />
            <Measurement label="Body fat" value={profile.body_fat_percentage == null ? 'Not set' : `${profile.body_fat_percentage}%`} />
            <Measurement label="Muscle mass" value={profile.muscle_mass_kg == null ? 'Not set' : formatWeight(profile.muscle_mass_kg, profile.preferred_weight_unit)} />
          </View>
        ) : (
          <TouchableOpacity style={styles.addMeasurements} onPress={() => setEditingMetrics(true)} accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <View style={styles.addMeasurementsCopy}><Text style={styles.addMeasurementsTitle}>Complete your tale of the tape</Text><Text style={styles.addMeasurementsSub}>Add height, weight, age, and body composition.</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </Card>

      <NutritionGoalCard />

      <ChampionshipRecordCard userId={profile.id} />

      {/* Stats */}
      <Card style={styles.statsCard}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statRow}>
            <Ionicons name={stat.icon as any} size={18} color={colors.primary} style={styles.statIcon} />
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </Card>

      {/* Recent XP Events */}
      {recentEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent XP</Text>
          {recentEvents.slice(0, 8).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.eventDescription}>{event.description ?? event.action_type}</Text>
              <Text style={styles.eventXP}>+{event.xp_amount} XP</Text>
            </View>
          ))}
        </View>
      )}

      {/* Motivational Corner shortcut */}
      <TouchableOpacity style={styles.motivateRow} onPress={() => router.push('/(app)/motivate' as any)}>
        <Ionicons name="flame-outline" size={20} color={colors.warning} />
        <Text style={styles.motivateText}>Motivational Corner</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Button
        label={confirmingSignOut ? 'Tap again to confirm' : 'Sign Out'}
        onPress={handleSignOut}
        variant="danger"
      />
    </ScrollView>
  )
}

function Measurement({ label, value }: { label: string; value: string }) {
  return <View style={styles.measurement}><Text style={styles.measurementLabel}>{label}</Text><Text style={styles.measurementValue}>{value}</Text></View>
}

function formatWeight(kg: number, unit: 'kg' | 'lb') {
  return unit === 'kg' ? `${round(kg, 1)} kg` : `${round(kg * 2.20462, 1)} lb`
}

function formatHeight(cm: number, unit: 'cm' | 'ft') {
  if (unit === 'cm') return `${round(cm, 1)} cm`
  const totalInches = cm / 2.54
  return `${Math.floor(totalInches / 12)}′ ${round(totalInches % 12, 1)}″`
}

function round(value: number, places: number) { const factor = 10 ** places; return Math.round(value * factor) / factor }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 96, paddingTop: 14 },
  avatarSection: { alignItems: 'center', gap: 8, paddingTop: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  displayName: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  username: { color: colors.textMuted, fontSize: 15 },
  circleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  circleName: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  statsCard: { gap: 14 },
  measurementsCard: { gap: 14 },
  measurementsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  measurementsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  privateLabel: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  editButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.primaryGlow, borderWidth: 1, borderColor: colors.primary },
  editButtonText: { color: colors.primary, fontFamily: type.display, fontWeight: '800', textTransform: 'uppercase' },
  measurementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measurement: { width: '48%', padding: 11, borderRadius: radius.sm, backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.primary },
  measurementLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  measurementValue: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '800', marginTop: 3 },
  addMeasurements: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58 },
  addMeasurementsCopy: { flex: 1 },
  addMeasurementsTitle: { color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '800', textTransform: 'uppercase' },
  addMeasurementsSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  editor: { gap: 16 },
  editorActions: { flexDirection: 'row', gap: 8 },
  editorAction: { flex: 1 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIcon: { width: 24 },
  statLabel: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '700', textTransform: 'uppercase' },
  eventRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  eventDescription: { color: colors.textSecondary, fontSize: 14, flex: 1 },
  eventXP: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  motivateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  motivateText: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
})
