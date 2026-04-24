import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getAdminVisibility } from '@/lib/adminVisibility';
import { getErrorMessage } from '@/lib/errorHandling';

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error: Supabase service credentials are not set.');
  }

  return createServiceClient(supabaseUrl, serviceRoleKey);
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfileError) {
      return NextResponse.json({ success: false, error: callerProfileError.message }, { status: 500 });
    }

    if (!['admin', 'super_admin'].includes(callerProfile?.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const visibility = await getAdminVisibility(user.id, callerProfile.role);
    if (!visibility.teacherIds.includes(id)) {
      return NextResponse.json({ success: false, error: 'Teacher not in admin scope' }, { status: 403 });
    }

    const serviceSupabase = getServiceSupabase();

    const [{ data: teacher, error: teacherError }, { data: analyses, error: analysesError }] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, name')
        .eq('id', id)
        .maybeSingle(),
      serviceSupabase
        .from('analyses')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (teacherError) {
      return NextResponse.json({ success: false, error: teacherError.message }, { status: 500 });
    }

    if (analysesError) {
      return NextResponse.json({ success: false, error: analysesError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      teacher: teacher || { id, name: 'Teacher' },
      analyses: analyses || [],
    });
  } catch (error) {
    console.error('Admin teacher route error:', error);
    return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 });
  }
}
