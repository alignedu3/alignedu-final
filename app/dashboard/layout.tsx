import { redirect } from 'next/navigation';
import { attachSentryUser } from '@/lib/monitoring/sentryUser';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRetry, isInvalidSessionError } from '@/lib/supabase/authUser';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await getUserWithRetry(supabase);

  if (authError && !isInvalidSessionError(authError)) {
    throw new Error('Your session could not be verified right now. Please retry.');
  }

  if (!user) {
    redirect('/login');
  }

  attachSentryUser(user);

  return <div>{children}</div>;
}
