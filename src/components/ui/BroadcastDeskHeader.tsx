import React from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { Link, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, type } from '../../constants/theme'
import { useAuthStore } from '../../store/authStore'
import { useCircleStore } from '../../store/circleStore'
import { AnimatedPressable } from './AnimatedPressable'

const LINKS = [
  { href: '/(app)', label: 'Main Event', match: '/(app)' },
  { href: '/(app)/belt', label: 'The Belt', match: '/belt' },
  { href: '/(app)/callouts', label: 'Versus', match: '/callouts' },
  { href: '/(app)/circle', label: 'Your Corner', match: '/circle' },
  { href: '/(app)/log', label: 'Training', match: '/log' },
  { href: '/(app)/share', label: 'Fuel', match: '/share' },
  { href: '/(app)/discover', label: 'Nearby', match: '/discover' },
] as const

export function BroadcastDeskHeader() {
  const { width } = useWindowDimensions()
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()
  if (width < 900) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.ticker} accessibilityLabel="Circle activity ticker">
        <Text style={styles.live}>● LIVE</Text>
        <Text style={styles.tickerText}>{circle?.name ?? 'FIT BUDDIES'} · PERSONAL PROGRESS CHAMPIONSHIP</Text>
        <Text style={styles.tickerText}>FIGHT FOR YOUR STREAK · STAND FOR YOUR CREW</Text>
      </View>
      <View style={styles.nav}>
        <Link href="/(app)" asChild>
          <AnimatedPressable style={styles.brand}>
            <View style={styles.mark}><Ionicons name="barbell" size={20} color={colors.gold} /></View>
            <View><Text style={styles.brandName}>Fit Buddies</Text><Text style={styles.brandSub}>Combat Club</Text></View>
          </AnimatedPressable>
        </Link>
        <View style={styles.links}>
          {LINKS.map((link) => {
            const active = link.match === '/(app)' ? pathname === '/' || pathname === '/(app)' : pathname.includes(link.match)
            return (
              <Link key={link.label} href={link.href as any} asChild>
                <AnimatedPressable style={StyleSheet.flatten([styles.link, active && styles.linkActive])}>
                  <Text style={[styles.linkText, active && styles.linkTextActive]}>{link.label}</Text>
                </AnimatedPressable>
              </Link>
            )
          })}
        </View>
        <Link href="/(app)/profile" asChild>
          <AnimatedPressable style={styles.account} accessibilityLabel="Open fighter profile">
            <View style={styles.avatar}><Text style={styles.avatarText}>{profile?.display_name?.charAt(0).toUpperCase() ?? '?'}</Text></View>
            <View><Text style={styles.accountName}>{profile?.display_name ?? 'Contender'}</Text><Text style={styles.accountSub}>Lv. {profile?.level ?? 1} · Red corner</Text></View>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </AnimatedPressable>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg, zIndex: 20 },
  ticker: { minHeight: 32, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 24, backgroundColor: colors.gold, overflow: 'hidden' },
  live: { color: colors.primaryDark, fontFamily: type.display, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  tickerText: { color: colors.bg, fontFamily: type.display, fontSize: 11, fontWeight: '700', letterSpacing: .6, whiteSpace: 'nowrap' } as any,
  nav: { minHeight: 74, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 34 },
  mark: { width: 42, height: 42, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardRaised, transform: [{ skewX: '-7deg' }] },
  brandName: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: .7 },
  brandSub: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4 },
  links: { flex: 1, flexDirection: 'row', alignItems: 'stretch', height: 74 },
  link: { minWidth: 84, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border, borderBottomWidth: 4, borderBottomColor: 'transparent' },
  linkActive: { borderBottomColor: colors.primary, backgroundColor: colors.cardRaised },
  linkText: { color: colors.textSecondary, fontFamily: type.display, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  linkTextActive: { color: colors.text },
  account: { flexDirection: 'row', alignItems: 'center', gap: 9, marginLeft: 20 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: colors.gold, backgroundColor: colors.cardRaised, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.gold, fontWeight: '900' },
  accountName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  accountSub: { color: colors.textMuted, fontSize: 10 },
})
