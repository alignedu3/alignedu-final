import { createClient } from './supabase/server';

export async function ensureProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      role: 'teacher',
    });
  }

  return user;
}
