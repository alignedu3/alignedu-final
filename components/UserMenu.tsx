'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UserMenu({ role }: { role: string }) {
  const [open, setOpen] = useState(false);

  const buttonStyle = {
    backgroundColor: '#1f2937',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 10,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer'
  };

  const menuStyle = {
    position: 'absolute' as const,
    right: 0,
    marginTop: 10,
    background: '#1f2937',
    borderRadius: 12,
    padding: 12,
    minWidth: 180,
    boxShadow: '0 12px 28px rgba(0,0,0,0.25)'
  };

  const itemStyle = {
    display: 'block',
    padding: '10px 12px',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: 8,
    marginBottom: 4
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={buttonStyle}>
        Menu
      </button>

      {open && (
        <div style={menuStyle}>
          <Link href="/dashboard" style={itemStyle}>Teacher Dashboard</Link>

          {role === 'admin' && (
            <>
              <Link href="/admin/dashboard" style={itemStyle}>Admin Dashboard</Link>
              <Link href="/admin/invite" style={itemStyle}>Add User</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
