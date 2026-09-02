import React from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radius } from '../../constants/theme'

const MAP_URL = 'https://www.openstreetmap.org/export/embed.html?bbox=101.676%2C3.139%2C101.722%2C3.175&layer=mapnik&marker=3.1579%2C101.7123'

export function NearbyMap() {
  return <View style={styles.frame}>{React.createElement('iframe' as any, { src: MAP_URL, title: 'Nearby walks and gyms map', style: { width: '100%', height: '100%', border: 0 }, loading: 'lazy' })}</View>
}

const styles = StyleSheet.create({ frame: { height: 340, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.md, backgroundColor: colors.card } })
