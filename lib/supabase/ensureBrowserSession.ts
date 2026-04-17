import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureBrowserSession(
  supabase: SupabaseClient,
  options?: { attempts?: number; delayMs?: number }
) {
  const attempts = options?.attempts ?? 3;
  const delayMs = options?.delayMs ?? 200;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return data.session;
    }

    try {
      const response = await fetch('/api/auth/bootstrap-session', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.session?.access_token && payload?.session?.refresh_token) {
          const { data: sessionData, error } = await supabase.auth.setSession({
            access_token: payload.session.access_token,
            refresh_token: payload.session.refresh_token,
          });

          if (!error && sessionData.session) {
            return sessionData.session;
          }
        }
      }
    } catch {
      // Retry below.
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return null;
}
