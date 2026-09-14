import { redirect } from 'next/navigation';
import { attachSentryUser } from '@/lib/monitoring/sentryUser';
import { createClient } from '@/lib/supabase/server';
import { getUserWithRetry, isInvalidSessionError } from '@/lib/supabase/authUser';

export default async function AdminLayout({
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
    return <div>{children}</div>;
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  attachSentryUser(user, profile?.role ?? null);

  return <div>{children}</div>;
}
