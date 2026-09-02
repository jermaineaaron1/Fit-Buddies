import React, { useState } from 'react'
import { Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { colors, type } from '../../../src/constants/theme'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'


export default function ShareGroceryScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { earn } = useXP()

  const [itemName, setItemName] = useState('')
  const [store, setStore] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!itemName.trim()) {
      Alert.alert('Missing item', 'Enter the grocery item name.')
      return
    }
    if (!profile?.id || !circle?.id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('grocery_posts')
      .insert({
        user_id: profile.id,
        circle_id: circle.id,
        item_name: itemName.trim(),
        store: store.trim() || null,
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

    await earn('grocery_post', data.id, itemName.trim())
    await completeQuestByType('share', profile.id, circle.id, earn)
    setLoading(false)
    // Alert.alert's button callbacks never fire on web, so navigating from
    // inside one strands the user on a form they already saved. Go back directly.
    router.back()
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>FUEL INTEL · HELP YOUR CORNER</Text>
      <Text style={styles.title}>Share a Grocery Find</Text>
      {!circle && <NoCircleBanner />}
      <Input label="Item Name" value={itemName} onChangeText={setItemName} placeholder="e.g. High Protein Greek Yogurt" autoCapitalize="words" />
      <Input label="Store (optional)" value={store} onChangeText={setStore} placeholder="e.g. Walmart, Costco" />
      <Input label="Price (optional)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Why you like it, where to find it..." multiline />
      <Button label="Post Find (+10 XP)" onPress={handleSave} loading={loading} celebrate />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, gap: 16, paddingBottom: 96, paddingTop: 14 },
  eyebrow: { color: colors.gold, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 27, fontWeight: '900', letterSpacing: 0.2, marginBottom: 4, textTransform: 'uppercase' },
})
