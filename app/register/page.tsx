'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const [step, setStep] = useState(1) // ステップ1: 基本情報, ステップ2: プロフィール
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [lookingFor, setLookingFor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    setError('')
    setStep(2)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !age || !gender || !lookingFor) {
      setError('すべての項目を入力してください')
      return
    }
    setLoading(true)
    setError('')

    // アカウント作成
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
        setError('このメールアドレスは既に登録されています。ログインページからログインしてください。')
      } else {
        setError(`登録に失敗しました: ${signUpError.message}`)
      }
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('登録に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    // プロフィール作成
    await supabase.from('profiles').insert({
      id: data.user.id,
      name,
      age: parseInt(age),
      gender,
      looking_for: lookingFor,
      is_profile_complete: true,
    })

    // メール確認が必要な場合（セッションがない）
    if (!data.session) {
      setError('確認メールを送信しました。メールを確認してからログインしてください。')
      setLoading(false)
      return
    }

    router.push('/discover')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* ロゴ */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💕</div>
          <h1 className="text-3xl font-bold text-pink-500">LoveMatch</h1>
        </div>

        {/* ステップ表示 */}
        <div className="flex items-center mb-6">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-pink-400' : 'bg-gray-200'}`} />
          <div className="w-2" />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-pink-400' : 'bg-gray-200'}`} />
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">
          {step === 1 ? 'アカウント作成' : 'プロフィール入力'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード（6文字以上）</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="パスワードを入力"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition mt-2"
            >
              次へ →
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="表示名を入力"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年齢</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min={18}
                max={99}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="18"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">性別</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ value: 'male', label: '男性', emoji: '👨' }, { value: 'female', label: '女性', emoji: '👩' }, { value: 'other', label: 'その他', emoji: '🧑' }].map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition ${gender === g.value ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600'}`}
                  >
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">探している相手</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ value: 'male', label: '男性', emoji: '👨' }, { value: 'female', label: '女性', emoji: '👩' }, { value: 'both', label: 'どちらも', emoji: '💑' }].map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setLookingFor(g.value)}
                    className={`py-2 px-3 rounded-xl border-2 text-sm font-medium transition ${lookingFor === g.value ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600'}`}
                  >
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
              >
                ← 戻る
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? '登録中...' : '登録完了！'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-pink-500 font-medium hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
