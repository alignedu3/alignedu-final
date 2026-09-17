import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendInviteEmail } from '@/lib/email';
import { createHash } from 'node:crypto';
import { isOwnerEmail } from '@/lib/billing';

function jsonResponse(body: Record<string, unknown>, status: number) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
function isDuplicateUserError(message: string) { const normalized = message.toLowerCase(); return normalized.includes('already been registered') || normalized.includes('already registered'); }
function isAcceptedUser(user: { email_confirmed_at?: string | null; confirmed_at?: string | null; last_sign_in_at?: string | null }) { return Boolean(user.email_confirmed_at || user.confirmed_at || user.last_sign_in_at); }
function fp(value?: string) { return value ? createHash('sha256').update(value).digest('hex').slice(0, 10) : 'missing'; }

type InviteClient = { auth: { admin: { generateLink(input: { type: 'invite'; email: string }): Promise<{ data: { properties?: { action_link?: string | null } | null } | null; error: { message?: string | null } | null }> } } };
async function inviteLink(client: InviteClient, email: string) { const { data, error } = await client.auth.admin.generateLink({ type: 'invite', email }); if (error || !data?.properties?.action_link) throw new Error(error?.message || 'Unable to generate invite link.'); return data.properties.action_link; }

export async function POST(req: Request) {
  try {
    const { name, email, role } = await req.json();
    const normalizedName = String(name || '').trim(); const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !['teacher','admin'].includes(role)) return jsonResponse({ error: 'Valid name, email and role are required.' }, 400);
    const server = await createServerClient();
    const { data: { user: adminUser } } = await server.auth.getUser();
    if (!adminUser) return jsonResponse({ error: 'Not authenticated' }, 401);
    const { data: adminProfile } = await server.from('profiles').select('role,name,email').eq('id', adminUser.id).single();
    if (!['admin','super_admin'].includes(adminProfile?.role)) return jsonResponse({ error: 'Individual plans cannot add users.' }, 403);

    // Individual paid plans must never become inexpensive multi-user accounts. Only owner/super-admin
    // accounts or admins attached to a School/District entitlement can invite users.
    if (adminProfile?.role !== 'super_admin' && !isOwnerEmail(adminUser.email)) {
      const { data: entitlement } = await server.from('subscriptions').select('plan,status').eq('user_id', adminUser.id).maybeSingle();
      if (entitlement?.plan !== 'school' || !['active','trialing'].includes(entitlement.status)) return jsonResponse({ error: 'User invitations are available only to School/District administrators.' }, 403);
    }

    const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const safeRole = role === 'admin' ? 'admin' : 'teacher';
    let newUserId = '';
    const { data: authData, error: createError } = await service.auth.admin.createUser({ email: normalizedEmail, email_confirm: false, user_metadata: { name: normalizedName } });
    if (createError && isDuplicateUserError(createError.message)) {
      const { data: existing } = await service.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle();
      if (!existing?.id) return jsonResponse({ error: 'This email is already registered.' }, 409);
      const { data: existingAuth } = await service.auth.admin.getUserById(existing.id);
      if (existingAuth?.user && isAcceptedUser(existingAuth.user)) return jsonResponse({ error: 'This user already has an active account.' }, 409);
      newUserId = existing.id;
    } else if (createError || !authData.user) return jsonResponse({ error: createError?.message || 'Failed to create user.' }, 400);
    else newUserId = authData.user.id;

    const { error: profileError } = await service.from('profiles').upsert({ id: newUserId, name: normalizedName, email: normalizedEmail, role: safeRole }, { onConflict: 'id' });
    if (profileError) return jsonResponse({ error: 'Failed to create invited user profile.' }, 500);
    await service.from('managed_teachers').delete().eq('teacher_id', newUserId);
    await service.from('managed_admins').delete().eq('child_admin_id', newUserId);
    const linkResult = safeRole === 'teacher'
      ? await service.from('managed_teachers').insert({ admin_id: adminUser.id, teacher_id: newUserId })
      : await service.from('managed_admins').insert({ parent_admin_id: adminUser.id, child_admin_id: newUserId });
    if (linkResult.error) return jsonResponse({ error: 'Failed to link the invited user to this organization.' }, 500);

    try {
      const link = await inviteLink(service as unknown as InviteClient, normalizedEmail);
      const sent = await sendInviteEmail(normalizedEmail, normalizedName, safeRole, link);
      await service.from('subscription_events').insert({ user_id: adminUser.id, event_type: 'user_invited', payload: { invited_user_id: newUserId, invited_email: normalizedEmail, invited_name: normalizedName, invited_role: safeRole, invited_by: adminProfile?.name || adminUser.email || 'Administrator', invited_by_email: adminUser.email } });
      return jsonResponse({ success: true, inviteEmailId: sent.id }, 200);
    } catch (error) {
      console.error('Invite delivery error', error);
      return jsonResponse({ error: `Failed to send invite email. [resend_key_fp:${fp(process.env.RESEND_API_KEY)}]` }, 500);
    }
  } catch (error) { console.error('Invite route error:', error); return jsonResponse({ error: 'Something went wrong while sending the invite.' }, 500); }
}
