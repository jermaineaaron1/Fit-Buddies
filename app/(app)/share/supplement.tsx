import React, { useState } from 'react'
import { Text, StyleSheet, ScrollView, Alert, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { colors, combatChip, type } from '../../../src/constants/theme'

const CATEGORIES = ['protein', 'creatine', 'vitamin', 'preworkout', 'other'] as const

export default function ShareSupplementScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('protein')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter the supplement name.')
      return
    }
    if (!profile?.id || !circle?.id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('supplement_posts')
      .insert({
        user_id: profile.id,
        circle_id: circle.id,
        supplement_name: name.trim(),
        category,
        price: price ? parseFloat(price) : null,
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (error) {
      setLoading(false)
      Alert.alert('Error', error.message)
      return
    }

    await earn('supplement_post', data.id, name.trim())
    await completeQuestByType('share', profile.id, circle.id, earn)
    setLoading(false)
    // Alert.alert's button callbacks never fire on web, so navigating from
    // inside one strands the user on a form they already saved. Go back directly.
    router.back()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Share a Supplement</Text>
      {!circle && <NoCircleBanner />}
      <Input label="Supplement Name" value={name} onChangeText={setName} placeholder="e.g. Creatine Monohydrate" autoCapitalize="words" />

      <View>
        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Input label="Price (optional)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Brand, dosage, where to buy..." multiline />
      <Button label="Post Supplement (+10 XP)" onPress={handleSave} loading={loading} celebrate />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, gap: 16, paddingBottom: 96, paddingTop: 14 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 27, fontWeight: '900', letterSpacing: 0.2, marginBottom: 4, textTransform: 'uppercase' },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: combatChip.base,
  chipActive: { ...combatChip.active, backgroundColor: colors.primary },
  chipText: { ...combatChip.text, fontSize: 14 },
  chipTextActive: combatChip.textActive,
})
