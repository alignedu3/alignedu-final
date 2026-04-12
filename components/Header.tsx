'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/app/context/ThemeContext';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('invalid refresh token') || message.includes('refresh token not found')) {
          await supabase.auth.signOut({ scope: 'local' });
        }
      }

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

  // ✅ close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleLogoClick = async () => {
    if (!user) {
      router.push('/');
      return;
    }
    // Always fetch the latest role to ensure accuracy
    const supabase = createClient();
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const userRole = profileData?.role || profile?.role;
    if (userRole === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <>
      <header className="site-header">
        {/* LOGO */}
        <div
          onClick={handleLogoClick}
          style={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          <div className="logo">
            <span className="logo-align">Align</span>
            <span className="logo-edu">EDU</span>
          </div>
        </div>

        {/* DESKTOP NAV */}
        <div
          ref={menuRef}
          className="header-desktop-nav"
          style={{ position: 'relative' }}
        >
          <button
            type="button"
            className="header-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="header-theme-icon" aria-hidden="true">{theme === 'dark' ? 'D' : 'L'}</span>
            <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>

          {!user && (
            <div className="header-guest-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/login" className="login-button-top">
                Login
              </Link>
              <a href="mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo." className="book-demo-btn">
                Book Demo
              </a>
            </div>
          )}

          {user && (
            <div className="header-user-menu">
              <button
                onClick={() => setOpen(!open)}
                style={userBtn}
                aria-expanded={open}
                aria-haspopup="menu"
              >
                <span>{profile?.name || 'User'}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {open && (
                <div style={dropdown} role="menu">
                  <Link
                    href="/dashboard"
                    style={dropdownItem}
                    onClick={() => setOpen(false)}
                  >
                    Teacher Dashboard
                  </Link>

                  {profile?.role === "admin" && (
                    <>
                      <Link
                        href="/admin"
                        style={dropdownItem}
                        onClick={() => setOpen(false)}
                      >
                        Admin Dashboard
                      </Link>

                      <Link
                        href="/admin/invite"
                        style={dropdownItem}
                        onClick={() => setOpen(false)}
                      >
                        Add User
                      </Link>
                    </>
                  )}

                  <Link
                    href="/reset-password"
                    style={dropdownItem}
                    onClick={() => setOpen(false)}
                  >
                    Change Password
                  </Link>

                  <button
                    onClick={handleLogout}
                    style={dropdownItem}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE HAMBURGER */}
        <button
          className="header-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          <span className={`hamburger-line ${mobileOpen ? 'open-top' : ''}`} />
          <span className={`hamburger-line ${mobileOpen ? 'open-mid' : ''}`} />
          <span className={`hamburger-line ${mobileOpen ? 'open-bot' : ''}`} />
        </button>
      </header>

      {/* MOBILE MENU DRAWER */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)}>
          <nav className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mobile-nav-link mobile-nav-theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>

            {!user && (
              <>
                <Link href="/" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                  Home
                </Link>
                <Link href="/login" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <a href="mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo." className="mobile-nav-link mobile-nav-link-accent" onClick={() => setMobileOpen(false)}>
                  Book Demo
                </a>
              </>
            )}

            {user && (
              <>
                <div className="mobile-nav-user">{profile?.name || 'User'}</div>
                <Link href="/dashboard" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                  Teacher Dashboard
                </Link>
                {profile?.role === "admin" && (
                  <>
                    <Link href="/admin" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Admin Dashboard
                    </Link>
                    <Link href="/admin/invite" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Add User
                    </Link>
                  </>
                )}
                <Link href="/reset-password" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                  Change Password
                </Link>
                <button className="mobile-nav-link mobile-nav-logout" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}

const userBtn: React.CSSProperties = {
  background: 'var(--surface-chip)',
  color: 'var(--text-primary)',
  padding: '10px 16px',
  borderRadius: 12,
  border: '1px solid var(--border-strong)',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6
};

const dropdown: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 10px)',
  background: 'var(--surface-card-solid)',
  borderRadius: 12,
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
  minWidth: 170,
  overflow: 'hidden',
  zIndex: 1000
};

const dropdownItem: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '12px 14px',
  color: 'var(--text-primary)',
  textDecoration: 'none',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 15,
};