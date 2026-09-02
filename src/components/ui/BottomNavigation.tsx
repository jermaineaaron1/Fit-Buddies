import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, radius, type } from '../../constants/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useUIStore } from '../../store/uiStore'
import { PRIMARY_NAV, isActive } from '../../constants/navigation'
import { AnimatedPressable } from './AnimatedPressable'

/**
 * Five slots: two destinations, the central Log action, two more destinations.
 * Hidden from 900px up, where the header takes over navigation entirely.
 */
export function BottomNavigation({ state, navigation }: { state: any; navigation: any }) {
  const { isDesktop } = useBreakpoint()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const openQuickLog = useUIStore((store) => store.openQuickLog)

  if (isDesktop) return null

  const left = PRIMARY_NAV.slice(0, 2)
  const right = PRIMARY_NAV.slice(2)

  function go(routeName: string) {
    const route = state.routes.find((candidate: any) => candidate.name === routeName)
    const focused = !!route && state.routes[state.index]?.key === route.key
    const event = navigation.emit({ type: 'tabPress', target: route?.key, canPreventDefault: true })
    if (!focused && !event.defaultPrevented) navigation.navigate(routeName)
  }

  function renderTab(destination: typeof PRIMARY_NAV[number]) {
    const active = isActive(destination, pathname)
    return (
      <AnimatedPressable
        key={destination.label}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={destination.label}
        onPress={() => go(destination.match)}
      >
        <Ionicons
          name={active ? destination.activeIcon : destination.icon}
          size={19}
          color={active ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>{destination.label}</Text>
        {active && <View style={styles.activeRule} />}
      </AnimatedPressable>
    )
  }

  return (
    <View
      style={[
        styles.bar,
        // Sits above the gesture bar rather than under it.
        { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8) },
      ]}
    >
      {left.map(renderTab)}

      <AnimatedPressable
        style={styles.tab}
        onPress={openQuickLog}
        accessibilityRole="button"
        accessibilityLabel="Log activity"
      >
        <View style={styles.logPlate}>
          <Ionicons name="add" size={22} color={colors.bg} />
        </View>
        <Text style={[styles.label, styles.labelLog]} numberOfLines={1}>Log</Text>
      </AnimatedPressable>

      {right.map(renderTab)}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingTop: 6, paddingHorizontal: 4,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3,
    minHeight: layout.touch, paddingTop: 4, position: 'relative',
  },
  label: {
    color: colors.textMuted, fontFamily: type.display, fontSize: 9.5,
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3,
  },
  labelActive: { color: colors.primary },
  labelLog: { color: colors.gold },
  // A short rule under the active label, rather than a filled pill behind the
  // icon — less ink for the same signal.
  activeRule: { position: 'absolute', bottom: -5, width: 18, height: 2, backgroundColor: colors.primary },
  logPlate: {
    width: 40, height: 26, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.sm, backgroundColor: colors.gold,
    transform: [{ skewX: '-9deg' }],
  },
})
