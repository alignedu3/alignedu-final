import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getAdminVisibility, type AdminRole } from '@/lib/adminVisibility';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Supabase service credentials are not set.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

export async function GET(request: NextRequest) {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await serverClient.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    if (!['admin', 'super_admin'].includes(profile?.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const requestedAdminId = request.nextUrl.searchParams.get('adminId');
    let targetAdminId = user.id;
    let targetRole = profile.role as AdminRole;

    if (profile.role === 'super_admin' && requestedAdminId && requestedAdminId !== user.id) {
      const serviceSupabase = getServiceSupabase();
      const { data: targetProfile, error: targetProfileError } = await serviceSupabase
        .from('profiles')
        .select('id, role')
        .eq('id', requestedAdminId)
        .maybeSingle();

      if (targetProfileError) {
        return NextResponse.json({ success: false, error: targetProfileError.message }, { status: 500 });
      }

      if (!targetProfile) {
        return NextResponse.json({ success: false, error: 'Selected admin was not found.' }, { status: 404 });
      }

      if (!['admin', 'super_admin'].includes(targetProfile.role)) {
        return NextResponse.json({ success: false, error: 'Selected user is not an admin.' }, { status: 400 });
      }

      targetAdminId = targetProfile.id;
      targetRole = targetProfile.role as AdminRole;
    }

    const visibility = await getAdminVisibility(targetAdminId, targetRole);

    return NextResponse.json({
      success: true,
      ...visibility,
    });
  } catch (error: any) {
    console.error('Admin visibility route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
