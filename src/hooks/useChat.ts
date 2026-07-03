import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ChatMessageWithSender } from '../types/app'

export function useChat(circleId: string | null) {
  const [messages, setMessages] = useState<ChatMessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!circleId) return

    fetchMessages()
    subscribeToMessages()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [circleId])

  async function fetchMessages() {
    setLoading(true)
    const { data } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles(display_name, avatar_url)')
      .eq('circle_id', circleId!)
      .order('created_at', { ascending: false })
      .limit(50)

    setMessages((data as unknown as ChatMessageWithSender[]) ?? [])
    setLoading(false)
  }

  function subscribeToMessages() {
    channelRef.current = supabase
      .channel(`chat:${circleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `circle_id=eq.${circleId}`,
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
    if (!circleId || !content.trim()) return

    await supabase.from('chat_messages').insert({
      circle_id: circleId,
      sender_id: senderId,
      content: content.trim(),
    })
  }

  return { messages, loading, sendMessage, refetch: fetchMessages }
}
