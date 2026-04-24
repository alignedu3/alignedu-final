import * as Sentry from "@sentry/nextjs";

export function attachSentryUser(user: any) {
  if (!user) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
  });

  Sentry.setTag("role", user.user_metadata?.role || "unknown");
}
