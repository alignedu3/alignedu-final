import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getAdminVisibility } from '@/lib/adminVisibility';
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
      .single();

    if (callerProfileError) {
      return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 });
    }

    sentryUser.role = callerProfile?.role || null;

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const visibility = await getAdminVisibility(user.id, callerProfile.role);
    const serviceSupabase = getServiceSupabase();

    const [{ data: profiles, error: profilesError }, { data: analyses, error: analysesError }] =
      await Promise.all([
        serviceSupabase
          .from('profiles')
          .select('id, name, role')
          .in('id', visibility.visibleUserIds),
        visibility.teacherIds.length
          ? serviceSupabase
              .from('analyses')
              .select('*')
              .in('user_id', visibility.teacherIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }

    if (analysesError) {
      return NextResponse.json({ success: false, error: analysesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      caller: callerProfile,
      profiles: profiles || [],
      analyses: analyses || [],
      visibility,
    });
  } catch (error: any) {
    console.error('Admin district route error:', error);
    captureRouteException(error, {
      route: 'api/admin/district',
      user: sentryUser,
    });
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
