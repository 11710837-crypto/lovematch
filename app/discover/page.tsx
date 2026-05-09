'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

type Profile = {
  id: string
  name: string
  age: number
  gender: string
  bio: string
  location: string
  occupation: string
  avatar_url: string
}

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [showMatch, setShowMatch] = useState(false)
  const [likedCount, setLikedCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadProfiles = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // 自分のプロフィール取得
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('looking_for, gender')
        .eq('id', user.id)
        .single()

      if (!myProfile) { setLoading(false); return }

      // 既にいいねした相手のID取得
      const { data: likedData } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', user.id)
      const likedIds = likedData?.map(l => l.to_user_id) || []

      // 相手を探す（性別フィルター）
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .eq('is_profile_complete', true)

      if (myProfile.looking_for !== 'both') {
        query = query.eq('gender', myProfile.looking_for)
      }

      const { data } = await query.order('created_at', { ascending: false }).limit(50)

      // 既にいいねした人を除外
      const filtered = (data || []).filter(p => !likedIds.includes(p.id))
      setProfiles(filtered)
      setLoading(false)
    }
    loadProfiles()
  }, [])

  const handleLike = async () => {
    if (!profiles[currentIndex] || !myId) return
    const targetId = profiles[currentIndex].id

    const { error } = await supabase.from('likes').insert({
      from_user_id: myId,
      to_user_id: targetId,
    })

    if (!error) {
      // マッチングチェック
      const { data: matched } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${myId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${myId})`)
        .single()

      if (matched) {
        setShowMatch(true)
        setTimeout(() => setShowMatch(false), 3000)
      }
      setLikedCount(prev => prev + 1)
    }
    setCurrentIndex(prev => prev + 1)
  }

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-pink-400 text-xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  const currentProfile = profiles[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16">
      <Navbar />

      {/* マッチング通知 */}
      {showMatch && (
        <div className="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl mx-4 animate-bounce">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-pink-500 mb-2">マッチング！</h2>
            <p className="text-gray-600 mb-6">メッセージを送りましょう</p>
            <button
              onClick={() => { setShowMatch(false); router.push('/matches') }}
              className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-8 py-3 rounded-full font-semibold"
            >
              メッセージへ
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">
            💕 探す
          </h1>
          <span className="text-sm text-gray-500 bg-pink-50 px-3 py-1 rounded-full">
            ❤️ {likedCount} いいね
          </span>
        </div>

        {!currentProfile ? (
          /* 候補者なし */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">今は候補者がいません</h2>
            <p className="text-gray-500 text-sm mb-6">しばらくして再度チェックしてみてください</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-6 py-3 rounded-full font-medium"
            >
              再読み込み
            </button>
          </div>
        ) : (
          /* プロフィールカード */
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
              {/* 写真 */}
              <div className="relative h-80 bg-gradient-to-br from-pink-100 to-red-100">
                {currentProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentProfile.avatar_url}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    {currentProfile.gender === 'male' ? '👨' : currentProfile.gender === 'female' ? '👩' : '🧑'}
                  </div>
                )}
                {/* 残り枚数 */}
                <div className="absolute top-4 right-4 bg-black/30 text-white text-xs px-3 py-1 rounded-full">
                  残り {profiles.length - currentIndex} 人
                </div>
              </div>

              {/* 情報 */}
              <div className="p-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="text-2xl font-bold text-gray-800">{currentProfile.name}</h2>
                  <span className="text-xl font-semibold text-gray-500">{currentProfile.age}歳</span>
                </div>

                {(currentProfile.location || currentProfile.occupation) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentProfile.location && (
                      <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                        📍 {currentProfile.location}
                      </span>
                    )}
                    {currentProfile.occupation && (
                      <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                        💼 {currentProfile.occupation}
                      </span>
                    )}
                  </div>
                )}

                {currentProfile.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                    {currentProfile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* ボタン */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <button
                onClick={handleSkip}
                className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition border-2 border-gray-200 hover:border-gray-400"
                title="スキップ"
              >
                👎
              </button>
              <button
                onClick={handleLike}
                className="w-20 h-20 bg-gradient-to-br from-pink-400 to-red-400 rounded-full shadow-lg flex items-center justify-center text-3xl hover:scale-110 transition"
                title="いいね！"
              >
                ❤️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
