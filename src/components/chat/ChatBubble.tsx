import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, radius } from '../../constants/theme'
import type { ChatMessageWithSender } from '../../types/app'

interface ChatBubbleProps {
  message: ChatMessageWithSender
  isOwn: boolean
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <View style={[styles.wrapper, isOwn && styles.wrapperOwn]}>
      {!isOwn && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{message.sender.display_name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.body}>
        {!isOwn && <Text style={styles.sender}>{message.sender.display_name}</Text>}
        <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
          <Text style={[styles.content, isOwn && styles.contentOwn]}>{message.content}</Text>
        </View>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{time}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 8, maxWidth: '80%', alignSelf: 'flex-start' },
  wrapperOwn: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  avatarText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  body: { gap: 3, flex: 1 },
  sender: { color: colors.textMuted, fontSize: 11, marginLeft: 2 },
  bubble: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    borderColor: 'transparent',
  },
  content: { color: colors.text, fontSize: 14, lineHeight: 20 },
  contentOwn: { color: '#fff' },
  time: { color: colors.textMuted, fontSize: 10, marginLeft: 4 },
  timeOwn: { textAlign: 'right', marginRight: 4 },
})
