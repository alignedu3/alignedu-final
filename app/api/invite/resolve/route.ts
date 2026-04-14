import { createClient } from '@supabase/supabase-js';
import { verifyInviteToken } from '@/lib/invite-link';

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ error: 'Invite token is required.' }), { status: 400 });
  }

  const payload = verifyInviteToken(token);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invite link is invalid.' }), { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(payload.userId);

  if (userError || !userResult.user) {
    console.error('Invite resolve user lookup error:', userError);
    return new Response(JSON.stringify({ error: 'Invite is no longer available.' }), { status: 404 });
  }

  const user = userResult.user;

  if ((user.email || '').toLowerCase() !== payload.email.toLowerCase()) {
    return new Response(JSON.stringify({ error: 'Invite email mismatch.' }), { status: 400 });
  }

  const alreadyAccepted = Boolean(user.email_confirmed_at || user.confirmed_at || user.last_sign_in_at);

  if (alreadyAccepted) {
    return new Response(JSON.stringify({ accepted: true, redirectTo: '/login' }), { status: 200 });
  }

  const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: payload.email,
  });

  if (inviteError || !inviteData.properties?.action_link) {
    console.error('Invite resolve generateLink error:', inviteError);
    return new Response(JSON.stringify({ error: 'Unable to refresh invite link.' }), { status: 500 });
  }

  return new Response(
    JSON.stringify({
      actionLink: inviteData.properties.action_link,
      role: payload.role,
      email: payload.email,
    }),
    { status: 200 }
  );
}