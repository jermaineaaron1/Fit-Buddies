import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
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
    <View style={[styles.container, isOwn && styles.containerOwn]}>
      {!isOwn && (
        <Text style={styles.sender}>{message.sender.display_name}</Text>
      )}
      <View style={[styles.bubble, isOwn && styles.bubbleOwn]}>
        <Text style={styles.content}>{message.content}</Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { maxWidth: '78%', gap: 3, alignSelf: 'flex-start' },
  containerOwn: { alignSelf: 'flex-end' },
  sender: { color: '#64748B', fontSize: 12, marginLeft: 4 },
  bubble: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  content: { color: '#F1F5F9', fontSize: 15, lineHeight: 22 },
  time: { color: '#475569', fontSize: 11, marginHorizontal: 4 },
})
