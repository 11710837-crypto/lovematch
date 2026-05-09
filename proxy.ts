import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 認証不要のページ（未ログインでもアクセス可）
  const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password']
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  // 未ログインで保護ページにアクセス → ログインへリダイレクト
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ログイン済みでログイン/登録/パスワード忘れページにアクセス → discoveryへリダイレクト
  // ※ reset-password はパスワードリセット中にも必要なのでリダイレクトしない
  const authRedirectPaths = ['/login', '/register', '/forgot-password']
  const isAuthRedirectPath = authRedirectPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (user && isAuthRedirectPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/discover'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
