import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteException } from '@/lib/sentryRoute';

const LOGIN_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 3000;

class RouteTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteTimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new RouteTimeoutError(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: false }, { status: 500 });
  let attemptedEmail: string | null = null;

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
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    attemptedEmail = email;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      LOGIN_TIMEOUT_MS,
      'Login route timeout (Supabase call delay)'
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Login succeeded, but no user session was returned. Please try again.' },
        { status: 500 }
      );
    }

    if (!data.session?.access_token || !data.session?.refresh_token) {
      return NextResponse.json(
        { error: 'Login succeeded, but the session could not be initialized. Please try again.' },
        { status: 500 }
      );
    }

    let profile: { name?: string | null; role?: string | null } | null = null;

    try {
      const { data: profileData } = await withTimeout(
        supabase
          .from('profiles')
          .select('name, role')
          .eq('id', data.user.id)
          .maybeSingle(),
        PROFILE_TIMEOUT_MS,
        'Login profile lookup timeout'
      );

      profile = profileData ?? null;
    } catch (profileError) {
      console.error('Login profile lookup delayed, using default destination:', profileError);
      captureRouteException(profileError, {
        route: 'api/auth/login',
        stage: 'profile_lookup',
        level: 'warning',
        user: {
          id: data.user.id,
          email,
          role: null,
        },
      });
    }

    const role = profile?.role ?? null;
    const destination = ['admin', 'super_admin'].includes(role) ? '/admin' : '/dashboard';

    return NextResponse.json(
      {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
        },
        profile: profile ?? null,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
        destination,
      },
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (error) {
    if (error instanceof RouteTimeoutError) {
      console.error(error.message);
      captureRouteException(error, {
        route: 'api/auth/login',
        stage: 'sign_in',
        user: {
          email: attemptedEmail,
          role: null,
        },
      });

      return NextResponse.json(
        { error: 'Login is taking longer than expected. Please try again.' },
        { status: 504 }
      );
    }

    console.error('Login route error:', error);
    captureRouteException(error, {
      route: 'api/auth/login',
      user: attemptedEmail
        ? {
            email: attemptedEmail,
            role: null,
          }
        : undefined,
    });
    return NextResponse.json({ error: 'Something went wrong while logging in.' }, { status: 500 });
  }
}
