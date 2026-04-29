import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { captureRouteException } from '@/lib/sentryRoute'

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  // Only admin routes rely on proxy-based auth enforcement.
  if (!path.startsWith('/admin')) {
    return NextResponse.next({ request: req })
  }

  let res = NextResponse.next({ request: req })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return res
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
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
      } else {
        captureRouteException(authError, {
          route: 'proxy',
          stage: 'get_user',
          extra: {
            path,
          },
          level: 'warning',
        })
      }
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Defer role checks to the server layout so proxy only handles session
    // refresh and unauthenticated redirects on admin routes.
  } catch (error) {
    captureRouteException(error, {
      route: 'proxy',
      stage: 'admin_guard',
      extra: {
        path,
      },
    })
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*'],
}
