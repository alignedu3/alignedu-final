'use client';

import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('./dashboard'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      Loading admin dashboard...
    </div>
  ),
});

export default function AdminPage() {
  return <AdminDashboard />;
}
