import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    const {
      data: { session },
    } = await supabase.auth.getSession();

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
    return NextResponse.json({ success: false, error: 'Unable to bootstrap session.' }, { status: 500 });
  }
}
