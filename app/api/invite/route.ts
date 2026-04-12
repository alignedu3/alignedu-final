import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { name, email, role } = await req.json();

  if (!name || !email || !role) {
    return new Response(JSON.stringify({ error: 'name, email, and role are required.' }), { status: 400 });
  }

  if (!['teacher', 'admin'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Invalid role.' }), { status: 400 });
  }

  // Verify the caller is authenticated
  const serverClient = await createServerClient();
  const { data: { user: adminUser } } = await serverClient.auth.getUser();

  if (!adminUser) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { data: adminProfile } = await serverClient
    .from('profiles')
    .select('role')
    .eq('id', adminUser.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Service-role client for admin auth operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Send invite email first so we get the new user's real UUID back
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://alignedu-final-e21pwk9tv-alignedu3s-projects.vercel.app/auth/handle-auth',
  });

  if (inviteError) {
    return new Response(JSON.stringify({ error: inviteError.message }), { status: 400 });
  }

  const newUserId = inviteData.user.id;

  // Insert profile with the correct role
  await supabase.from('profiles').upsert({
    id: newUserId,
    name,
    email,
    role,
  });

  // Only link to an admin when inviting a teacher
  if (role === 'teacher') {
    const { error: linkError } = await supabase.from('managed_teachers').insert({
      admin_id: adminUser.id,
      teacher_id: newUserId,
    });

    if (linkError) {
      console.error('managed_teachers insert error:', linkError.message);
      // Don't fail — user was created; log the link failure
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
