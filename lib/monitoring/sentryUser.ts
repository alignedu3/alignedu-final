import * as Sentry from '@sentry/nextjs';
import type { User } from '@supabase/supabase-js';

type SentryUserLike = Pick<User, 'id' | 'email' | 'user_metadata'> | null;

export function attachSentryUser(user: SentryUserLike, role?: string | null) {
  if (!user) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email ?? undefined,
  });

  const resolvedRole =
    typeof role === 'string' && role.length > 0
      ? role
      : typeof user.user_metadata?.role === 'string'
        ? user.user_metadata.role
        : null;

  if (resolvedRole) {
    Sentry.setTag('role', resolvedRole);
  }
}
