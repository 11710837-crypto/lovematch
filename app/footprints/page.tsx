'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

type Visitor = {
  id: string
  name: string
  age: number
  avatar_url: string
  gender: string
  location: string
  purpose: string
  visitedAt: string
}

export default function FootprintsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: fpData } = await supabase
        .from('footprints')
        .select('visitor_id, created_at')
        .eq('visited_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (!fpData) { setLoading(false); return }

      // 同じ訪問者は最新の1件だけ表示（deduplicate）
      const seenIds = new Set<string>()
      const uniqueVisits: { visitor_id: string; created_at: string }[] = []
      for (const fp of fpData) {
        if (!seenIds.has(fp.visitor_id)) {
          seenIds.add(fp.visitor_id)
          uniqueVisits.push(fp)
        }
      }

      // プロフィールを一括取得
      const enriched: Visitor[] = []
      for (const fp of uniqueVisits) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, age, avatar_url, gender, location, purpose')
          .eq('id', fp.visitor_id)
          .single()

        if (profile) {
          enriched.push({
            ...profile,
            visitedAt: fp.created_at,
          })
        }
      }

      setVisitors(enriched)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'たった今'
    if (mins < 60) return `${mins}分前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}時間前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}日前`
    return new Date(dateStr).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  }

  const purposeLabel: Record<string, string> = {
    marriage: '💍 結婚前提', serious: '❤️ 真剣交際',
    casual: '😊 気軽に', friend: '👫 友達から',
  }

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

        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">👣 足あと</h1>
          {visitors.length > 0 && (
            <span className="bg-pink-100 text-pink-600 text-sm font-semibold px-3 py-1 rounded-full">
              {visitors.length}人
            </span>
          )}
        </div>

        {visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">👣</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">まだ足あとがありません</h2>
            <p className="text-gray-500 text-sm mb-2">プロフィールを充実させると</p>
            <p className="text-gray-500 text-sm mb-6">もっと多くの人に見てもらえます！</p>
            <button
              onClick={() => router.push('/profile')}
              className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-6 py-3 rounded-full font-semibold shadow-md"
            >
              ✨ プロフィールを充実させる
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              あなたのプロフィールを見た人の一覧です
            </p>
            <div className="space-y-3">
              {visitors.map(v => (
                <div
                  key={v.id}
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 border border-gray-50 hover:shadow-md transition"
                >
                  {/* アバター */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-100 to-red-100 overflow-hidden flex-shrink-0">
                    {v.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={v.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">
                          {v.gender === 'male' ? '👨' : v.gender === 'female' ? '👩' : '🧑'}
                        </div>
                    }
                  </div>

                  {/* 情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-gray-800">
                        {v.name}
                        <span className="font-normal text-gray-500 ml-1 text-sm">{v.age}歳</span>
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{timeAgo(v.visitedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {v.location && (
                        <span className="text-xs text-gray-500">📍 {v.location}</span>
                      )}
                      {v.purpose && (
                        <span className="text-xs text-pink-500">{purposeLabel[v.purpose]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* プロフィール充実バナー */}
            <div className="mt-6 bg-gradient-to-r from-pink-50 to-red-50 rounded-2xl p-4 border border-pink-100">
              <p className="text-sm text-pink-600 font-medium text-center">
                ✨ 写真や趣味を追加してもっと見てもらいましょう！
              </p>
              <button
                onClick={() => router.push('/profile')}
                className="w-full mt-2 bg-gradient-to-r from-pink-400 to-red-400 text-white text-sm font-semibold py-2.5 rounded-xl shadow-md"
              >
                プロフィールを充実させる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
