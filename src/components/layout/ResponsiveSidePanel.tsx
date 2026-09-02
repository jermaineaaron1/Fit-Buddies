import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, layout, type } from '../../constants/theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AnimatedPressable } from '../ui/AnimatedPressable'

interface ResponsiveSidePanelProps {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  /** Panel width on desktop. Phone always uses full width. */
  desktopWidth?: number
}

const DURATION = 220

/**
 * One surface, two presentations: a bottom sheet on a phone, a right-side
 * panel from 900px up. The slide axis has to differ (a desktop panel that
 * flies up from the bottom of a 1440px display reads as a phone sheet stuck on
 * a desktop), so this drives its own transform rather than using Modal's
 * `animationType`, which only ever slides vertically.
 */
export function ResponsiveSidePanel({
  visible, onClose, title, subtitle, children, desktopWidth = 380,
}: ResponsiveSidePanelProps) {
  const { isDesktop } = useBreakpoint()
  const { height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(0)

  useEffect(() => {
    if (reduceMotion) { progress.value = visible ? 1 : 0; return }
    progress.value = withTiming(visible ? 1 : 0, { duration: DURATION, easing: Easing.out(Easing.cubic) })
  }, [visible, reduceMotion])

  // Travel is measured off the axis the panel actually enters from.
  const travel = isDesktop ? desktopWidth : Math.min(height * 0.9, 620)

  const panelStyle = useAnimatedStyle(() => ({
    transform: isDesktop
      ? [{ translateX: (1 - progress.value) * travel }]
      : [{ translateY: (1 - progress.value) * travel }],
  }))

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }))

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.root, isDesktop && styles.rootDesktop]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={`Close ${title}`} />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            isDesktop
              ? [styles.panelDesktop, { width: desktopWidth, paddingTop: insets.top }]
              : [styles.panelPhone, { maxHeight: height * 0.9 }],
            panelStyle,
          ]}
        >
          {!isDesktop && <View style={styles.grabber} />}
          <View style={styles.head}>
            <View style={styles.headCopy}>
              <Text style={styles.title} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <AnimatedPressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.close}
            >
              <Ionicons name="close" size={19} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={[styles.body, { paddingBottom: (isDesktop ? 24 : insets.bottom) + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  rootDesktop: { flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000000AA' },
  panel: { backgroundColor: colors.surface },
  panelPhone: { borderTopWidth: 2, borderTopColor: colors.gold },
  panelDesktop: { height: '100%', borderLeftWidth: 1, borderLeftColor: colors.border },
  grabber: { alignSelf: 'center', width: 36, height: 3, borderRadius: 2, backgroundColor: colors.borderLight, marginTop: 8 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headCopy: { flex: 1, gap: 2 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  subtitle: { color: colors.textMuted, fontSize: 11 },
  close: { width: layout.touch, height: layout.touch, alignItems: 'center', justifyContent: 'center' },
  bodyScroll: { flexGrow: 0 },
  body: { padding: 16, gap: 12 },
})
