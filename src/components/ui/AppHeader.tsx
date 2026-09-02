import React from 'react'
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, usePathname, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { colors, layout, radius, type } from '../../constants/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useAuthStore } from '../../store/authStore'
import { useCircleStore } from '../../store/circleStore'
import { useUIStore } from '../../store/uiStore'
import { DESKTOP_NAV, SECONDARY_NAV, isActive } from '../../constants/navigation'
import { AnimatedPressable } from './AnimatedPressable'
import { IconButton } from './IconButton'

/**
 * One header for both form factors. On a phone it is a 54px identity bar with
 * an overflow control; from 900px up the same element grows to 64px and takes
 * on the full navigation, replacing the bottom bar. Same tree, different
 * branches — no parallel desktop component.
 */
export function AppHeader() {
  const { isDesktop, pageMargin } = useBreakpoint()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  const { openQuickLog, moreMenuOpen, setMoreMenuOpen } = useUIStore()

  const avatarUrl = profile?.avatar_source === 'ai'
    ? profile?.ai_avatar_url ?? profile?.avatar_url ?? null
    : profile?.avatar_url ?? null

  const brand = (
    <Link href="/(app)" asChild>
      <AnimatedPressable style={styles.brand} accessibilityRole="link" accessibilityLabel="Fit Buddies home">
        <View style={styles.mark}>
          <Ionicons name="barbell" size={isDesktop ? 17 : 15} color={colors.gold} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={styles.brandName} numberOfLines={1}>Fit Buddies</Text>
          {isDesktop && <Text style={styles.brandSub} numberOfLines={1}>Combat Club</Text>}
        </View>
      </AnimatedPressable>
    </Link>
  )

  return (
    <>
      <View
        style={[
          styles.bar,
          { paddingHorizontal: pageMargin, paddingTop: insets.top },
          isDesktop ? styles.barDesktop : styles.barPhone,
        ]}
      >
        <View style={[styles.inner, { minHeight: isDesktop ? layout.headerDesktop : layout.headerPhone }]}>
          {brand}

          {isDesktop ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.linksScroll}
                contentContainerStyle={styles.links}
              >
                {DESKTOP_NAV.map((destination) => {
                  const active = isActive(destination, pathname)
                  return (
                    <Link key={destination.label} href={destination.href as never} asChild>
                      <AnimatedPressable
                        accessibilityRole="link"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={destination.label}
                        style={StyleSheet.flatten([styles.link, active && styles.linkActive])}
                      >
                        <Text style={[styles.linkText, active && styles.linkTextActive]} numberOfLines={1}>
                          {destination.label}
                        </Text>
                      </AnimatedPressable>
                    </Link>
                  )
                })}
              </ScrollView>

              <View style={styles.actions}>
                <IconButton icon="add" tone="primary" onPress={openQuickLog} accessibilityLabel="Open quick log" />
                <Link href="/(app)/profile" asChild>
                  <AnimatedPressable style={styles.account} accessibilityRole="link" accessibilityLabel="Open your profile">
                    <View style={styles.avatar}>
                      {avatarUrl
                        ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                        : <Text style={styles.avatarText}>{profile?.display_name?.charAt(0).toUpperCase() ?? '?'}</Text>}
                    </View>
                    <View style={styles.accountCopy}>
                      <Text style={styles.accountName} numberOfLines={1}>{profile?.display_name ?? 'Contender'}</Text>
                      <Text style={styles.accountSub} numberOfLines={1}>Lv. {profile?.level ?? 1}</Text>
                    </View>
                  </AnimatedPressable>
                </Link>
              </View>
            </>
          ) : (
            <>
              {/* The circle name is the one piece of context worth the space
                  on a phone; the page title lives in the page, not here. */}
              {circle?.name ? <Text style={styles.circle} numberOfLines={1}>{circle.name}</Text> : <View style={styles.spacer} />}
              <View style={styles.actions}>
                <IconButton
                  icon="chatbubble-outline"
                  onPress={() => router.push('/(app)/circle/chat' as never)}
                  accessibilityLabel="Open circle chat"
                  size="sm"
                />
                <IconButton
                  icon="ellipsis-horizontal"
                  onPress={() => setMoreMenuOpen(true)}
                  accessibilityLabel="More destinations"
                  size="sm"
                />
              </View>
            </>
          )}
        </View>
      </View>

      <Modal visible={moreMenuOpen && !isDesktop} transparent animationType="fade" onRequestClose={() => setMoreMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMoreMenuOpen(false)} accessibilityLabel="Close menu">
          <Pressable style={[styles.menu, { top: insets.top + layout.headerPhone + 4 }]} onPress={(event) => event.stopPropagation()}>
            {SECONDARY_NAV.map((destination) => (
              <AnimatedPressable
                key={destination.label}
                accessibilityRole="link"
                accessibilityLabel={destination.label}
                style={styles.menuItem}
                onPress={() => { setMoreMenuOpen(false); router.push(destination.href as never) }}
              >
                <Ionicons name={destination.icon} size={17} color={colors.textSecondary} />
                <Text style={styles.menuText}>{destination.label}</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </AnimatedPressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, zIndex: 20 },
  barPhone: { borderBottomWidth: 1, borderBottomColor: colors.border },
  barDesktop: { borderBottomWidth: 1, borderBottomColor: colors.border },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  mark: {
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.cardRaised,
    transform: [{ skewX: '-7deg' }],
  },
  brandCopy: { minWidth: 0 },
  brandName: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  brandSub: { color: colors.textMuted, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1.3 },
  circle: { flex: 1, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  spacer: { flex: 1 },
  linksScroll: { flex: 1, flexGrow: 1 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent', minHeight: 34, justifyContent: 'center',
  },
  linkActive: { borderBottomColor: colors.primary, backgroundColor: colors.cardRaised },
  linkText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  linkTextActive: { color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar: {
    width: 30, height: 30, borderRadius: 15, overflow: 'hidden',
    borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.cardRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.gold, fontFamily: type.display, fontSize: 13, fontWeight: '900' },
  accountCopy: { minWidth: 0 },
  accountName: { color: colors.text, fontSize: 11.5, fontWeight: '700' },
  accountSub: { color: colors.textMuted, fontSize: 9.5 },
  backdrop: { flex: 1, backgroundColor: '#00000099' },
  menu: {
    position: 'absolute', right: 12, minWidth: 196,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderLight,
    backgroundColor: colors.surface, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 13, minHeight: layout.touch,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '600' },
})
