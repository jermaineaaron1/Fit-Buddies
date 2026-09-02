import type { Ionicons } from '@expo/vector-icons'

export interface NavDestination {
  /** Expo Router href. */
  href: string
  label: string
  /** Route-name fragment used to decide the active state. */
  match: string
  icon: keyof typeof Ionicons.glyphMap
  activeIcon: keyof typeof Ionicons.glyphMap
}

/**
 * The five that earn a permanent slot on a phone. Everything else is reachable
 * but not resident — a six- or seven-item bar leaves each target under 54px
 * wide at 375, which is below a comfortable tap.
 */
export const PRIMARY_NAV: readonly NavDestination[] = [
  { href: '/(app)', label: 'Main Event', match: 'index', icon: 'trophy-outline', activeIcon: 'trophy' },
  { href: '/(app)/log', label: 'Training', match: 'log', icon: 'barbell-outline', activeIcon: 'barbell' },
  { href: '/(app)/belt', label: 'The Belt', match: 'belt', icon: 'ribbon-outline', activeIcon: 'ribbon' },
  { href: '/(app)/profile', label: 'Profile', match: 'profile', icon: 'person-outline', activeIcon: 'person' },
] as const

/** Reached from the header overflow on phone; inline in the top nav on desktop. */
export const SECONDARY_NAV: readonly NavDestination[] = [
  { href: '/(app)/callouts', label: 'Versus', match: 'callouts', icon: 'flash-outline', activeIcon: 'flash' },
  { href: '/(app)/circle', label: 'Your Corner', match: 'circle', icon: 'people-outline', activeIcon: 'people' },
  { href: '/(app)/share', label: 'Fuel', match: 'share', icon: 'restaurant-outline', activeIcon: 'restaurant' },
  { href: '/(app)/discover', label: 'Nearby', match: 'discover', icon: 'map-outline', activeIcon: 'map' },
] as const

/** Desktop top nav shows the lot; there is room and no central Log button. */
export const DESKTOP_NAV: readonly NavDestination[] = [
  PRIMARY_NAV[0], PRIMARY_NAV[2], SECONDARY_NAV[0], SECONDARY_NAV[1],
  PRIMARY_NAV[1], SECONDARY_NAV[2], SECONDARY_NAV[3],
] as const

/**
 * Whether a destination is the one currently showing. Main Event is the index
 * route, whose pathname is bare "/" — a substring test against "index" would
 * never match it, and a bare "/" test matches everything.
 */
export function isActive(destination: NavDestination, pathname: string): boolean {
  if (destination.match === 'index') return pathname === '/' || pathname === '/(app)'
  return pathname.includes(destination.match)
}
