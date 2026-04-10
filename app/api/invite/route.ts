import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { name, email } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Save to profiles
  await supabase.from('profiles').insert({
    name,
    email,
    role: 'teacher',
  });

  // Send invite email
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
  });
}
