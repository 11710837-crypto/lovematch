'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      if (error.status === 429 || error.message?.includes('security purposes') || error.message?.includes('rate limit')) {
        setError('送信回数の上限です。60秒以上待ってから再試行してください。')
      } else {
        setError('送信に失敗しました。しばらくしてから再試行してください。')
      }
    } else {
      setSent(true)
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

        {sent ? (
          /* 送信完了 */
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">メールを送信しました！</h2>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-green-700 text-sm font-medium mb-1">✅ 送信先：{email}</p>
              <p className="text-green-600 text-sm">
                メール内の「パスワードをリセット」ボタンをクリックしてください。
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6">
              <p className="text-yellow-700 text-xs">
                ⚠️ メールが届かない場合は迷惑メールフォルダも確認してください
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl text-center hover:opacity-90 transition"
            >
              ログイン画面に戻る
            </Link>
          </div>
        ) : (
          /* メール入力フォーム */
          <>
            <h2 className="text-xl font-bold text-gray-700 mb-2 text-center">パスワードをお忘れですか？</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              登録したメールアドレスを入力してください。<br />
              パスワードリセットのメールをお送りします。
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="example@email.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-400 to-red-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? '送信中...' : '📧 リセットメールを送る'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              <Link href="/login" className="text-pink-500 font-medium hover:underline">
                ← ログイン画面に戻る
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
