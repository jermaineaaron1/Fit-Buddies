import { useWindowDimensions } from 'react-native'
import { breakpoints, space } from '../constants/theme'

export interface Breakpoint {
  width: number
  /** Top navigation replaces the bottom bar from here up. */
  isDesktop: boolean
  isWide: boolean
  /** Page gutter for this width — 16 on phone, 24/32 on desktop. */
  pageMargin: number
  /** Gap between major sections; desktop gets a little more air. */
  sectionGap: number
}

/**
 * The single source of responsive truth. Every screen reads from this rather
 * than testing `width >= 900` inline, so the breakpoint moves in one place and
 * the phone/desktop split never drifts between screens.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions()
  const isDesktop = width >= breakpoints.desktop
  const isWide = width >= breakpoints.wide
  return {
    width,
    isDesktop,
    isWide,
    pageMargin: isWide ? space.pageWide : isDesktop ? space.pageDesktop : space.page,
    sectionGap: isDesktop ? space.sectionWide : space.section,
  }
}
