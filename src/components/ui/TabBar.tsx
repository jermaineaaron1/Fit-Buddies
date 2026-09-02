import React from 'react'
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { AnimatedPressable } from './AnimatedPressable'

type Tab = { name: string; label: string; icon: string; activeIcon: string }

const TABS: Tab[] = [
  { name: 'index', label: 'Event', icon: 'trophy-outline', activeIcon: 'trophy' },
  { name: 'belt', label: 'Belt', icon: 'ribbon-outline', activeIcon: 'ribbon' },
  { name: 'callouts', label: 'Versus', icon: 'flash-outline', activeIcon: 'flash' },
  { name: 'circle', label: 'Corner', icon: 'people-outline', activeIcon: 'people' },
  { name: 'share', label: 'Fuel', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { name: 'profile', label: 'Fighter', icon: 'person-outline', activeIcon: 'person' },
]

export function TabBar({ state, navigation }: { state: any; navigation: any }) {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  if (width >= 900) return null
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 26 : 12) + 8 }]}>
      {TABS.map((tab) => {
        const route = state.routes.find((candidate: any) => candidate.name === tab.name)
        const focused = !!route && state.routes[state.index]?.key === route.key
        return (
          <AnimatedPressable key={tab.name} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={tab.label} onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) navigation.navigate(tab.name)
          }}>
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}><Ionicons name={(focused ? tab.activeIcon : tab.icon) as any} size={21} color={focused ? colors.gold : colors.textMuted} /></View>
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
          </AnimatedPressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4, minHeight: 52 },
  iconWrap: { width: 40, height: 31, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.cardRaised, borderBottomWidth: 3, borderBottomColor: colors.primary },
  label: { fontFamily: type.display, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  labelActive: { color: colors.gold },
})
