import React from 'react'
import { ScrollView, View, StyleSheet, RefreshControl, type StyleProp, type ViewStyle } from 'react-native'
import { colors, layout } from '../../constants/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'

interface PageContainerProps {
  children: React.ReactNode
  /** Narrower cap for form-first screens, where full width hurts scanning. */
  width?: 'content' | 'form'
  onRefresh?: () => void
  refreshing?: boolean
  /** Turn off when the page manages its own scrolling (a FlatList, say). */
  scroll?: boolean
  contentStyle?: StyleProp<ViewStyle>
}

/**
 * Every page's outer shell. Owns the gutters (16 phone / 24–32 desktop), the
 * max content width, and the bottom padding that keeps the last card clear of
 * the bottom bar. Centring within a cap is what stops desktop cards from
 * stretching to 1900px and turning a dense row into a sparse one.
 */
export function PageContainer({
  children, width = 'content', onRefresh, refreshing = false, scroll = true, contentStyle,
}: PageContainerProps) {
  const { pageMargin, isDesktop, sectionGap } = useBreakpoint()

  const inner: StyleProp<ViewStyle> = [
    styles.inner,
    {
      maxWidth: width === 'form' ? layout.maxForm : layout.maxContent,
      paddingHorizontal: pageMargin,
      paddingTop: isDesktop ? sectionGap : 14,
      // Room for the bottom bar on phone; desktop has none.
      paddingBottom: isDesktop ? 48 : 96,
      gap: sectionGap,
    },
    contentStyle,
  ]

  if (!scroll) return <View style={[styles.screen, styles.centred]}><View style={inner}>{children}</View></View>

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh
          ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          : undefined
      }
    >
      <View style={inner}>{children}</View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { alignItems: 'center' },
  centred: { alignItems: 'center' },
  inner: { width: '100%' },
})
