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
  }
  last_message?: string
  unread?: boolean
  created_at: string
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadMatches = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

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
          .select('id, name, age, avatar_url, gender')
          .eq('id', otherId)
          .single()

        // 最新メッセージ
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, is_read, sender_id')
          .eq('match_id', m.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        enriched.push({
          id: m.id,
          other_user: profile || { id: otherId, name: '不明', age: 0, avatar_url: '', gender: '' },
          last_message: lastMsg?.content,
          unread: !!(lastMsg && !lastMsg.is_read && lastMsg.sender_id !== user.id),
          created_at: m.created_at,
        })
      }

      setMatches(enriched)
      setLoading(false)
    }
    loadMatches()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-pink-400 text-xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">💕 マッチング一覧</h1>

        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">💫</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">まだマッチングがありません</h2>
            <p className="text-gray-500 text-sm mb-6">「探す」でいいねを送ってみましょう！</p>
            <button
              onClick={() => router.push('/discover')}
              className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-6 py-3 rounded-full font-medium"
            >
              相手を探す
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map(match => (
              <button
                key={match.id}
                onClick={() => router.push(`/chat/${match.id}`)}
                className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition text-left"
              >
                {/* アバター */}
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-red-100 overflow-hidden">
                    {match.other_user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={match.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {match.other_user.gender === 'male' ? '👨' : match.other_user.gender === 'female' ? '👩' : '🧑'}
                      </div>
                    )}
                  </div>
                  {match.unread && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full border-2 border-white" />
                  )}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">
                      {match.other_user.name}
                      <span className="font-normal text-gray-500 ml-1 text-sm">{match.other_user.age}歳</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(match.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-sm truncate mt-1 ${match.unread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {match.last_message || 'メッセージを送ってみましょう 👋'}
                  </p>
                </div>

                <span className="text-gray-400 flex-shrink-0">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
