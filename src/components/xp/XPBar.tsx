import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getXPToNextLevel, getLevelLabel } from '../../constants/xp'
import { colors } from '../../constants/theme'
import { ProgressBar } from '../ui/ProgressBar'

interface XPBarProps {
  totalXP: number
  level: number
  weeklyXP: number
}

export function XPBar({ totalXP, level, weeklyXP }: XPBarProps) {
  const { current, next, progress, isMax } = getXPToNextLevel(totalXP)
  const label = getLevelLabel(level)

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.level}>Level {level}  ·  {label}</Text>
          <Text style={styles.weekly}>{weeklyXP} XP this week</Text>
        </View>
        <View style={styles.xpPill}>
          <Text style={styles.xpText}>
            {current.toLocaleString()}
            {isMax ? <Text style={styles.xpMax}> XP</Text> : <Text style={styles.xpMax}> / {next.toLocaleString()}</Text>}
          </Text>
        </View>
      </View>
      <ProgressBar progress={Math.max(progress, 0.02)} color={colors.primary} trackColor={colors.surface} height={6} />
      <View style={styles.labels}>
        <Text style={styles.labelText}>{current.toLocaleString()} XP earned</Text>
        <Text style={styles.labelText}>
          {isMax ? 'Top level reached' : `${(next - current).toLocaleString()} XP to next level`}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  level: { color: colors.text, fontSize: 15, fontWeight: '700' },
  weekly: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  xpPill: {
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  xpText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  xpMax: { color: colors.textMuted, fontWeight: '400' },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  labelText: { color: colors.textMuted, fontSize: 11 },
})
