'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      router.push('/discover')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💕</div>
          <h1 className="text-3xl font-bold text-pink-500">LoveMatch</h1>
          <p className="text-gray-500 mt-2 text-sm">素敵な出会いを見つけよう</p>
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">ログイン</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              placeholder="パスワードを入力"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 mt-2"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          アカウントをお持ちでない方は{' '}
          <Link href="/register" className="text-pink-500 font-medium hover:underline">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  )
}
