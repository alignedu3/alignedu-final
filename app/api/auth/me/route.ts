import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteException } from '@/lib/sentryRoute';

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ user: null, profile: null }, { status: 200 });
  let sentryUser: { id?: string | null; email?: string | null; role?: string | null } | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { user: null, profile: null },
        {
          status: 200,
          headers: response.headers,
        }
      );
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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
      return NextResponse.json(
        { user: null, profile: null },
        {
          status: 200,
          headers: response.headers,
        }
      );
    }

    sentryUser = {
      id: user.id,
      email: user.email ?? null,
      role: null,
    };

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
    return NextResponse.json(
      { user: null, profile: null },
      {
        status: 200,
        headers: response.headers,
      }
    );
  }
}
