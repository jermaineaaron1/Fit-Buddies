import React, { useState } from 'react'
import { Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useXP } from '../../../src/hooks/useXP'
import { Button } from '../../../src/components/ui/Button'
import { Input } from '../../../src/components/ui/Input'

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
    if (!profile?.id || !circle?.id) {
      Alert.alert('No circle', 'Join a circle first.')
      return
    }
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
    setLoading(false)
    Alert.alert('Posted! 🛒', '+10 XP earned.', [{ text: 'Done', onPress: () => router.back() }])
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Share a Grocery Find</Text>
      <Input label="Item Name" value={itemName} onChangeText={setItemName} placeholder="e.g. High Protein Greek Yogurt" autoCapitalize="words" />
      <Input label="Store (optional)" value={store} onChangeText={setStore} placeholder="e.g. Walmart, Costco" />
      <Input label="Price (optional)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Why you like it, where to find it..." multiline />
      <Button label="Post Find (+10 XP)" onPress={handleSave} loading={loading} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  container: { padding: 20, gap: 16, paddingBottom: 60 },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: '800', marginBottom: 4 },
})
