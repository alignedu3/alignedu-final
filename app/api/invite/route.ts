import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendInviteEmail } from '@/lib/email';
import { buildReusableInviteLink } from '@/lib/invite-link';

function getSiteUrl(req: Request) {
  const originHeader = req.headers.get('origin');
  if (originHeader && /^https?:\/\//i.test(originHeader)) {
    return originHeader.replace(/\/$/, '');
  }

  const refererHeader = req.headers.get('referer');
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin.replace(/\/$/, '');
    } catch {
      // Ignore malformed referer and continue to configured fallbacks.
    }
  }

  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'https://www.alignedu.net' ||
    'http://localhost:3000';

  return configured.replace(/\/$/, '');
}

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

  if (!['admin', 'super_admin'].includes(adminProfile?.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Service-role client for admin auth operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Create user without auto-sending email (we'll use Resend)
  const { data: authData, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { name },
  });

  if (createError || !authData.user) {
    return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), { status: 400 });
  }

  const newUserId = authData.user.id;

  const safeRole = role === 'admin' ? 'admin' : 'teacher';
  const inviteLink = buildReusableInviteLink(getSiteUrl(req), {
    userId: newUserId,
    email,
    name,
    role: safeRole,
  });

  // Send invite via Resend
  let inviteEmailId: string;
  try {
    const inviteEmail = await sendInviteEmail(email, name, safeRole, inviteLink);
    inviteEmailId = inviteEmail.id;
    console.log('Invite email queued via Resend', {
      inviteEmailId,
      to: email,
      role: safeRole,
    });
  } catch (emailError) {
    console.error('Failed to send invite email via Resend:', emailError);
    const detail = emailError instanceof Error ? emailError.message : 'Unknown email provider error';
    return new Response(JSON.stringify({ error: `Failed to send invite email: ${detail}` }), { status: 500 });
  }

  // Insert profile — enforce role explicitly.
  // Two-step: upsert to create if missing, then update to guarantee role is correct
  // even if a Supabase trigger already created the profile with a different default role.
  const { error: upsertError } = await supabase.from('profiles').upsert(
    { id: newUserId, name, email, role: safeRole },
    { onConflict: 'id' }
  );

  if (upsertError) {
    console.error('Profile upsert error:', upsertError.message);
  }

  // Force role via direct update — overrides any Supabase trigger defaults.
  const { error: roleUpdateError } = await supabase
    .from('profiles')
    .update({ role: safeRole, name, email })
    .eq('id', newUserId);

  if (roleUpdateError) {
    console.error('Profile role update error:', roleUpdateError.message);
  }

  // Verify what actually ended up in the DB and log it for diagnostics.
  const { data: verifyProfile, error: verifyError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', newUserId)
    .single();

  if (verifyError) {
    console.error('Profile verify error:', verifyError.message);
  } else {
    console.log('Profile role after invite:', { userId: newUserId, role: verifyProfile?.role, expected: safeRole });
    if (verifyProfile?.role !== safeRole) {
      // Trigger or policy overrode our update — try once more via RPC-style update.
      console.warn(`Role mismatch! Got ${verifyProfile?.role}, expected ${safeRole}. Forcing again...`);
      await supabase
        .from('profiles')
        .update({ role: safeRole })
        .eq('id', newUserId);
    }
  }

  // Link invited user to the inviting admin's scope.
  if (role === 'teacher') {
    const { error: linkError } = await supabase.from('managed_teachers').insert({
      admin_id: adminUser.id,
      teacher_id: newUserId,
    });

    if (linkError) {
      console.error('managed_teachers insert error:', linkError.message);
      // Don't fail — user was created; log the link failure
    }
  } else if (role === 'admin') {
    const { error: linkError } = await supabase.from('managed_admins').insert({
      parent_admin_id: adminUser.id,
      child_admin_id: newUserId,
    });

    if (linkError) {
      console.error('managed_admins insert error:', linkError.message);
      // Keep success so invite still sends even if hierarchy link fails.
    }
  }

  return new Response(JSON.stringify({ success: true, inviteEmailId }), { status: 200 });
}
