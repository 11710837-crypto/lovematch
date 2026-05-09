'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

const HOBBIES = [
  '映画鑑賞', '音楽鑑賞', '読書', 'ゲーム', '旅行', 'スポーツ観戦',
  'アウトドア', '料理', 'カフェ巡り', '写真撮影', 'ファッション',
  'ダンス', '筋トレ', 'ヨガ', 'マンガ・アニメ', '車・バイク',
  'ペット', 'ショッピング', '釣り', 'キャンプ', 'DIY', '美術館',
  'ライブ・コンサート', 'ボードゲーム', 'ランニング', '水泳',
  '登山', 'サイクリング', 'ワイン・お酒', 'カラオケ',
]

const LOCATIONS = [
  '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
  '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
  '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜',
  '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫',
  '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口',
  '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎',
  '熊本', '大分', '宮崎', '鹿児島', '沖縄',
]

type Profile = {
  name: string
  age: number | string
  gender: string
  looking_for: string
  bio: string
  location: string
  occupation: string
  avatar_url: string
  height: number | string
  body_type: string
  education: string
  income: string
  smoking: string
  drinking: string
  purpose: string
  hobbies: string[]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    name: '', age: '', gender: '', looking_for: '',
    bio: '', location: '', occupation: '', avatar_url: '',
    height: '', body_type: '', education: '', income: '',
    smoking: '', drinking: '', purpose: '', hobbies: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState('')
  const [activeTab, setActiveTab] = useState<'basic' | 'detail' | 'hobbies'>('basic')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          name: data.name || '',
          age: data.age || '',
          gender: data.gender || '',
          looking_for: data.looking_for || '',
          bio: data.bio || '',
          location: data.location || '',
          occupation: data.occupation || '',
          avatar_url: data.avatar_url || '',
          height: data.height || '',
          body_type: data.body_type || '',
          education: data.education || '',
          income: data.income || '',
          smoking: data.smoking || '',
          drinking: data.drinking || '',
          purpose: data.purpose || '',
          hobbies: data.hobbies || [],
        })
      }
      setLoading(false)
    }
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // プロフィール完成度を計算
  const completionItems = [
    { key: 'name', label: '名前' },
    { key: 'age', label: '年齢' },
    { key: 'gender', label: '性別' },
    { key: 'looking_for', label: '希望相手' },
    { key: 'bio', label: '自己紹介' },
    { key: 'location', label: '居住地' },
    { key: 'occupation', label: '職業' },
    { key: 'avatar_url', label: '写真' },
    { key: 'height', label: '身長' },
    { key: 'purpose', label: '目的' },
  ]
  const completed = completionItems.filter(item => {
    const val = profile[item.key as keyof Profile]
    return val && val !== '' && !(Array.isArray(val) && val.length === 0)
  }).length + (profile.hobbies.length > 0 ? 1 : 0)
  const total = completionItems.length + 1
  const pct = Math.round((completed / total) * 100)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/avatar.${fileExt}`
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
    }
    setUploading(false)
  }

  const toggleHobby = (hobby: string) => {
    setProfile(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(hobby)
        ? prev.hobbies.filter(h => h !== hobby)
        : prev.hobbies.length < 10 ? [...prev.hobbies, hobby] : prev.hobbies,
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      ...profile,
      age: parseInt(String(profile.age)) || null,
      height: parseInt(String(profile.height)) || null,
      is_profile_complete: !!(profile.name && profile.age && profile.gender && profile.looking_for),
      updated_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
    })
    if (!error) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-pink-400 text-xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0 md:pt-16">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* プロフィール完成度バー */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">プロフィール完成度</span>
            <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-pink-500'}`}>
              {pct}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-400' : pct >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-pink-400 to-red-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pct < 80 && (
            <p className="text-xs text-gray-400 mt-1.5">
              ✨ プロフィールを充実させるとマッチング率が上がります！
            </p>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl p-3 mb-4 text-sm text-center">
            ✅ 保存しました！
          </div>
        )}

        {/* アバター */}
        <div className="flex flex-col items-center mb-5">
          <div
            className="w-28 h-28 rounded-full overflow-hidden cursor-pointer border-4 border-pink-200 relative shadow-lg"
            onClick={() => fileRef.current?.click()}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-red-100 flex items-center justify-center text-5xl text-gray-400">
                👤
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-xs font-medium">アップロード中...</div>
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-white text-sm">📷</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-sm text-pink-500 font-medium hover:underline"
          >
            写真を変更
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* タブ */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5 shadow-inner">
          {[
            { id: 'basic', label: '基本情報', emoji: '📝' },
            { id: 'detail', label: '詳細情報', emoji: '🔍' },
            { id: 'hobbies', label: '趣味', emoji: '🎨' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow text-pink-500 font-semibold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* ===== 基本情報タブ ===== */}
          {activeTab === 'basic' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ニックネーム *</label>
                <input
                  type="text" value={profile.name}
                  onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                  required maxLength={20}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                  placeholder="表示名（20文字まで）"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">年齢 *</label>
                <input
                  type="number" value={profile.age}
                  onChange={(e) => setProfile(p => ({ ...p, age: e.target.value }))}
                  required min={18} max={99}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">性別 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: '男性', emoji: '👨' },
                    { value: 'female', label: '女性', emoji: '👩' },
                    { value: 'other', label: 'その他', emoji: '🧑' },
                  ].map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setProfile(p => ({ ...p, gender: g.value }))}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition ${
                        profile.gender === g.value
                          ? 'border-pink-400 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">探している相手 *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: '男性', emoji: '👨' },
                    { value: 'female', label: '女性', emoji: '👩' },
                    { value: 'both', label: 'どちらも', emoji: '💑' },
                  ].map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setProfile(p => ({ ...p, looking_for: g.value }))}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition ${
                        profile.looking_for === g.value
                          ? 'border-pink-400 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                    >
                      {g.emoji} {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">目的・希望 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'marriage', label: '💍 結婚を前提に' },
                    { value: 'serious', label: '❤️ 真剣な交際' },
                    { value: 'casual', label: '😊 気軽に出会い' },
                    { value: 'friend', label: '👫 友達から始め' },
                  ].map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setProfile(prev => ({ ...prev, purpose: p.value }))}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-left ${
                        profile.purpose === p.value
                          ? 'border-pink-400 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">居住地</label>
                <select
                  value={profile.location}
                  onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                >
                  <option value="">選択してください</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">自己紹介</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                  rows={5} maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none bg-white"
                  placeholder="自分のことを書いてみましょう（趣味・性格・好きなこと）"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{(profile.bio || '').length}/500</p>
              </div>
            </>
          )}

          {/* ===== 詳細情報タブ ===== */}
          {activeTab === 'detail' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">職業</label>
                <input
                  type="text" value={profile.occupation}
                  onChange={(e) => setProfile(p => ({ ...p, occupation: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                  placeholder="会社員・エンジニア・医師など"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">身長 (cm)</label>
                <input
                  type="number" value={profile.height}
                  onChange={(e) => setProfile(p => ({ ...p, height: e.target.value }))}
                  min={140} max={220}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                  placeholder="170"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">体型</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'slim', label: 'スリム' },
                    { value: 'normal', label: '普通' },
                    { value: 'muscular', label: 'マッチョ' },
                    { value: 'chubby', label: 'ぽっちゃり' },
                    { value: 'curvy', label: 'グラマー' },
                  ].map(b => (
                    <button key={b.value} type="button"
                      onClick={() => setProfile(p => ({ ...p, body_type: b.value }))}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition ${
                        profile.body_type === b.value
                          ? 'border-pink-400 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">学歴</label>
                <select
                  value={profile.education}
                  onChange={(e) => setProfile(p => ({ ...p, education: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                >
                  <option value="">選択してください</option>
                  <option value="high_school">高校卒</option>
                  <option value="vocational">専門学校卒</option>
                  <option value="junior_college">短大卒</option>
                  <option value="university">大学卒</option>
                  <option value="graduate">大学院卒</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">年収</label>
                <select
                  value={profile.income}
                  onChange={(e) => setProfile(p => ({ ...p, income: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white"
                >
                  <option value="">選択してください</option>
                  <option value="under300">300万円未満</option>
                  <option value="300to500">300〜500万円</option>
                  <option value="500to700">500〜700万円</option>
                  <option value="700to1000">700〜1000万円</option>
                  <option value="over1000">1000万円以上</option>
                  <option value="secret">非公開</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">喫煙</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'no', label: '🚭 吸わない' },
                    { value: 'occasionally', label: '🚬 時々吸う' },
                    { value: 'yes', label: '🚬 吸う' },
                    { value: 'quit', label: '✅ 禁煙中' },
                  ].map(s => (
                    <button key={s.value} type="button"
                      onClick={() => setProfile(p => ({ ...p, smoking: s.value }))}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-left ${
                        profile.smoking === s.value
                          ? 'border-pink-400 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">飲酒</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'no', label: '🙅 飲まない' },
                    { value: 'occasionally', label: '🍺 時々飲む' },
                    { value: 'yes', label: '🍶 よく飲む' },
                  ].map(d => (
                    <button key={d.value} type="button"
                      onClick={() => setProfile(p => ({ ...p, drinking: d.value }))}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition ${
                        profile.drinking === d.value
                          ? 'border-pink-400 bg-pink-50 text-pink-600'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== 趣味タブ ===== */}
          {activeTab === 'hobbies' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">趣味・興味（最大10個）</label>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  profile.hobbies.length === 10
                    ? 'bg-pink-100 text-pink-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {profile.hobbies.length}/10
                </span>
              </div>
              {profile.hobbies.length === 10 && (
                <p className="text-xs text-pink-500 mb-3">✅ 上限に達しました。変更するには選択を外してください</p>
              )}
              <div className="flex flex-wrap gap-2">
                {HOBBIES.map(hobby => {
                  const selected = profile.hobbies.includes(hobby)
                  return (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      disabled={!selected && profile.hobbies.length >= 10}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition ${
                        selected
                          ? 'border-pink-400 bg-pink-400 text-white shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-pink-200 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {selected ? '✓ ' : ''}{hobby}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow-lg text-base"
          >
            {saving ? '保存中...' : '💾 保存する'}
          </button>
        </form>

        <button
          onClick={handleLogout}
          className="w-full mt-4 border-2 border-red-200 text-red-400 font-medium py-3 rounded-xl hover:bg-red-50 transition"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
