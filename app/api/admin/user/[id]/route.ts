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
      return NextResponse.json({ error: 'Administrators can only delete teacher accounts.' }, { status: 403 });
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

  const profileSnapshot = {
    id: targetId,
    name: targetProfile.name,
    role: targetProfile.role,
  };
  const { data: teacherLinks } = await supabase
    .from('managed_teachers')
    .select('admin_id, teacher_id')
    .or(`teacher_id.eq.${targetId},admin_id.eq.${targetId}`);
  const { data: adminLinks } = await supabase
    .from('managed_admins')
    .select('parent_admin_id, child_admin_id')
    .or(`child_admin_id.eq.${targetId},parent_admin_id.eq.${targetId}`);

  const isDeletedAdmin = targetProfile.role === 'admin';
  const parentAdminId =
    callerRole === 'super_admin' && isDeletedAdmin
      ? adminLinks?.find((link) => link.child_admin_id === targetId)?.parent_admin_id || callerUser.id
      : null;

  if (parentAdminId && parentAdminId !== targetId) {
    const reassignedTeacherLinks = (teacherLinks || [])
      .filter((link) => link.admin_id === targetId && link.teacher_id && link.teacher_id !== parentAdminId)
      .map((link) => ({
        admin_id: parentAdminId,
        teacher_id: link.teacher_id,
      }));

    const reassignedAdminLinks = (adminLinks || [])
      .filter((link) => link.parent_admin_id === targetId && link.child_admin_id && link.child_admin_id !== parentAdminId)
      .map((link) => ({
        parent_admin_id: parentAdminId,
        child_admin_id: link.child_admin_id,
      }));

    if (reassignedTeacherLinks.length > 0) {
      const { error: reassignTeachersError } = await supabase
        .from('managed_teachers')
        .upsert(reassignedTeacherLinks, { onConflict: 'admin_id,teacher_id', ignoreDuplicates: true });

      if (reassignTeachersError) {
        console.error('Teacher reassignment error:', reassignTeachersError);
        return NextResponse.json({ error: 'Failed to reassign the deleted admin’s teachers.' }, { status: 500 });
      }
    }

    if (reassignedAdminLinks.length > 0) {
      const { error: reassignAdminsError } = await supabase
        .from('managed_admins')
        .upsert(reassignedAdminLinks, { onConflict: 'parent_admin_id,child_admin_id', ignoreDuplicates: true });

      if (reassignAdminsError) {
        console.error('Admin reassignment error:', reassignAdminsError);
        return NextResponse.json({ error: 'Failed to reassign the deleted admin’s child admins.' }, { status: 500 });
      }
    }
  }

  // Remove relationship rows first to avoid FK constraint issues.
  const { error: deleteManagedTeacherByTeacherError } = await supabase.from('managed_teachers').delete().eq('teacher_id', targetId);
  const { error: deleteManagedTeacherByAdminError } = await supabase.from('managed_teachers').delete().eq('admin_id', targetId);
  const { error: deleteManagedAdminByChildError } = await supabase.from('managed_admins').delete().eq('child_admin_id', targetId);
  const { error: deleteManagedAdminByParentError } = await supabase.from('managed_admins').delete().eq('parent_admin_id', targetId);

  if (deleteManagedTeacherByTeacherError || deleteManagedTeacherByAdminError || deleteManagedAdminByChildError || deleteManagedAdminByParentError) {
    console.error('Relationship delete error:', {
      deleteManagedTeacherByTeacherError,
      deleteManagedTeacherByAdminError,
      deleteManagedAdminByChildError,
      deleteManagedAdminByParentError,
    });
    return NextResponse.json({ error: 'Failed to remove the user relationships.' }, { status: 500 });
  }

  // Delete profile first (avoids FK issues if cascade isn't set)
  const { error: deleteProfileError } = await supabase.from('profiles').delete().eq('id', targetId);

  if (deleteProfileError) {
    console.error('Profile delete error:', deleteProfileError);
    if (teacherLinks?.length) {
      await supabase.from('managed_teachers').upsert(teacherLinks, { onConflict: 'admin_id,teacher_id', ignoreDuplicates: true });
    }
    if (adminLinks?.length) {
      await supabase.from('managed_admins').upsert(adminLinks, { onConflict: 'parent_admin_id,child_admin_id', ignoreDuplicates: true });
    }
    return NextResponse.json({ error: 'Failed to remove the user profile.' }, { status: 500 });
  }

  // Delete the auth user
  const { error: deleteError } = await supabase.auth.admin.deleteUser(targetId);

  if (deleteError) {
    await supabase.from('profiles').upsert(profileSnapshot, { onConflict: 'id' });
    if (teacherLinks?.length) {
      await supabase.from('managed_teachers').upsert(teacherLinks, { onConflict: 'admin_id,teacher_id', ignoreDuplicates: true });
    }
    if (adminLinks?.length) {
      await supabase.from('managed_admins').upsert(adminLinks, { onConflict: 'parent_admin_id,child_admin_id', ignoreDuplicates: true });
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    reassignedToAdminId: parentAdminId,
  });
}
