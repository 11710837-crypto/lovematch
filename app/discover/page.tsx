'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  height: number
  body_type: string
  education: string
  income: string
  smoking: string
  drinking: string
  purpose: string
  hobbies: string[]
}

const purposeLabel: Record<string, string> = {
  marriage: '💍 結婚を前提に', serious: '❤️ 真剣な交際',
  casual: '😊 気軽に出会い', friend: '👫 友達から',
}
const educationLabel: Record<string, string> = {
  high_school: '高校卒', vocational: '専門学校卒', junior_college: '短大卒',
  university: '大学卒', graduate: '大学院卒', other: 'その他',
}
const incomeLabel: Record<string, string> = {
  under300: '300万円未満', '300to500': '300〜500万円', '500to700': '500〜700万円',
  '700to1000': '700〜1000万円', over1000: '1000万円以上', secret: '非公開',
}
const bodyTypeLabel: Record<string, string> = {
  slim: 'スリム', normal: '普通', muscular: 'マッチョ', chubby: 'ぽっちゃり', curvy: 'グラマー',
}
const smokingLabel: Record<string, string> = {
  no: '🚭 吸わない', occasionally: '🚬 時々吸う', yes: '🚬 吸う', quit: '✅ 禁煙中',
}
const drinkingLabel: Record<string, string> = {
  no: '🙅 飲まない', occasionally: '🍺 時々飲む', yes: '🍶 よく飲む',
}

