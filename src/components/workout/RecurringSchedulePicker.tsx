import React, { useState, useEffect } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

interface RecurringSchedulePickerProps {
  visible: boolean
  onClose: () => void
  onSave: (input: { title: string; daysOfWeek: number[] }) => void
  initialTitle: string
}

export function RecurringSchedulePicker({ visible, onClose, onSave, initialTitle }: RecurringSchedulePickerProps) {
  const [title, setTitle] = useState(initialTitle)
  const [days, setDays] = useState<number[]>([])

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle)
      setDays([])
    }
  }, [visible, initialTitle])

  function toggleDay(day: number) {
    setDays((previous) => (previous.includes(day) ? previous.filter((d) => d !== day) : [...previous, day].sort((a, b) => a - b)))
  }

  function handleSave() {
    if (!title.trim() || days.length === 0) return
    onSave({ title: title.trim(), daysOfWeek: days })
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Make Recurring</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Input label="Plan Name" value={title} onChangeText={setTitle} placeholder="e.g. Push Day" />

          <View>
            <Text style={styles.label}>WHICH DAYS?</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  style={[styles.dayChip, days.includes(day.value) && styles.dayChipActive]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text style={[styles.dayChipText, days.includes(day.value) && styles.dayChipTextActive]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.frequencyNote}>{days.length === 0 ? 'Pick at least one day.' : `${days.length}x per week`}</Text>
          </View>

          <Button label="Save Schedule" onPress={handleSave} disabled={!title.trim() || days.length === 0} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  closeBtn: { padding: 4 },
  body: { padding: 20, gap: 16 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 46, height: 46, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  dayChipTextActive: { color: '#fff' },
  frequencyNote: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
})
