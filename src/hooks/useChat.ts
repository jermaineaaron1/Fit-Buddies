import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessageWithSender } from '../types/app'
import type { Database } from '../types/database'

export type ChatScope = { circleId: string } | { calloutId: string }

function scopeColumn(scope: ChatScope): 'circle_id' | 'callout_id' {
  return 'circleId' in scope ? 'circle_id' : 'callout_id'
}

function scopeValue(scope: ChatScope): string {
  return 'circleId' in scope ? scope.circleId : scope.calloutId
}

export function useChat(scope: ChatScope | null) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const column = scope ? scopeColumn(scope) : null
  const value = scope ? scopeValue(scope) : null

  useEffect(() => {
    if (!column || !value) return

    fetchMessages()
    subscribeToMessages()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [column, value])

  async function fetchMessages() {
    if (!column || !value) return
    setLoading(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles(display_name, avatar_url)')
      .eq(column, value)
      .order('created_at', { ascending: false })
      .limit(50)

    setMessages((data as unknown as ChatMessageWithSender[]) ?? [])
    setLoading(false)
  }

  function subscribeToMessages() {
    if (!column || !value) return
    channelRef.current = supabase
      .channel(`chat:${column}:${value}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `${column}=eq.${value}`,
        },
        async (payload) => {
          // Fetch sender info for new message
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single()

          const newMessage = {
            ...payload.new,
            sender: sender ?? { display_name: 'Unknown', avatar_url: null },
          } as ChatMessageWithSender

          setMessages((prev) => [newMessage, ...prev])
        }
      )
      .subscribe()
  }

  async function sendMessage(content: string, senderId: string) {
    if (!column || !value || !content.trim()) return

    const messageInsert: Database['public']['Tables']['chat_messages']['Insert'] = column === 'circle_id'
      ? { circle_id: value, sender_id: senderId, content: content.trim() }
      : { callout_id: value, sender_id: senderId, content: content.trim() }

    // Insert and prepend locally rather than waiting on the realtime echo —
    // works even when the project's Realtime publication isn't configured
    // for this table, and gives the sender instant feedback either way.
    const { data } = await supabase
      .from('chat_messages')
      .insert(messageInsert)
      .select('*, sender:profiles(display_name, avatar_url)')
      .single()

    if (data) {
      const newMessage = data as unknown as ChatMessageWithSender
      setMessages((prev) => (prev.some((m) => m.id === newMessage.id) ? prev : [newMessage, ...prev]))
    }
  }

  return { messages, loading, sendMessage, refetch: fetchMessages }
}