const LOCATIONS = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜',
  '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫',
  '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎',
  '熊本', '大分', '宮崎', '鹿児島', '沖縄',
]

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [myId, setMyId] = useState('')
  const [showMatch, setShowMatch] = useState(false)
  const [matchedUser, setMatchedUser] = useState<Profile | null>(null)
  const [likedCount, setLikedCount] = useState(0)
  const [showDetail, setShowDetail] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  // フィルター
  const [ageMin, setAgeMin] = useState(18)
  const [ageMax, setAgeMax] = useState(50)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterPurpose, setFilterPurpose] = useState('')

  // スワイプ
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const [swipeDir, setSwipeDir] = useState<'like' | 'nope' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // ブロック/通報
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const loadProfiles = useCallback(async (filters?: {
    ageMin?: number; ageMax?: number; location?: string; purpose?: string
  }) => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setMyId(user.id)

    const { data: myProfile } = await supabase
      .from('profiles').select('looking_for, gender').eq('id', user.id).single()
    if (!myProfile) { setLoading(false); return }

    const [{ data: likedData }, { data: blockedData }] = await Promise.all([
      supabase.from('likes').select('to_user_id').eq('from_user_id', user.id),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id).catch(() => ({ data: [] })),
    ])

    const excludeIds = [
      ...(likedData?.map((l: { to_user_id: string }) => l.to_user_id) || []),
      ...((blockedData as { blocked_id: string }[] | null)?.map(b => b.blocked_id) || []),
    ]

    const minAge = filters?.ageMin ?? ageMin
    const maxAge = filters?.ageMax ?? ageMax
    const loc = filters?.location !== undefined ? filters.location : filterLocation
    const purp = filters?.purpose !== undefined ? filters.purpose : filterPurpose

    let query = supabase
      .from('profiles').select('*')
      .neq('id', user.id)
      .eq('is_profile_complete', true)
      .gte('age', minAge)
      .lte('age', maxAge)

    if (myProfile.looking_for !== 'both') {
      query = query.eq('gender', myProfile.looking_for)
    }
    if (loc) query = query.eq('location', loc)
    if (purp) query = query.eq('purpose', purp)

    const { data } = await query.order('last_active', { ascending: false }).limit(50)
    const filtered = (data || []).filter((p: Profile) => !excludeIds.includes(p.id))

    setProfiles(filtered)
    setCurrentIndex(0)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageMin, ageMax, filterLocation, filterPurpose])

  useEffect(() => {
    loadProfiles()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 足あとを記録
  useEffect(() => {
    const recordFootprint = async () => {
      if (!myId || !profiles[currentIndex]) return
      await supabase.from('footprints').insert({
        visitor_id: myId,
        visited_id: profiles[currentIndex].id,
      }).catch(() => {})
    }
    recordFootprint()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, myId])

  const handleLike = useCallback(async () => {
    if (!profiles[currentIndex] || !myId || isAnimating) return
    const target = profiles[currentIndex]
    setIsAnimating(true)
    setSwipeDir('like')

    setTimeout(async () => {
      const { error } = await supabase.from('likes').insert({
        from_user_id: myId,
        to_user_id: target.id,
      })
      if (!error) {
        const { data: matched } = await supabase
          .from('matches').select('id')
          .or(`and(user1_id.eq.${myId},user2_id.eq.${target.id}),and(user1_id.eq.${target.id},user2_id.eq.${myId})`)
          .single()
        if (matched) {
          setMatchedUser(target)
          setShowMatch(true)
        }
        setLikedCount(p => p + 1)
      }
      setCurrentIndex(p => p + 1)
      setDragX(0); setDragY(0)
      setSwipeDir(null); setIsAnimating(false)
    }, 350)
  }, [profiles, currentIndex, myId, isAnimating, supabase])

  const handleSkip = useCallback(() => {
    if (!profiles[currentIndex] || isAnimating) return
    setIsAnimating(true)
    setSwipeDir('nope')
    setTimeout(() => {
      setCurrentIndex(p => p + 1)
      setDragX(0); setDragY(0)
      setSwipeDir(null); setIsAnimating(false)
    }, 350)
  }, [profiles, currentIndex, isAnimating])

  const handleBlock = async () => {
    if (!profiles[currentIndex] || !myId) return
    await supabase.from('blocks').insert({
      blocker_id: myId,
      blocked_id: profiles[currentIndex].id,
    }).catch(() => {})
    setShowDetail(false)
    setCurrentIndex(p => p + 1)
  }

  const handleReport = async () => {
    if (!profiles[currentIndex] || !myId || !reportReason) return
    await supabase.from('reports').insert({
      reporter_id: myId,
      reported_id: profiles[currentIndex].id,
      reason: reportReason,
    }).catch(() => {})
    setShowReport(false)
    setReportReason('')
    setCurrentIndex(p => p + 1)
    alert('通報しました。ご協力ありがとうございます。')
  }

  // マウス操作
  const onMouseDown = (e: React.MouseEvent) => {
    if (showDetail || showFilter) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setDragX(e.clientX - dragStart.current.x)
    setDragY(e.clientY - dragStart.current.y)
  }
  const onMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragX > 80) handleLike()
    else if (dragX < -80) handleSkip()
    else { setDragX(0); setDragY(0) }
  }

  // タッチ操作
  const onTouchStart = (e: React.TouchEvent) => {
    if (showDetail || showFilter) return
    setIsDragging(true)
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setDragX(e.touches[0].clientX - dragStart.current.x)
    setDragY(e.touches[0].clientY - dragStart.current.y)
  }
  const onTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragX > 80) handleLike()
    else if (dragX < -80) handleSkip()
    else { setDragX(0); setDragY(0) }
  }

  const cardStyle: React.CSSProperties = isAnimating
    ? {
        transform: swipeDir === 'like'
          ? 'translateX(150%) rotate(30deg)'
          : 'translateX(-150%) rotate(-30deg)',
        transition: 'transform 0.35s ease',
      }
    : isDragging
      ? {
          transform: `translateX(${dragX}px) translateY(${dragY * 0.2}px) rotate(${dragX * 0.06}deg)`,
          transition: 'none',
          cursor: 'grabbing',
        }
      : {
          transform: 'translateX(0) rotate(0deg)',
          transition: 'transform 0.3s ease',
          cursor: 'grab',
        }

  const likeOpacity = Math.min(1, Math.max(0, dragX / 80))
  const nopeOpacity = Math.min(1, Math.max(0, -dragX / 80))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-pink-400 text-xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  const cur = profiles[currentIndex]

  return (
    <div
      className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16 select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); setDragY(0) } }}
    >
      <Navbar />

      {/* ===== マッチング通知 ===== */}
      {showMatch && matchedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl w-full max-w-sm">
            <div className="text-6xl mb-3 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-pink-500 to-red-400 bg-clip-text text-transparent mb-3">
              マッチング！
            </h2>
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-4 border-pink-300 shadow-md">
              {matchedUser.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={matchedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-pink-100 flex items-center justify-center text-3xl">
                    {matchedUser.gender === 'male' ? '👨' : '👩'}
                  </div>
              }
            </div>
            <p className="text-gray-700 font-semibold mb-1">{matchedUser.name}さんとマッチしました！</p>
            <p className="text-gray-400 text-sm mb-6">💬 メッセージを送りましょう</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMatch(false)}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50"
              >
                続けて探す
              </button>
              <button
                onClick={() => { setShowMatch(false); router.push('/matches') }}
                className="flex-1 bg-gradient-to-r from-pink-400 to-red-400 text-white py-3 rounded-xl font-bold shadow-lg"
              >
                メッセージへ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== フィルターモーダル ===== */}
      {showFilter && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end justify-center" onClick={() => setShowFilter(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-gray-800 mb-5">🔎 検索条件</h3>
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  年齢: <span className="text-pink-500">{ageMin}歳 〜 {ageMax}歳</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-8">18</span>
                  <input type="range" min={18} max={60} value={ageMin}
                    onChange={e => setAgeMin(Number(e.target.value))}
                    className="flex-1 accent-pink-400" />
                  <span className="text-xs text-gray-400">〜</span>
                  <input type="range" min={18} max={99} value={ageMax}
                    onChange={e => setAgeMax(Number(e.target.value))}
                    className="flex-1 accent-pink-400" />
                  <span className="text-xs text-gray-400 w-8">99</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">エリア</label>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="">全国</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1 block">目的</label>
                <select value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="">指定なし</option>
                  <option value="marriage">結婚を前提に</option>
                  <option value="serious">真剣な交際</option>
                  <option value="casual">気軽に出会い</option>
                  <option value="friend">友達から始め</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setAgeMin(18); setAgeMax(50)
                  setFilterLocation(''); setFilterPurpose('')
                }}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-medium"
              >
                リセット
              </button>
              <button
                onClick={() => { loadProfiles(); setShowFilter(false) }}
                className="flex-1 bg-gradient-to-r from-pink-400 to-red-400 text-white font-bold py-3 rounded-xl shadow-md"
              >
                この条件で探す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== プロフィール詳細モーダル ===== */}
      {showDetail && cur && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end md:items-center justify-center" onClick={() => setShowDetail(false)}>
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 写真 */}
            <div className="relative h-64 bg-gradient-to-br from-pink-100 to-red-100 flex-shrink-0">
              {cur.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cur.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-8xl">
                    {cur.gender === 'male' ? '👨' : cur.gender === 'female' ? '👩' : '🧑'}
                  </div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h2 className="text-2xl font-bold text-white">{cur.name} <span className="text-lg font-normal text-white/80">{cur.age}歳</span></h2>
                {cur.location && <p className="text-white/70 text-sm">📍 {cur.location}</p>}
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="absolute top-4 right-4 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/60"
              >✕</button>
            </div>

            {/* コンテンツ */}
            <div className="overflow-y-auto flex-1 p-5">
              {/* タグ群 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {cur.purpose && <span className="bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full font-medium">{purposeLabel[cur.purpose]}</span>}
                {cur.occupation && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">💼 {cur.occupation}</span>}
                {cur.height && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">📏 {cur.height}cm</span>}
                {cur.body_type && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">👤 {bodyTypeLabel[cur.body_type]}</span>}
                {cur.education && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">🎓 {educationLabel[cur.education]}</span>}
                {cur.income && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">💰 {incomeLabel[cur.income]}</span>}
                {cur.smoking && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{smokingLabel[cur.smoking]}</span>}
                {cur.drinking && <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{drinkingLabel[cur.drinking]}</span>}
              </div>

              {/* 自己紹介 */}
              {cur.bio && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{cur.bio}</p>
                </div>
              )}

              {/* 趣味 */}
              {cur.hobbies?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">🎨 趣味・興味</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cur.hobbies.map(h => (
                      <span key={h} className="bg-pink-50 text-pink-600 text-xs px-3 py-1 rounded-full border border-pink-100">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ブロック・通報 */}
              <div className="flex gap-2 mt-3 mb-2">
                <button
                  onClick={handleBlock}
                  className="flex-1 border border-gray-200 text-gray-500 text-xs py-2 rounded-xl hover:bg-gray-50"
                >
                  🚫 ブロック
                </button>
                <button
                  onClick={() => { setShowDetail(false); setShowReport(true) }}
                  className="flex-1 border border-gray-200 text-gray-500 text-xs py-2 rounded-xl hover:bg-gray-50"
                >
                  🚨 通報
                </button>
              </div>
            </div>

            {/* いいね/パスボタン */}
            <div className="flex gap-3 p-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => { setShowDetail(false); handleSkip() }}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-lg hover:border-gray-300"
              >
                👎 パス
              </button>
              <button
                onClick={() => { setShowDetail(false); handleLike() }}
                className="flex-1 bg-gradient-to-r from-pink-400 to-red-400 text-white py-3 rounded-xl font-bold shadow-lg text-lg"
              >
                ❤️ いいね！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 通報モーダル ===== */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🚨 通報理由を選択</h3>
            <div className="space-y-2 mb-4">
              {['不適切な写真・プロフィール', '迷惑・嫌がらせ', '詐欺・業者', 'スパム', 'その他'].map(r => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition ${
                    reportReason === r ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReport(false); setReportReason('') }}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl"
              >
                キャンセル
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason}
                className="flex-1 bg-red-400 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                通報する
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">💕 探す</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
              ❤️ {likedCount}
            </span>
            <button
              onClick={() => setShowFilter(true)}
              className={`bg-white border px-3 py-1.5 rounded-xl text-sm font-medium shadow-sm transition ${
                (filterLocation || filterPurpose)
                  ? 'border-pink-400 text-pink-500'
                  : 'border-gray-200 text-gray-600 hover:border-pink-300'
              }`}
            >
              🔎 絞り込み{(filterLocation || filterPurpose) ? ' ●' : ''}
            </button>
          </div>
        </div>

        {!cur ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">候補者がいません</h2>
            <p className="text-gray-500 text-sm mb-6">条件を変えて探してみましょう</p>
            <button
              onClick={() => setShowFilter(true)}
              className="bg-gradient-to-r from-pink-400 to-red-400 text-white px-6 py-3 rounded-full font-medium mb-3 shadow-md"
            >
              🔎 条件を変える
            </button>
            <button
              onClick={() => loadProfiles()}
              className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full font-medium text-sm"
            >
              再読み込み
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* 次のカード（後ろに重ねて奥行き感） */}
            {profiles[currentIndex + 1] && (
              <div className="absolute inset-x-3 top-3 bottom-0 bg-white rounded-3xl shadow-sm scale-95 z-0 opacity-70" />
            )}

            {/* メインカード */}
            <div
              style={cardStyle}
              className="relative bg-white rounded-3xl shadow-xl overflow-hidden z-10"
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* LIKE ラベル */}
              <div
                className="absolute top-8 left-5 z-20 pointer-events-none"
                style={{ opacity: likeOpacity }}
              >
                <div className="border-4 border-green-400 text-green-400 text-2xl font-black px-4 py-1 rounded-xl rotate-[-15deg] bg-white/20">
                  LIKE ❤️
                </div>
              </div>
              {/* NOPE ラベル */}
              <div
                className="absolute top-8 right-5 z-20 pointer-events-none"
                style={{ opacity: nopeOpacity }}
              >
                <div className="border-4 border-red-400 text-red-400 text-2xl font-black px-4 py-1 rounded-xl rotate-[15deg] bg-white/20">
                  NOPE 👎
                </div>
              </div>

              {/* 写真 */}
              <div className="relative h-80 bg-gradient-to-br from-pink-100 to-red-100">
                {cur.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={cur.avatar_url} alt={cur.name} className="w-full h-full object-cover pointer-events-none" />
                  : <div className="w-full h-full flex items-center justify-center text-9xl">
                      {cur.gender === 'male' ? '👨' : cur.gender === 'female' ? '👩' : '🧑'}
                    </div>
                }
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-2xl font-bold text-white">{cur.name}</h2>
                    <span className="text-xl text-white/80">{cur.age}歳</span>
                  </div>
                  {cur.location && <p className="text-white/70 text-sm mt-0.5">📍 {cur.location}</p>}
                </div>
                <div className="absolute top-4 right-4 bg-black/30 text-white text-xs px-3 py-1 rounded-full">
                  残り {profiles.length - currentIndex} 人
                </div>
              </div>

              {/* 情報 */}
              <div className="p-4" onClick={() => setShowDetail(true)}>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {cur.purpose && (
                    <span className="bg-pink-50 text-pink-600 text-xs px-2.5 py-1 rounded-full font-medium">
                      {purposeLabel[cur.purpose]}
                    </span>
                  )}
                  {cur.occupation && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                      💼 {cur.occupation}
                    </span>
                  )}
                  {cur.height && (
                    <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                      📏 {cur.height}cm
                    </span>
                  )}
                </div>

                {cur.bio && (
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-2">{cur.bio}</p>
                )}

                {cur.hobbies?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cur.hobbies.slice(0, 4).map(h => (
                      <span key={h} className="bg-pink-50 text-pink-500 text-xs px-2 py-0.5 rounded-full">{h}</span>
                    ))}
                    {cur.hobbies.length > 4 && (
                      <span className="text-gray-400 text-xs px-1 py-0.5">+{cur.hobbies.length - 4}</span>
                    )}
                  </div>
                )}

                <p className="text-xs text-pink-400 mt-2 font-medium">タップして詳細を見る →</p>
              </div>
            </div>

            {/* 操作ボタン */}
            <div className="flex items-center justify-center gap-5 mt-5">
              <button
                onClick={handleSkip}
                disabled={isAnimating}
                className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition border-2 border-gray-200 hover:border-red-300 hover:text-red-400 disabled:opacity-50"
                title="スキップ"
              >
                👎
              </button>
              <button
                onClick={() => setShowDetail(true)}
                className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-xl hover:scale-110 transition border-2 border-gray-200 hover:border-pink-300"
                title="詳細を見る"
              >
                ℹ️
              </button>
              <button
                onClick={handleLike}
                disabled={isAnimating}
                className="w-20 h-20 bg-gradient-to-br from-pink-400 to-red-400 rounded-full shadow-xl flex items-center justify-center text-3xl hover:scale-110 transition disabled:opacity-50"
                title="いいね！"
              >
                ❤️
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3">
              ← スワイプ or ボタンで操作 →
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
