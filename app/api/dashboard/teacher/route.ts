import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { captureRouteException } from '@/lib/sentryRoute';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Supabase service credentials are not set.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

export async function GET() {
  let sentryUser: { id?: string | null; email?: string | null; role?: string | null } | null = null;

  try {
    const serverSupabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    sentryUser = {
      id: user.id,
      email: user.email ?? null,
      role: null,
    };

    const { data: callerProfile, error: callerProfileError } = await serverSupabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfileError) {
      return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 });
    }

    sentryUser.role = callerProfile?.role || 'teacher';

    const serviceSupabase = getServiceSupabase();
    const { data: analyses, error: analysesError } = await serviceSupabase
      .from('analyses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (analysesError) {
      return NextResponse.json({ success: false, error: analysesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      teacher: {
        id: user.id,
        name: callerProfile?.name || 'Teacher',
        role: callerProfile?.role || 'teacher',
      },
      analyses: analyses || [],
    });
  } catch (error: any) {
    console.error('Teacher dashboard route error:', error);
    captureRouteException(error, {
      route: 'api/dashboard/teacher',
      user: sentryUser,
    });
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
