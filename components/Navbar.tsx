'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { href: '/discover', label: '探す', emoji: '🔍' },
    { href: '/matches', label: 'マッチング', emoji: '💕' },
    { href: '/profile', label: 'プロフィール', emoji: '👤' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-lg mx-auto flex items-center justify-around md:justify-between">
        {/* ロゴ (PCのみ) */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-2xl">💕</span>
          <span className="font-bold text-pink-500 text-xl">LoveMatch</span>
        </div>

        {/* ナビゲーションリンク */}
        <div className="flex items-center gap-1 md:gap-2">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col md:flex-row items-center gap-1 px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition ${
                pathname === item.href
                  ? 'text-pink-500 bg-pink-50'
                  : 'text-gray-500 hover:text-pink-400 hover:bg-pink-50'
              }`}
            >
              <span className="text-lg md:text-base">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* ログアウト (PCのみ) */}
        <button
          onClick={handleLogout}
          className="hidden md:block text-sm text-gray-500 hover:text-red-400 transition px-3 py-2 rounded-xl hover:bg-red-50"
        >
          ログアウト
        </button>
      </div>
    </nav>
  )
}
