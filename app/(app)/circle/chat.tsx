import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { useCircleStore } from '../../../src/store/circleStore'
import { useAuthStore } from '../../../src/store/authStore'
import { useChat } from '../../../src/hooks/useChat'
import { Ionicons } from '@expo/vector-icons'
import { useXP } from '../../../src/hooks/useXP'
import { ChatBubble } from '../../../src/components/chat/ChatBubble'
import { completeQuestByType } from '../../../src/lib/completeQuest'
import { colors, type } from '../../../src/constants/theme'

export default function ChatScreen() {
  const { circle } = useCircleStore()
  const { profile } = useAuthStore()
  const { messages, loading, sendMessage } = useChat(circle?.id ? { circleId: circle.id } : null)
  const { earn } = useXP()
  const [text, setText] = useState('')
  const listRef = useRef<FlatList>(null)
  const chatXPCountRef = useRef(0)

  async function handleSend() {
    if (!text.trim() || !profile?.id) return
    const content = text.trim()
    setText('')

    await sendMessage(content, profile.id)

    // XP capped at 5 chat messages per day
    if (chatXPCountRef.current < 5) {
      await earn('chat', undefined, 'Chat message')
      chatXPCountRef.current += 1
    }
    // Complete the chat quest on first message of the day
    if (chatXPCountRef.current === 1 && profile.id && circle?.id) {
      await completeQuestByType('chat', profile.id, circle.id, earn)
    }
  }

  if (!circle) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Join a circle to access group chat.</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
        <Text style={styles.headerTitle}>{circle.name}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} isOwn={item.sender_id === profile?.id} />
        )}
        inverted
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation.</Text>
            </View>
          )
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Encourage your crew..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.sendDisabled]} onPress={handleSend} disabled={!text.trim()}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontFamily: type.display, fontSize: 20, fontWeight: '700', textTransform: 'uppercase' },
  messageList: { padding: 16, gap: 12, flexDirection: 'column' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  empty: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 15 },
  emptyChat: { alignItems: 'center', paddingTop: 14 },
  emptyChatText: { color: colors.textMuted, fontSize: 14 },
})
