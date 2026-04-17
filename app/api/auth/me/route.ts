import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteException } from '@/lib/sentryRoute';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ user: null, profile: null }, { status: 200 });
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return response;
  }

  sentryUser = {
    id: user.id,
    email: user.email ?? null,
    role: null,
  };

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', user.id)
      .maybeSingle();

    sentryUser.role = profile?.role ?? null;

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email ?? null,
        },
        profile: profile ?? null,
      },
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error('Auth me route error:', error);
    captureRouteException(error, {
      route: 'api/auth/me',
      user: sentryUser,
    });
    return NextResponse.json({ user: null, profile: null }, { status: 500 });
  }
}
