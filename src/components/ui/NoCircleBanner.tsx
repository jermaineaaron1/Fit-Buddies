import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { colors, radius } from '../../constants/theme'

export function NoCircleBanner() {
  const router = useRouter()
  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
      <Text style={styles.text}>Join a circle to save your progress.</Text>
      <TouchableOpacity onPress={() => router.push('/(app)/circle/join' as any)}>
        <Text style={styles.link}>Join</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '15',
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: radius.md,
    padding: 12,
  },
  text: { color: colors.warning, fontSize: 13, flex: 1 },
  link: { color: colors.warning, fontSize: 13, fontWeight: '800' },
})
