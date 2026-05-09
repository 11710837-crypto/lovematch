'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

type Match = {
  id: string
  other_user: {
    id: string
    name: string
    age: number
    avatar_url: string
    gender: string
    purpose: string
  }
  last_message?: string
  last_message_time?: string
  unread?: boolean
  created_at: string
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadMatches = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: matchData } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchData) { setLoading(false); return }

      const enriched: Match[] = []
      for (const m of matchData) {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, age, avatar_url, gender, purpose')
          .eq('id', otherId)
          .single()

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, is_read, sender_id, created_at')
          .eq('match_id', m.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        enriched.push({
          id: m.id,
          other_user: profile || { id: otherId, name: '不明', age: 0, avatar_url: '', gender: '', purpose: '' },
          last_message: lastMsg?.content,
          last_message_time: lastMsg?.created_at,
          unread: !!(lastMsg && !lastMsg.is_read && lastMsg.sender_id !== user.id),
          created_at: m.created_at,
        })
      }

      // 最新メッセージ順に並べ替え
      enriched.sort((a, b) => {
        const aTime = a.last_message_time || a.created_at
        const bTime = b.last_message_time || b.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

      setMatches(enriched)
      setLoading(false)
    }
    loadMatches()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / 60000)}分前`
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return d.toLocaleDateString('ja-JP', { weekday: 'short' })
    }
    return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  const purposeLabel: Record<string, string> = {
    marriage: '💍', serious: '❤️', casual: '😊', friend: '👫',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-pink-400 text-xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  const unreadCount = matches.filter(m => m.unread).length

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">💬 トーク</h1>
          {unreadCount > 0 && (
            <span className="bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unreadCount}件未読
            </span>
          )}
        </div>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">💫</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">まだマッチングがありません</h2>
            <p className="text-gray-500 text-sm mb-2">「探す」でいいねを送って</p>
            <p className="text-gray-500 text-sm mb-6">マッチングを待ちましょう！</p>
            <button
              onClick={() => router.push('/discover')}
              className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-8 py-3 rounded-full font-semibold shadow-md"
            >
              💕 相手を探す
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map(match => (
              <button
                key={match.id}
                onClick={() => router.push(`/chat/${match.id}`)}
                className={`w-full bg-white rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition text-left ${
                  match.unread ? 'shadow-sm border-l-4 border-pink-400' : 'shadow-sm'
                }`}
              >
                {/* アバター */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-red-100 overflow-hidden">
                    {match.other_user.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={match.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">
                          {match.other_user.gender === 'male' ? '👨' : match.other_user.gender === 'female' ? '👩' : '🧑'}
                        </div>
                    }
                  </div>
                  {match.unread && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${match.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                        {match.other_user.name}
                      </span>
                      <span className="text-gray-400 text-sm">{match.other_user.age}歳</span>
                      {match.other_user.purpose && (
                        <span className="text-sm">{purposeLabel[match.other_user.purpose]}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatTime(match.last_message_time || match.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${
                    match.unread ? 'text-gray-800 font-semibold' : 'text-gray-500'
                  }`}>
                    {match.last_message || '✨ マッチしました！メッセージを送ろう'}
                  </p>
                </div>

                <span className="text-gray-300 flex-shrink-0 text-lg">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
