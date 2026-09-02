import React, { useState, useCallback, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { useAuthStore } from '../../../src/store/authStore'
import { useChat } from '../../../src/hooks/useChat'
import { supabase } from '../../../src/lib/supabase'
import { colors, radius, type } from '../../../src/constants/theme'
import { getFormatInfo } from '../../../src/lib/callouts'
import { notifyCircle } from '../../../src/lib/push'
import { ChatBubble } from '../../../src/components/chat/ChatBubble'
import { ChampionshipBelt } from '../../../src/components/ui/ChampionshipBelt'
import { VersusCard } from '../../../src/components/ui/VersusCard'
import type { CalloutWithDetails } from '../../../src/types/app'

export default function MatchRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useAuthStore()
  const { messages, loading: chatLoading, sendMessage } = useChat(id ? { calloutId: id } : null)

  const [callout, setCallout] = useState<CalloutWithDetails | null>(null)
  const [text, setText] = useState('')
  // Accepting used to fail silently — Alert.alert is a no-op on web, so this
  // renders inline instead.
  const [actionError, setActionError] = useState<string | null>(null)
  const listRef = useRef<FlatList>(null)

  useFocusEffect(useCallback(() => { load() }, [id]))

  async function load() {
    if (!id || !profile?.id) return
    const { data } = await supabase
      .from('callouts')
      .select('*, issuer:profiles!callouts_issuer_id_fkey(display_name, avatar_url, avatar_source, ai_avatar_url), callout_participants(*, profile:profiles(display_name, avatar_url, avatar_source, ai_avatar_url))')
      .eq('id', id)
      .single()

    if (data) {
      // Register as a spectator first so the count below includes this view.
      await supabase.from('callout_spectators').upsert(
        { callout_id: id, user_id: profile.id },
        { onConflict: 'callout_id,user_id', ignoreDuplicates: true }
      )

      const { count } = await supabase
        .from('callout_spectators')
        .select('*', { count: 'exact', head: true })
        .eq('callout_id', id)

      setCallout({
        ...(data as any),
        issuer: (data as any).issuer,
        participants: (data as any).callout_participants ?? [],
        spectator_count: count ?? 0,
      })
    }
  }

  async function respond(status: 'accepted' | 'declined') {
    if (!id || !profile?.id) return
    const { error } = await supabase
      .from('callout_participants')
      .update({ status })
      .eq('callout_id', id)
      .eq('user_id', profile.id)
    if (error) {
      setActionError(error.message)
      return
    }
    setActionError(null)
    // Only an acceptance is news worth pushing; a decline is handled quietly.
    if (status === 'accepted') notifyCircle({ event: 'callout_accepted', calloutId: String(id) })
    load()
  }

  async function handleSend() {
    if (!text.trim() || !profile?.id) return
    const content = text.trim()
    setText('')
    await sendMessage(content, profile.id)
  }

  if (!callout) return null

  const formatInfo = getFormatInfo(callout.format as any)
  const myParticipation = callout.participants.find(p => p.user_id === profile?.id)
  const needsResponse = myParticipation?.status === 'invited'

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerFormat}>{formatInfo.label.toUpperCase()}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{callout.issuer.display_name}'s {callout.activity_type} callout</Text>
        </View>
        <View style={styles.watchingPill}>
          <Ionicons name="eye" size={12} color={colors.textSecondary} />
          <Text style={styles.watchingText}>{callout.spectator_count}</Text>
        </View>
      </View>

      <View style={styles.matchHero}>
        <ChampionshipBelt size={40} />
        <VersusCard
          participants={callout.participants.map(p => ({
            user_id: p.user_id,
            display_name: p.profile.display_name,
            status: p.status,
            avatar_url: p.profile.avatar_source === 'ai' ? (p.profile.ai_avatar_url ?? p.profile.avatar_url) : p.profile.avatar_url,
          }))}
        />
        {callout.stakes && (
          <View style={styles.stakesBanner}>
            <Ionicons name="flame" size={13} color={colors.crimson} />
            <Text style={styles.stakesBannerText}>{callout.stakes}</Text>
          </View>
        )}
      </View>

      <Text style={styles.statusLabel}>CONTENDER STATUS</Text>
      <View style={styles.participantsRow}>
        {callout.participants.map(p => (
          <View key={p.user_id} style={styles.participantChip}>
            <View style={[styles.participantAvatar, p.status === 'accepted' && styles.participantAvatarAccepted]}>
              {p.profile.avatar_url ? <Image source={{ uri: p.profile.avatar_source === 'ai' ? (p.profile.ai_avatar_url ?? p.profile.avatar_url) : p.profile.avatar_url }} style={styles.participantAvatarImage} contentFit="cover" /> : <Text style={styles.participantAvatarText}>{p.profile.display_name.charAt(0).toUpperCase()}</Text>}
            </View>
            <Text style={styles.participantChipName} numberOfLines={1}>{p.profile.display_name}</Text>
            <Text style={styles.participantChipStatus}>{p.status}</Text>
          </View>
        ))}
      </View>

      {needsResponse && (
        <View style={styles.respondRow}>
          <Text style={styles.respondText}>You've been called out. Accept the match?</Text>
          <View style={styles.respondBtns}>
            <TouchableOpacity style={styles.declineBtn} onPress={() => respond('declined')}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => respond('accepted')}>
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
          {actionError && <Text style={styles.actionError}>Could not respond: {actionError}</Text>}
        </View>
      )}

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
          chatLoading ? null : (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>The Match Room is open. Talk trash or hype your crew.</Text>
            </View>
          )
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Send a message..."
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
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  headerFormat: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { color: colors.text, fontFamily: type.display, fontSize: 17, fontWeight: '700', marginTop: 1, textTransform: 'uppercase' },
  watchingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  watchingText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },

  matchHero: {
    alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  stakesBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.crimsonGlow, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.crimson + '30',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  stakesBannerText: { color: colors.crimson, fontSize: 12, fontWeight: '700' },

  statusLabel: {
    color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 12,
  },
  participantsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  participantChip: { alignItems: 'center', gap: 2, width: 64 },
  participantAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  participantAvatarAccepted: { backgroundColor: colors.primary },
  participantAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  participantAvatarImage: { width: '100%', height: '100%' },
  participantChipName: { color: colors.text, fontSize: 10, fontWeight: '600' },
  participantChipStatus: { color: colors.textMuted, fontSize: 9 },

  respondRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primaryGlow, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.primary + '30',
  },
  respondText: { color: colors.text, fontSize: 12, fontWeight: '600', flex: 1 },
  actionError: { color: colors.danger, fontSize: 12, marginTop: 8 },
  respondBtns: { flexDirection: 'row', gap: 8 },
  declineBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  declineBtnText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.sm, backgroundColor: colors.primary },
  acceptBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  messageList: { padding: 16, gap: 12, flexDirection: 'column' },
  emptyChat: { alignItems: 'center', paddingTop: 14, paddingHorizontal: 30 },
  emptyChatText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 12,
  },
  input: {
    flex: 1, backgroundColor: colors.card, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 15,
    maxHeight: 100, borderWidth: 1, borderColor: colors.border,
  },
  sendButton: { backgroundColor: colors.primary, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
})
