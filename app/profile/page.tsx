'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default function ProfilePage() {
  const [profile, setProfile] = useState<{
    name: string; age: number | string; gender: string; looking_for: string;
    bio: string; location: string; occupation: string; avatar_url: string;
  }>({
    name: '', age: '', gender: '', looking_for: '',
    bio: '', location: '', occupation: '', avatar_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState('')
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
        })
      }
      setLoading(false)
    }
    loadProfile()
  }, [])

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      ...profile,
      age: parseInt(String(profile.age)),
      is_profile_complete: true,
      updated_at: new Date().toISOString(),
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-pink-400 text-xl animate-pulse">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">プロフィール編集</h1>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl p-3 mb-4 text-sm text-center">
            ✅ 保存しました！
          </div>
        )}

        {/* アバター */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden cursor-pointer border-4 border-pink-200 relative"
            onClick={() => fileRef.current?.click()}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-gray-400">
                👤
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="text-white text-xs">アップロード中...</div>
              </div>
            )}
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

        <form onSubmit={handleSave} className="space-y-4">
          {/* ニックネーム */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム *</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="表示名"
            />
          </div>

          {/* 年齢 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年齢 *</label>
            <input
              type="number"
              value={profile.age}
              onChange={(e) => setProfile(p => ({ ...p, age: e.target.value }))}
              required min={18} max={99}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">性別 *</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'male', label: '男性', emoji: '👨' }, { value: 'female', label: '女性', emoji: '👩' }, { value: 'other', label: 'その他', emoji: '🧑' }].map(g => (
                <button key={g.value} type="button" onClick={() => setProfile(p => ({ ...p, gender: g.value }))}
                  className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition ${profile.gender === g.value ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600'}`}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 探している相手 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">探している相手 *</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'male', label: '男性', emoji: '👨' }, { value: 'female', label: '女性', emoji: '👩' }, { value: 'both', label: 'どちらも', emoji: '💑' }].map(g => (
                <button key={g.value} type="button" onClick={() => setProfile(p => ({ ...p, looking_for: g.value }))}
                  className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition ${profile.looking_for === g.value ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600'}`}>
                  {g.emoji} {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* 居住地 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">居住地</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="東京都"
            />
          </div>

          {/* 職業 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">職業</label>
            <input
              type="text"
              value={profile.occupation}
              onChange={(e) => setProfile(p => ({ ...p, occupation: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="会社員"
            />
          </div>

          {/* 自己紹介 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">自己紹介</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
              rows={4}
              maxLength={300}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
              placeholder="自分のことを書いてみましょう（300文字まで）"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{profile.bio.length}/300</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </form>

        {/* ログアウト */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 border border-red-300 text-red-400 font-medium py-3 rounded-xl hover:bg-red-50 transition"
        >
          ログアウト
        </button>
      </div>
    </div>
  )
}
