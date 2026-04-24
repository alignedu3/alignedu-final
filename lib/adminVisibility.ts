import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getErrorDetails, getErrorMessage } from '@/lib/errorHandling';

type AdminVisibility = {
  adminIds: string[];
  teacherIds: string[];
  visibleUserIds: string[];
};

export type AdminRole = 'admin' | 'super_admin';

type IdRow = {
  id: string | null;
};

type ManagedAdminRow = {
  child_admin_id: string | null;
};

type ManagedTeacherRow = {
  teacher_id: string | null;
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function isMissingTableError(error: unknown) {
  const text = `${getErrorMessage(error, '')} ${getErrorDetails(error)}`.toLowerCase();
  return text.includes('does not exist') || text.includes('relation') || text.includes('managed_admins');
}

function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Server configuration error: NEXT_PUBLIC_SUPABASE_URL is not set.');
  }

  if (!serviceRoleKey) {
    throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  return createServiceClient(
    supabaseUrl,
    serviceRoleKey
  );
}

export async function getAdminVisibility(adminId: string, role: AdminRole = 'admin'): Promise<AdminVisibility> {
  const supabase = getServiceSupabase();

  if (role === 'super_admin') {
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'super_admin']);

    if (adminsError) {
      throw adminsError;
    }

    const resolvedAdminIds = unique(((admins || []) as IdRow[]).map((row) => row.id || '').filter(Boolean));

    const { data: teachers, error: teachersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'teacher');

    if (teachersError) {
      throw teachersError;
    }

    const teacherIds = unique(((teachers || []) as IdRow[]).map((row) => row.id || '').filter(Boolean));
    const visibleUserIds = unique([...resolvedAdminIds, ...teacherIds]);

    return {
      adminIds: resolvedAdminIds,
      teacherIds,
      visibleUserIds,
    };
  }

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

    const nextFrontier = ((data || []) as ManagedAdminRow[])
      .map((row) => row.child_admin_id || '')
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

  const teacherIds = unique(((managedTeachers || []) as ManagedTeacherRow[]).map((row) => row.teacher_id || '').filter(Boolean));
  const visibleUserIds = unique([...resolvedAdminIds, ...teacherIds]);

  return {
    adminIds: resolvedAdminIds,
    teacherIds,
    visibleUserIds,
  };
}
