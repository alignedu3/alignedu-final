import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: false }, { status: 500 });

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

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Login succeeded, but no user session was returned. Please try again.' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', data.user.id)
      .maybeSingle();

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
        destination,
      },
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error('Login route error:', error);
    return NextResponse.json({ error: 'Something went wrong while logging in.' }, { status: 500 });
  }
}
