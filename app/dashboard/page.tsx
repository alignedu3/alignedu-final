import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main style={{ padding: '40px', color: 'white' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user.email}</p>
      <p>This is your dashboard page.</p>
    </main>
  );
}
