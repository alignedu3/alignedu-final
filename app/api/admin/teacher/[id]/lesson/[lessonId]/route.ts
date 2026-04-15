import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getAdminVisibility } from '@/lib/adminVisibility';

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
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await context.params;
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

    const [{ data: lesson, error: lessonError }, { data: teacher, error: teacherError }] = await Promise.all([
      serviceSupabase
        .from('analyses')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle(),
      serviceSupabase
        .from('profiles')
        .select('id, name')
        .eq('id', id)
        .maybeSingle(),
    ]);

    if (lessonError) {
      return NextResponse.json({ success: false, error: lessonError.message }, { status: 500 });
    }

    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    if (lesson.user_id !== id) {
      return NextResponse.json({ success: false, error: 'Lesson does not belong to this teacher' }, { status: 400 });
    }

    if (teacherError) {
      return NextResponse.json({ success: false, error: teacherError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lesson,
      teacher: teacher || { id, name: 'Teacher' },
    });
  } catch (error: any) {
    console.error('Admin teacher lesson route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
