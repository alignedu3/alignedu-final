'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', data.user.id)
          .single();

        setProfile(profileData);
      }
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="site-header">
      <div className="logo">
        <span className="logo-align">Align</span>
        <span className="logo-edu">EDU</span>
      </div>

      <div style={{ position: 'relative' }}>
        {!user && (
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/login" className="login-button-top">
              Login
            </Link>
            <Link href="/book-demo" className="book-demo-btn">
              Book Demo
            </Link>
          </div>
        )}

        {user && (
          <div>
            <button
              onClick={() => setOpen(!open)}
              style={userBtn}
            >
              {profile?.name || 'User'} ▾
            </button>

            {open && (
              <div style={dropdown}>
                <Link href="/dashboard" style={dropdownItem}>
                  Dashboard
                </Link>

                {profile?.role === 'admin' && (
                  <Link href="/admin" style={dropdownItem}>
                    Admin
                  </Link>
                )}

                <button onClick={handleLogout} style={dropdownItem}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

const userBtn = {
  background: 'rgba(255,255,255,0.08)',
  color: '#fff',
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.2)',
  fontWeight: 600,
  cursor: 'pointer'
};

const dropdown = {
  position: 'absolute',
  right: 0,
  top: '110%',
  background: '#1f2937',
  borderRadius: 12,
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  minWidth: 160,
  overflow: 'hidden',
  zIndex: 1000
};

const dropdownItem = {
  display: 'block',
  width: '100%',
  padding: '12px 14px',
  color: '#fff',
  textDecoration: 'none',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer'
};
