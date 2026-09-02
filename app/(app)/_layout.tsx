import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { AppHeader } from '../../src/components/ui/AppHeader'
import { BottomNavigation } from '../../src/components/ui/BottomNavigation'
import { QuickLogSheet } from '../../src/components/layout/QuickLogSheet'
import { LevelUpOverlay } from '../../src/components/ui/LevelUpOverlay'
import { useCircle } from '../../src/hooks/useCircle'
import { colors } from '../../src/constants/theme'

export default function AppLayout() {
  useCircle()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* One header for both form factors: 54px identity bar on a phone,
          64px full navigation from 900px up. */}
      <AppHeader />
      <Tabs
        tabBar={(props) => <BottomNavigation {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="belt" />
        <Tabs.Screen name="callouts" />
        <Tabs.Screen name="circle" />
        <Tabs.Screen name="share" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="log" />
        <Tabs.Screen name="motivate" options={{ href: null }} />
        <Tabs.Screen name="discover" options={{ href: null }} />
      </Tabs>
      {/* Bottom sheet on phone, right-side panel on desktop. Lives here so the
          bottom bar and the header can both open it. */}
      <QuickLogSheet />
      <LevelUpOverlay />
    </View>
  )
}
