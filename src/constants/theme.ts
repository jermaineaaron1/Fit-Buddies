import { Platform, type TextStyle, type ViewStyle } from 'react-native'

export const colors = {
  bg: '#0B0C0E',
  surface: '#111216',
  card: '#1B1C20',
  cardRaised: '#232429',
  border: '#3A3B41',
  borderLight: '#5B5C63',

  primary: '#D3202B',
  primaryDark: '#8F151D',
  primaryGlow: '#D3202B20',

  accent: '#F2C744',
  accentGlow: '#F2C74420',

  crimson: '#F14852',
  crimsonGlow: '#F1485220',

  warning: '#F2C744',
  danger: '#F14852',

  gold: '#F2C744',
  goldLight: '#FFF0A3',
  goldDark: '#756126',
  steel: '#8E9098',
  steelDark: '#2A2B30',
  cornerBlue: '#4C9CFF',

  text: '#F6F0DF',
  textSecondary: '#C7C3B8',
  textMuted: '#929197',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const radius = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  full: 999,
}

export const font = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const

export const type = {
  display: Platform.select({
    ios: 'AvenirNextCondensed-DemiBold',
    android: 'sans-serif-condensed',
    web: 'Arial Narrow',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'Arial',
    default: 'System',
  }),
} as const

// The house selector tab: a sheared plate, like a fighting-game character
// select. The label is counter-skewed so only the plate leans — skewing the
// text too would hurt legibility at these sizes.
//
// Screens spread these and add their own `backgroundColor` to `active`, since
// the accent differs by context (red for combat, gold for fuel/nutrition).
export const combatChip: {
  base: ViewStyle
  active: ViewStyle
  text: TextStyle
  textActive: TextStyle
} = {
  base: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.steelDark,
    transform: [{ skewX: '-9deg' }],
  },
  active: {
    borderColor: colors.gold,
    borderLeftColor: colors.gold,
    // Selection has to read instantly across a dim screen.
    shadowColor: colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  text: {
    color: colors.textSecondary,
    fontFamily: type.display,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    transform: [{ skewX: '9deg' }],
  },
  textActive: { color: '#fff' },
}

// Championship-poster label treatment: small, bold, uppercase, spaced out.
export const eyebrow = {
  fontFamily: type.display,
  fontSize: 12,
  fontWeight: font.bold,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
} as const

// ---- Layout ------------------------------------------------------------
// One component tree serves phone and desktop; these are the only widths that
// change behaviour. `desktop` is where the bottom nav gives way to top nav.
export const breakpoints = {
  desktop: 900,
  wide: 1280,
} as const

// Compact-application spacing. Tight enough that a phone screen shows real
// information rather than three promotional panels.
export const space = {
  /** Between closely related controls inside one card. */
  tight: 8,
  /** Between sibling cards. */
  card: 12,
  /** Between major page sections. */
  section: 20,
  sectionWide: 24,
  /** Page gutters. */
  page: 16,
  pageDesktop: 24,
  pageWide: 32,
} as const

export const layout = {
  /** Content column cap — cards stop stretching past this on wide displays. */
  maxContent: 1180,
  /** Narrower cap for form-first screens, where full width hurts scanning. */
  maxForm: 720,
  headerPhone: 54,
  headerDesktop: 64,
  /** Minimum square for anything tappable, per accessible-target guidance. */
  touch: 44,
} as const
