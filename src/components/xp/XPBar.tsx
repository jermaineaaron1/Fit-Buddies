import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getXPToNextLevel, getLevelLabel } from '../../constants/xp'

interface XPBarProps {
  totalXP: number
  level: number
  weeklyXP: number
}

export function XPBar({ totalXP, level, weeklyXP }: XPBarProps) {
  const { current, next, progress } = getXPToNextLevel(totalXP)
  const label = getLevelLabel(level)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.levelLabel}>Level {level} · {label}</Text>
          <Text style={styles.weeklyXP}>{weeklyXP} XP this week</Text>
        </View>
        <Text style={styles.xpText}>{current} / {next}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  levelLabel: { color: '#F1F5F9', fontSize: 15, fontWeight: '700' },
  weeklyXP: { color: '#64748B', fontSize: 12, marginTop: 2 },
  xpText: { color: '#6366F1', fontSize: 13, fontWeight: '600' },
  track: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
})
