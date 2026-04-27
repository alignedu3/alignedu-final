import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendInviteEmail } from '@/lib/email';

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function getInviteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('RESEND_API_KEY')) {
    return 'Invite email delivery is not configured yet. Add RESEND_API_KEY to the deployment and redeploy.';
  }

  if (message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    return 'Invite creation is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to the deployment and redeploy.';
  }

  return 'Something went wrong while sending the invite.';
}

function isDuplicateUserError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('already been registered') || normalized.includes('already registered');
}

function isAcceptedUser(user: { email_confirmed_at?: string | null; confirmed_at?: string | null; last_sign_in_at?: string | null }) {
  return Boolean(user.email_confirmed_at || user.confirmed_at || user.last_sign_in_at);
}

type InviteLinkCapableClient = {
  auth: {
    admin: {
      generateLink(input: {
        type: 'invite';
        email: string;
      }): Promise<{
        data: {
          properties?: {
            action_link?: string | null;
          } | null;
        } | null;
        error: {
          message?: string | null;
        } | null;
      }>;
    };
  };
};

async function generateSupabaseInviteLink(supabase: InviteLinkCapableClient, email: string) {
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
  });

  if (inviteError || !inviteData?.properties?.action_link) {
    throw new Error(inviteError?.message || 'Unable to generate invite link.');
  }

  return inviteData.properties.action_link;
}

