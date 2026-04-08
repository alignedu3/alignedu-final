import { createClient } from './supabase/server';

type EnsuredUser = {
  id: string;
  email: string | null;
};

export async function ensureProfile(): Promise<EnsuredUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('ensureProfile getUser error:', userError);
    return null;
  }

  if (!user) {
    return null;
  }

  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
    },
    {
      onConflict: 'id',
    }
  );

  if (profileError) {
    console.error('ensureProfile upsert error:', profileError);
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}
