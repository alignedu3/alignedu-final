import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/auth/getUserRole';
import DashboardPage from './dashboard';

export default async function AdminPage() {
  const role = await getUserRole();

  if (role !== 'admin') {
    redirect('/dashboard');
  }

  return <DashboardPage />;
}