export async function POST(req: Request) {
  try {
    const { name, email, role } = await req.json();
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedName || !normalizedEmail || !role) {
      return jsonResponse({ error: 'name, email, and role are required.' }, 400);
    }

    if (!['teacher', 'admin'].includes(role)) {
      return jsonResponse({ error: 'Invalid role.' }, 400);
    }

    const serverClient = await createServerClient();
    const {
      data: { user: adminUser },
    } = await serverClient.auth.getUser();

    if (!adminUser) {
      return jsonResponse({ error: 'Not authenticated' }, 401);
    }

    const { data: adminProfile } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (!['admin', 'super_admin'].includes(adminProfile?.role)) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const safeRole = role === 'admin' ? 'admin' : 'teacher';

    const sendInviteForExistingUser = async (existingRole: 'teacher' | 'admin', existingName: string) => {
      const inviteLink = await generateSupabaseInviteLink(supabase, normalizedEmail);
      const inviteEmail = await sendInviteEmail(normalizedEmail, existingName, existingRole, inviteLink);
      console.log('Invite email re-sent via Resend', {
        inviteEmailId: inviteEmail.id,
        to: normalizedEmail,
        role: existingRole,
      });

      return inviteEmail;
    };

    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: false,
      user_metadata: { name: normalizedName },
    });

    if (createError && isDuplicateUserError(createError.message)) {
      const { data: existingProfile, error: existingProfileError } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingProfileError) {
        console.error('Existing invite profile lookup error:', existingProfileError.message);
        return jsonResponse({ error: 'This email is already registered, but the existing invite could not be looked up.' }, 500);
      }

      if (!existingProfile?.id) {
        return jsonResponse(
          { error: 'This email is already registered. Ask the user to log in or use password reset instead of sending a new invite.' },
          409
        );
      }

      const { data: existingUserResult, error: existingUserError } = await supabase.auth.admin.getUserById(existingProfile.id);

      if (existingUserError || !existingUserResult.user) {
        console.error('Existing invite auth lookup error:', existingUserError);
        return jsonResponse({ error: 'This email is already registered, but the auth record could not be loaded.' }, 500);
      }

      if (isAcceptedUser(existingUserResult.user)) {
        return jsonResponse(
          { error: 'This user already has an active account. Ask them to log in or use password reset instead of re-inviting.' },
          409
        );
      }

      const existingRole = existingProfile.role === 'admin' ? 'admin' : 'teacher';
      const existingName = String(existingProfile.name || normalizedName || normalizedEmail).trim();

      try {
        const resentInvite = await sendInviteForExistingUser(existingRole, existingName);
        return jsonResponse({ success: true, inviteEmailId: resentInvite.id, resent: true }, 200);
      } catch (emailError) {
        console.error('Failed to re-send invite email via Resend:', emailError);
        const detail = emailError instanceof Error ? emailError.message : 'Unknown email provider error';
        return jsonResponse({ error: `Failed to send invite email: ${detail}` }, 500);
      }
    }

    if (createError || !authData.user) {
      return jsonResponse({ error: createError?.message || 'Failed to create user' }, 400);
    }

    const newUserId = authData.user.id;

    const rollbackInviteCreation = async () => {
      await supabase.from('managed_teachers').delete().eq('teacher_id', newUserId);
      await supabase.from('managed_teachers').delete().eq('admin_id', newUserId);
      await supabase.from('managed_admins').delete().eq('child_admin_id', newUserId);
      await supabase.from('managed_admins').delete().eq('parent_admin_id', newUserId);
      await supabase.from('profiles').delete().eq('id', newUserId);
      await supabase.auth.admin.deleteUser(newUserId);
    };

    const { error: upsertError } = await supabase.from('profiles').upsert(
      { id: newUserId, name: normalizedName, email: normalizedEmail, role: safeRole },
      { onConflict: 'id' }
    );

    if (upsertError) {
      console.error('Profile upsert error:', upsertError.message);
      await rollbackInviteCreation();
      return jsonResponse({ error: 'Failed to create the invited user profile.' }, 500);
    }

    const { error: roleUpdateError } = await supabase
      .from('profiles')
      .update({ role: safeRole, name: normalizedName, email: normalizedEmail })
      .eq('id', newUserId);

    if (roleUpdateError) {
      console.error('Profile role update error:', roleUpdateError.message);
      await rollbackInviteCreation();
      return jsonResponse({ error: 'Failed to finalize the invited user profile.' }, 500);
    }

    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', newUserId)
      .single();

    if (verifyError) {
      console.error('Profile verify error:', verifyError.message);
      await rollbackInviteCreation();
      return jsonResponse({ error: 'Failed to verify the invited user profile.' }, 500);
    }

    console.log('Profile role after invite:', { userId: newUserId, role: verifyProfile?.role, expected: safeRole });
    if (verifyProfile?.role !== safeRole) {
      console.warn(`Role mismatch! Got ${verifyProfile?.role}, expected ${safeRole}. Forcing again...`);
      const { error: retryRoleError } = await supabase.from('profiles').update({ role: safeRole }).eq('id', newUserId);

      if (retryRoleError) {
        console.error('Profile role retry error:', retryRoleError.message);
        await rollbackInviteCreation();
        return jsonResponse({ error: 'Failed to finalize the invited user role.' }, 500);
      }
    }

    if (safeRole === 'teacher') {
      const { error: linkError } = await supabase.from('managed_teachers').insert({
        admin_id: adminUser.id,
        teacher_id: newUserId,
      });

      if (linkError) {
        console.error('managed_teachers insert error:', linkError.message);
        await rollbackInviteCreation();
        return jsonResponse({ error: 'Failed to link the invited teacher to this admin.' }, 500);
      }
    } else {
      const { error: linkError } = await supabase.from('managed_admins').insert({
        parent_admin_id: adminUser.id,
        child_admin_id: newUserId,
      });

      if (linkError) {
        console.error('managed_admins insert error:', linkError.message);
        await rollbackInviteCreation();
        return jsonResponse({ error: 'Failed to link the invited admin to this hierarchy.' }, 500);
      }
    }

    try {
      const inviteLink = await generateSupabaseInviteLink(supabase, normalizedEmail);
      const inviteEmail = await sendInviteEmail(normalizedEmail, normalizedName, safeRole, inviteLink);
      console.log('Invite email queued via Resend', {
        inviteEmailId: inviteEmail.id,
        to: normalizedEmail,
        role: safeRole,
      });

      return jsonResponse({ success: true, inviteEmailId: inviteEmail.id }, 200);
    } catch (emailError) {
      console.error('Failed to send invite email via Resend:', emailError);
      await rollbackInviteCreation();
      const detail = emailError instanceof Error ? emailError.message : 'Unknown email provider error';
      return jsonResponse({ error: `Failed to send invite email: ${detail}` }, 500);
    }
  } catch (error) {
    console.error('Invite route error:', error);
    return jsonResponse({ error: getInviteErrorMessage(error) }, 500);
  }
}
