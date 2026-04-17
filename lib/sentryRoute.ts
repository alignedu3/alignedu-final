import * as Sentry from '@sentry/nextjs';

type RouteUserContext = {
  id?: string | null;
  email?: string | null;
  role?: string | null;
};

type CaptureRouteExceptionOptions = {
  route: string;
  stage?: string;
  user?: RouteUserContext | null;
  extra?: Record<string, unknown>;
  level?: 'error' | 'warning' | 'info';
};

export function captureRouteException(
  error: unknown,
  { route, stage, user, extra, level = 'error' }: CaptureRouteExceptionOptions
) {
  Sentry.captureException(error, {
    level,
    tags: {
      route,
      ...(stage ? { stage } : {}),
      ...(user?.role ? { app_role: user.role } : {}),
    },
    user: user?.id || user?.email
      ? {
          id: user.id ?? undefined,
          email: user.email ?? undefined,
        }
      : undefined,
    extra,
  });
}
