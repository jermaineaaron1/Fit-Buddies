import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AnimatedScreen } from '../../src/components/ui/AnimatedScreen'
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable'
import { NearbyMap } from '../../src/components/discovery/NearbyMap'
import { colors, radius, type } from '../../src/constants/theme'


const PLACES = [
  { kind: 'Walk · 1.3 km loop', name: 'KLCC Park', detail: 'Lit paths, water stations, and an easy crew-friendly loop.', icon: 'footsteps-outline', query: 'KLCC Park Kuala Lumpur' },
  { kind: 'Walk · shaded trails', name: 'Perdana Botanical Gardens', detail: 'A relaxed recovery route with plenty of shade and space.', icon: 'leaf-outline', query: 'Perdana Botanical Gardens Kuala Lumpur' },
  { kind: 'Trail · hill round', name: 'Bukit Gasing', detail: 'A tougher green route when your crew wants a real challenge.', icon: 'trail-sign-outline', query: 'Bukit Gasing Hiking Trail' },
  { kind: 'Training · nearby', name: 'Gyms Near Your Corner', detail: 'Compare local gyms, hours, reviews, and directions on your map.', icon: 'barbell-outline', query: 'gyms near me' },
] as const

function openPlace(query: string) {
  return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`)
}

export default function DiscoverScreen() {
  const { width } = useWindowDimensions()
  const desktop = width >= 850
  return <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

    <View style={[styles.split, !desktop && styles.stack]}>
      <AnimatedScreen delay={100} style={styles.mapColumn}>
        <View style={styles.sectionTitle}><View><Text style={styles.eyebrow}>LIVE AREA VIEW</Text><Text style={styles.title}>Your Arena</Text></View><View style={styles.mapBadge}><Ionicons name="location" size={14} color={colors.gold} /><Text style={styles.mapBadgeText}>KL</Text></View></View>
        <NearbyMap />
        <Text style={styles.mapNote}>The map is an area preview. Open a place card for live directions, hours, and route details.</Text>
      </AnimatedScreen>

      <View style={styles.placeColumn}>
        <AnimatedScreen delay={140}><Text style={styles.eyebrow}>WALKS · PARKS · GYMS</Text><Text style={styles.title}>Pick a Mission</Text></AnimatedScreen>
        {PLACES.map((place, index) => <AnimatedScreen key={place.name} delay={180 + index * 55}>
          <AnimatedPressable style={styles.place} onPress={() => openPlace(place.query)}>
            <View style={styles.placeIcon}><Ionicons name={place.icon as any} size={21} color={colors.gold} /></View>
            <View style={styles.placeCopy}><Text style={styles.kind}>{place.kind}</Text><Text style={styles.placeName}>{place.name}</Text><Text style={styles.detail}>{place.detail}</Text></View>
            <View style={styles.go}><Ionicons name="navigate" size={17} color={colors.bg} /></View>
          </AnimatedPressable>
        </AnimatedScreen>)}
      </View>
    </View>
  </ScrollView>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { width: '100%', maxWidth: 1160, alignSelf: 'center', padding: 20, paddingTop: 14, paddingBottom: 96, gap: 22 },
  split: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  stack: { flexDirection: 'column' },
  mapColumn: { flex: 1.15, gap: 10, width: '100%' },
  placeColumn: { flex: .85, gap: 10, width: '100%' },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontFamily: type.display, fontSize: 27, fontWeight: '900', textTransform: 'uppercase' },
  mapBadge: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.card },
  mapBadgeText: { color: colors.gold, fontWeight: '900', fontSize: 10 },
  mapNote: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  place: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: colors.card },
  placeIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.goldDark, backgroundColor: colors.accentGlow },
  placeCopy: { flex: 1, gap: 2 },
  kind: { color: colors.primary, fontFamily: type.display, fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  placeName: { color: colors.text, fontFamily: type.display, fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  detail: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  go: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold },
})
