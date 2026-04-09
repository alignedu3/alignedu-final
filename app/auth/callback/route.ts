import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;

  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any });

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);

    const next = searchParams.get('next');
    if (next) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
