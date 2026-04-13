import { createClient as createServiceClient } from '@supabase/supabase-js';

type AdminVisibility = {
  adminIds: string[];
  teacherIds: string[];
  visibleUserIds: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function isMissingTableError(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return text.includes('does not exist') || text.includes('relation') || text.includes('managed_admins');
}

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAdminVisibility(adminId: string): Promise<AdminVisibility> {
  const supabase = getServiceSupabase();

  const adminIds = new Set<string>([adminId]);
  let frontier = [adminId];

  // Traverse managed_admins so parent admins inherit visibility into child admins.
  while (frontier.length > 0) {
    const { data, error } = await supabase
      .from('managed_admins')
      .select('child_admin_id')
      .in('parent_admin_id', frontier);

    if (error) {
      if (isMissingTableError(error)) {
        break;
      }
      throw error;
    }

    const nextFrontier = (data || [])
      .map((row: any) => row.child_admin_id as string)
      .filter((id: string) => !!id && !adminIds.has(id));

    nextFrontier.forEach((id) => adminIds.add(id));
    frontier = nextFrontier;
  }

  const resolvedAdminIds = unique(Array.from(adminIds));

  const { data: managedTeachers, error: managedTeachersError } = await supabase
    .from('managed_teachers')
    .select('teacher_id')
    .in('admin_id', resolvedAdminIds);

  if (managedTeachersError) {
    throw managedTeachersError;
  }

  const teacherIds = unique((managedTeachers || []).map((row: any) => row.teacher_id as string).filter(Boolean));
  const visibleUserIds = unique([...resolvedAdminIds, ...teacherIds]);

  return {
    adminIds: resolvedAdminIds,
    teacherIds,
    visibleUserIds,
  };
}
