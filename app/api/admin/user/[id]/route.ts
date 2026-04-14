import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params;

  if (!targetId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  // Verify caller is authenticated
  const serverClient = await createServerClient();
  const {
    data: { user: callerUser },
  } = await serverClient.auth.getUser();

  if (!callerUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Prevent self-deletion
  if (callerUser.id === targetId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  // Only super_admin can delete users
  const { data: callerProfile } = await serverClient
    .from('profiles')
    .select('role')
    .eq('id', callerUser.id)
    .single();

  const callerRole = callerProfile?.role;
  if (!['admin', 'super_admin'].includes(callerRole || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Service-role client for admin auth operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Prevent deleting another super_admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', targetId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  if (targetProfile?.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot delete a super admin account.' }, { status: 403 });
  }

  if (callerRole === 'admin') {
    if (targetProfile.role !== 'teacher') {
      return NextResponse.json({ error: 'Admins can only delete teacher accounts.' }, { status: 403 });
    }

    const { data: managedLink } = await supabase
      .from('managed_teachers')
      .select('teacher_id')
      .eq('admin_id', callerUser.id)
      .eq('teacher_id', targetId)
      .maybeSingle();

    if (!managedLink) {
      return NextResponse.json({ error: 'You can only delete teachers assigned to you.' }, { status: 403 });
    }
  }

  // Remove relationship rows first to avoid FK constraint issues.
  await supabase.from('managed_teachers').delete().eq('teacher_id', targetId);
  await supabase.from('managed_teachers').delete().eq('admin_id', targetId);
  await supabase.from('managed_admins').delete().eq('child_admin_id', targetId);
  await supabase.from('managed_admins').delete().eq('parent_admin_id', targetId);

  // Delete profile first (avoids FK issues if cascade isn't set)
  await supabase.from('profiles').delete().eq('id', targetId);

  // Delete the auth user
  const { error: deleteError } = await supabase.auth.admin.deleteUser(targetId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
