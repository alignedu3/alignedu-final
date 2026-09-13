import type { SupabaseClient } from '@supabase/supabase-js';

export function isInvalidSessionError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const typed = error as { status?: unknown; code?: unknown; message?: unknown };
  const status = Number(typed.status);
  const code = String(typed.code || '').toLowerCase();
  const message = String(typed.message || '').toLowerCase();

  return status === 401 ||
    code.includes('session_not_found') ||
    code.includes('bad_jwt') ||
    message.includes('auth session missing') ||
    message.includes('invalid jwt') ||
    message.includes('jwt expired') ||
    message.includes('refresh token not found');
}

export async function getUserWithRetry(supabase: Pick<SupabaseClient, 'auth'>) {
  let result = await supabase.auth.getUser();
  if (result.error && !isInvalidSessionError(result.error)) {
    result = await supabase.auth.getUser();
  }
  return result;
}
