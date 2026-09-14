import type { SupabaseClient } from '@supabase/supabase-js';

type GetUserResult = Awaited<ReturnType<SupabaseClient['auth']['getUser']>>;

async function getUserWithTimeout(
  supabase: Pick<SupabaseClient, 'auth'>,
  timeoutMs = 2500
): Promise<GetUserResult> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      supabase.auth.getUser(),
      new Promise<GetUserResult>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({
            data: { user: null },
            error: Object.assign(new Error('Session verification timed out.'), {
              status: 503,
              code: 'auth_timeout',
            }),
          } as GetUserResult);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

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
  let result = await getUserWithTimeout(supabase);
  if (result.error && !isInvalidSessionError(result.error)) {
    result = await getUserWithTimeout(supabase);
  }
  return result;
}
