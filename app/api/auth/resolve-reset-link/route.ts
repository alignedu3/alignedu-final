import { createClient } from '@supabase/supabase-js';
import { verifyRecoveryToken } from '@/lib/invite-link';

export async function POST(req: Request) {
  const { token } = await req.json();

  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ error: 'Reset token is required.' }), { status: 400 });
  }

  const payload = verifyRecoveryToken(token);

  if (!payload) {
    return new Response(JSON.stringify({ error: 'Reset link is invalid.' }), { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: payload.email,
  });

  if (error || !data.properties?.action_link) {
    console.error('Reset resolve generateLink error:', error);
    return new Response(JSON.stringify({ error: 'Unable to refresh reset link.' }), { status: 500 });
  }

  return new Response(JSON.stringify({ actionLink: data.properties.action_link }), { status: 200 });
}