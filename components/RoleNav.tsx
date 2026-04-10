'use client';

import Link from 'next/link';

export default function RoleNav({ role }: { role: string }) {
  const linkStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div>
      <Link href="/dashboard" style={linkStyle}>
        Dashboard
      </Link>

      {role === 'admin' && (
        <>
          <Link href="/admin/dashboard" style={linkStyle}>
            Admin Dashboard
          </Link>

          <Link href="/admin/invite" style={linkStyle}>
            Invite Users
          </Link>
        </>
      )}
    </div>
  );
}
