import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { useCircleStore } from '../../../src/store/circleStore'
import { useAuthStore } from '../../../src/store/authStore'
import { useChat } from '../../../src/hooks/useChat'
import { useXP } from '../../../src/hooks/useXP'
import { ChatBubble } from '../../../src/components/chat/ChatBubble'

export default function ChatScreen() {
  const { circle } = useCircleStore()
  const { profile } = useAuthStore()
  const { messages, loading, sendMessage } = useChat(circle?.id ?? null)
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
        <Text style={styles.headerTitle}>💬 {circle.name}</Text>
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
          placeholderTextColor="#475569"
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.sendDisabled]} onPress={handleSend} disabled={!text.trim()}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  headerTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700' },
  messageList: { padding: 16, gap: 12, flexDirection: 'column' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#F1F5F9',
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 16 },
  empty: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748B', fontSize: 15 },
  emptyChat: { alignItems: 'center', paddingTop: 40 },
  emptyChatText: { color: '#475569', fontSize: 14 },
})
