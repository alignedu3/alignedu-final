import { redirect } from 'next/navigation';
import { attachSentryUser } from '@/lib/monitoring/sentryUser';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  attachSentryUser(user);

  return <div>{children}</div>;
}
