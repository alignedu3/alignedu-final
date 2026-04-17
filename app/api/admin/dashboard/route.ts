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

    const { data: callerProfile, error: callerProfileError } = await serverSupabase
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (callerProfileError) {
      return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 });
    }

    if (!['admin', 'super_admin'].includes(callerProfile?.role || '')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const requestedAdminId = request.nextUrl.searchParams.get('adminId');
    let targetAdminId = user.id;
    let targetRole = callerProfile!.role as AdminRole;

    if (callerProfile?.role === 'super_admin' && requestedAdminId && requestedAdminId !== user.id) {
      const { data: targetProfile, error: targetProfileError } = await serverSupabase
        .from('profiles')
        .select('id, name, role')
        .eq('id', requestedAdminId)
        .maybeSingle();

      if (targetProfileError) {
        return NextResponse.json({ success: false, error: targetProfileError.message }, { status: 500 });
      }

      if (!targetProfile) {
        return NextResponse.json({ success: false, error: 'Selected admin was not found.' }, { status: 404 });
      }

      if (!['admin', 'super_admin'].includes(targetProfile.role || '')) {
        return NextResponse.json({ success: false, error: 'Selected user is not an admin.' }, { status: 400 });
      }

      targetAdminId = targetProfile.id;
      targetRole = targetProfile.role as AdminRole;
    }

    const visibility = await getAdminVisibility(targetAdminId, targetRole);
    const serviceSupabase = getServiceSupabase();

    const [{ data: profiles, error: profilesError }, { data: teacherLinks, error: teacherLinksError }, { data: adminLinks, error: adminLinksError }, { data: analyses, error: analysesError }] = await Promise.all([
      visibility.visibleUserIds.length
        ? serviceSupabase
            .from('profiles')
            .select('id, name, email, role')
            .in('id', visibility.visibleUserIds)
        : Promise.resolve({ data: [], error: null }),
      visibility.adminIds.length
        ? serviceSupabase
            .from('managed_teachers')
            .select('admin_id, teacher_id')
            .in('admin_id', visibility.adminIds)
        : Promise.resolve({ data: [], error: null }),
      visibility.adminIds.length
        ? serviceSupabase
            .from('managed_admins')
            .select('parent_admin_id, child_admin_id')
            .in('parent_admin_id', visibility.adminIds)
        : Promise.resolve({ data: [], error: null }),
      visibility.visibleUserIds.length
        ? serviceSupabase
            .from('analyses')
            .select('id, user_id, created_at, title, subject, grade, coverage_score, clarity_rating, engagement_level, assessment_quality, gaps_detected, transcript, result, analysis_result')
            .in('user_id', visibility.visibleUserIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }
    if (teacherLinksError) {
      return NextResponse.json({ success: false, error: teacherLinksError.message }, { status: 500 });
    }
    if (adminLinksError) {
      return NextResponse.json({ success: false, error: adminLinksError.message }, { status: 500 });
    }
    if (analysesError) {
      return NextResponse.json({ success: false, error: analysesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      caller: {
        id: callerProfile?.id || user.id,
        name: callerProfile?.name || null,
        role: callerProfile?.role || null,
      },
      targetAdminId,
      visibility,
      profiles: profiles || [],
      managedTeachers: teacherLinks || [],
      managedAdmins: adminLinks || [],
      analyses: analyses || [],
    });
  } catch (error: any) {
    console.error('Admin dashboard route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
