import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteException } from '@/lib/sentryRoute';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ success: false }, { status: 500 });
  let sentryUser: { id?: string | null; email?: string | null; role?: string | null } | null = null;

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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    sentryUser = {
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      role: null,
    };

    if (!session?.access_token || !session.refresh_token) {
      return NextResponse.json({ success: false, error: 'No active session.' }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      },
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error('Bootstrap session route error:', error);
    captureRouteException(error, {
      route: 'api/auth/bootstrap-session',
      user: sentryUser,
    });
    return NextResponse.json({ success: false, error: 'Unable to bootstrap session.' }, { status: 500 });
  }
}
