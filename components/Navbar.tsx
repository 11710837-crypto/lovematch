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
    { href: '/footprints', label: '足あと', emoji: '👣' },
    { href: '/matches', label: 'トーク', emoji: '💬' },
    { href: '/profile', label: 'マイページ', emoji: '👤' },
  ]

  return (
    <>
      {/* モバイル：下部ナビ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-lg">
        <div className="flex">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 pb-3 gap-0.5 transition-all ${
                pathname === item.href ? 'text-pink-500' : 'text-gray-400'
              }`}
            >
              <span className={`text-2xl transition-transform duration-150 ${pathname === item.href ? 'scale-110' : 'scale-100'}`}>
                {item.emoji}
              </span>
              <span className={`text-xs font-medium ${pathname === item.href ? 'text-pink-500' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* PC：上部ナビ */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between px-6 py-3">
          {/* ロゴ */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">💕</span>
            <span className="text-xl font-black bg-gradient-to-r from-pink-500 to-red-400 bg-clip-text text-transparent">
              LoveMatch
            </span>
          </div>

          {/* ナビリンク */}
          <div className="flex gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  pathname === item.href
                    ? 'bg-gradient-to-r from-pink-50 to-red-50 text-pink-500 shadow-sm'
                    : 'text-gray-500 hover:text-pink-400 hover:bg-pink-50'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* ログアウト */}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-red-400 transition px-3 py-2 rounded-xl hover:bg-red-50"
          >
            ログアウト
          </button>
        </div>
      </nav>
    </>
  )
}
