'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [show, setShow] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabaseがハッシュフラグメントからセッションを自動的に取得する
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // パスワードリセット画面を表示する準備OK
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
    } else {
      setDone(true)
      setTimeout(() => router.push('/discover'), 3000)
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
        </div>

        {done ? (
          /* 完了画面 */
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">パスワードを変更しました！</h2>
            <p className="text-gray-500 text-sm mb-6">3秒後にホーム画面へ移動します...</p>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        ) : (
          /* パスワード入力フォーム */
          <>
            <h2 className="text-xl font-bold text-gray-700 mb-2 text-center">新しいパスワードを設定</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              6文字以上のパスワードを入力してください
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード
                </label>
                <div className="relative">
                  <input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required minLength={6}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="6文字以上"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
                  >
                    {show ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード（確認）
                </label>
                <input
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required minLength={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="もう一度入力"
                />
                {confirm && password !== confirm && (
                  <p className="text-red-400 text-xs mt-1">⚠️ パスワードが一致しません</p>
                )}
                {confirm && password === confirm && confirm.length >= 6 && (
                  <p className="text-green-500 text-xs mt-1">✅ 一致しています</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || password !== confirm || password.length < 6}
                className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? '更新中...' : '🔑 パスワードを変更する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
