'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
  is_read: boolean
}

type Profile = {
  id: string
  name: string
  age: number
  avatar_url: string
  gender: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [myId, setMyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // マッチング情報取得
      const { data: match } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', matchId)
        .single()

      if (!match) { router.push('/matches'); return }

      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id

      // 相手のプロフィール
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, age, avatar_url, gender')
        .eq('id', otherId)
        .single()

      setOtherUser(profile)

      // メッセージ取得
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      // 既読にする
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('match_id', matchId)
        .neq('sender_id', user.id)

      setLoading(false)
    }
    init()

    // リアルタイム更新
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !myId || sending) return
    setSending(true)

    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: myId,
      content,
    })

    setSending(false)
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-pink-400 animate-pulse">読み込み中...</div>
      </div>
    )
  }

  // 日付ごとにメッセージをグループ化
  const groupedMessages: { date: string; msgs: Message[] }[] = []
  messages.forEach(msg => {
    const date = formatDate(msg.created_at)
    const last = groupedMessages[groupedMessages.length - 1]
    if (!last || last.date !== date) {
      groupedMessages.push({ date, msgs: [msg] })
    } else {
      last.msgs.push(msg)
    }
  })

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/matches')}
          className="text-gray-500 hover:text-gray-700 mr-1"
        >
          ←
        </button>

        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-red-100 overflow-hidden flex-shrink-0">
          {otherUser?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">
              {otherUser?.gender === 'male' ? '👨' : otherUser?.gender === 'female' ? '👩' : '🧑'}
            </div>
          )}
        </div>

        <div>
          <div className="font-semibold text-gray-800">{otherUser?.name}</div>
          <div className="text-xs text-gray-500">{otherUser?.age}歳</div>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-3">👋</div>
            <p className="text-gray-500 text-sm">最初のメッセージを送りましょう！</p>
          </div>
        ) : (
          groupedMessages.map(group => (
            <div key={group.date}>
              {/* 日付区切り */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 flex-shrink-0">{group.date}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {group.msgs.map(msg => {
                const isMe = msg.sender_id === myId
                return (
                  <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-red-100 overflow-hidden flex-shrink-0 mr-2 self-end">
                        {otherUser?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm">
                            {otherUser?.gender === 'male' ? '👨' : '👩'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        isMe
                          ? 'bg-gradient-to-br from-pink-400 to-red-400 text-white rounded-br-sm'
                          : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-gray-400 mt-1 px-1">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力欄 */}
      <form
        onSubmit={handleSend}
        className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="メッセージを入力..."
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-gradient-to-br from-pink-400 to-red-400 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition flex-shrink-0"
        >
          ↑
        </button>
      </form>
    </div>
  )
}
