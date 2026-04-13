import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            res.cookies.set(name, value)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    const message = authError.message.toLowerCase()
    if (message.includes('invalid refresh token') || message.includes('refresh token not found')) {
      req.cookies
        .getAll()
        .filter((cookie) => cookie.name.startsWith('sb-'))
        .forEach((cookie) => {
          res.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
        })
    }
  }

  const path = req.nextUrl.pathname

  // Block admin routes if not logged in
  if (!user && path.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Role check
  if (user && path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
