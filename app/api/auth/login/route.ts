import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { captureRouteException } from '@/lib/sentryRoute';

const LOGIN_TIMEOUT_MS = 8000;
const PROFILE_TIMEOUT_MS = 5000;

class RouteTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteTimeoutError';
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
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

    // Resolve the role alongside authentication so it does not add a second
    // sequential network wait to every successful login.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const profileLookupPromise: Promise<{
      profile: { id?: string; name?: string | null; role?: string | null } | null;
      error: unknown;
    }> = serviceRoleKey
      ? withTimeout(
          createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            { auth: { persistSession: false, autoRefreshToken: false } }
          )
            .from('profiles')
            .select('id, name, role')
            .eq('email', email)
            .maybeSingle(),
          PROFILE_TIMEOUT_MS,
          'Login profile lookup timeout'
        )
          .then((result) => ({ profile: result.data ?? null, error: result.error ?? null }))
          .catch((error: unknown) => ({ profile: null, error }))
      : Promise.resolve({ profile: null, error: null });

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

    let profileResult = await profileLookupPromise;
    if (!serviceRoleKey) {
      try {
        const fallbackResult = await withTimeout(
          supabase
            .from('profiles')
            .select('id, name, role')
            .eq('id', data.user.id)
            .maybeSingle(),
          PROFILE_TIMEOUT_MS,
          'Login profile lookup timeout'
        );
        profileResult = { profile: fallbackResult.data ?? null, error: fallbackResult.error ?? null };
      } catch (fallbackError) {
        profileResult = { profile: null, error: fallbackError };
      }
    }
    const profile = profileResult.profile?.id === data.user.id ? profileResult.profile : null;

    if (profileResult.error) {
      if (profileResult.error instanceof RouteTimeoutError) {
        console.warn('Login profile lookup timed out; using authenticated user metadata for routing.');
      } else {
        console.error('Login profile lookup failed, using authenticated user metadata:', profileResult.error);
        captureRouteException(profileResult.error, {
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
    }

    const metadataRole = String(data.user.app_metadata?.role || data.user.user_metadata?.role || '');
    const role = profile?.role ?? metadataRole;
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
