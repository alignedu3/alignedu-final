import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteException } from '@/lib/sentryRoute';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  const sentryUser = {
    id: request.cookies.get('sb-user-id')?.value ?? null,
    email: null,
    role: null,
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    captureRouteException(error, {
      route: 'api/auth/logout',
      user: sentryUser,
      level: 'warning',
    });
    // Continue clearing cookies even if token revocation fails.
  }

  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith('sb-'))
    .forEach((cookie) => {
      response.cookies.set(cookie.name, '', {
        maxAge: 0,
        path: '/',
      });
    });

  return response;
}
