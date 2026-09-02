import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, type } from '../../constants/theme'
import { CompactCard } from '../ui/CompactCard'
import { Chip } from '../ui/Chip'
import { getFormatInfo, type CalloutFormat } from '../../lib/callouts'
import type { UpcomingMatch } from '../../lib/circleSnapshot'

interface UpcomingMatchCardProps {
  match: UpcomingMatch
  onPress?: () => void
}

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatWhen(iso: string): { when: string; countdown: string; live: boolean } {
  const start = new Date(iso)
  const diffMs = start.getTime() - Date.now()
  const days = Math.ceil(diffMs / 86400000)
  const hours = Math.round(diffMs / 3600000)

  const time = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const when = `${DAY[start.getDay()]}, ${MONTH[start.getMonth()]} ${start.getDate()} · ${time}`

  if (diffMs <= 0) return { when, countdown: 'Live now', live: true }
  if (hours < 24) return { when, countdown: hours <= 1 ? 'Within the hour' : `${hours} hrs`, live: false }
  return { when, countdown: days === 1 ? 'Tomorrow' : `${days} days`, live: false }
}

/** The next scheduled title match: who, when, and how long until the bell. */
export function UpcomingMatchCard({ match, onPress }: UpcomingMatchCardProps) {
  const { when, countdown, live } = formatWhen(match.startTime)
  const info = getFormatInfo(match.format as CalloutFormat)
  const opponents = match.opponentNames.length ? match.opponentNames.join(' · ') : 'Open field'

  return (
    <CompactCard accent="red" onPress={onPress} accessibilityLabel={`Next title match, ${match.issuerName} versus ${opponents}, ${when}`}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>NEXT TITLE MATCH</Text>
        <Chip label={countdown} tone={live ? 'primary' : 'gold'} icon={live ? 'radio' : 'time-outline'} />
      </View>

      <View style={styles.bout}>
        <Text style={styles.fighter} numberOfLines={1}>{match.issuerName}</Text>
        <Text style={styles.versus}>vs</Text>
        <Text style={styles.fighter} numberOfLines={1}>{opponents}</Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
        <Text style={styles.meta} numberOfLines={1}>{when}</Text>
      </View>
      <Text style={styles.format} numberOfLines={1}>
        {info.label} · {match.activityType}
        {match.stakes ? ` · ${match.stakes}` : ''}
      </Text>
    </CompactCard>
  )
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrow: { color: colors.primary, fontFamily: type.display, fontSize: 9.5, fontWeight: '900', letterSpacing: 1.3 },
  bout: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 6, flexWrap: 'wrap' },
  fighter: { flexShrink: 1, color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '900', textTransform: 'uppercase' },
  versus: { color: colors.textMuted, fontFamily: type.display, fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  meta: { color: colors.textSecondary, fontSize: 11.5, flexShrink: 1 },
  format: { color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
})
