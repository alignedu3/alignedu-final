'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/app/context/ThemeContext';
import type { ProfileRecord } from '@/lib/dashboardData';

type AuthUser = {
  id: string;
};

export default function Header() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const menuRef = useRef<HTMLDivElement | null>(null);
  const role = (profile?.role || '').toLowerCase();
  const isAdminUser = role === 'admin' || role === 'super_admin';

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const syncUserAndProfile = async () => {
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      const authData = await authResponse.json();
      const resolvedUser = authData.user ?? null;

      if (!isMounted) return;

      setUser(resolvedUser);

      if (!resolvedUser) {
        setProfile(null);
        setOpen(false);
        return;
      }

      if (!isMounted) return;
      setProfile(authData.profile ?? null);
    };

    const loadUser = async () => {
      await syncUserAndProfile();
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async () => {
        await syncUserAndProfile();
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname]);

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
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setOpen(false);
    setMobileOpen(false);
    setUser(null);
    setProfile(null);

    try {
      const supabase = createClient();
      await Promise.allSettled([
        supabase.auth.signOut({ scope: 'global' }),
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        }),
      ]);

      document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .filter((cookie) => cookie.startsWith('sb-'))
        .forEach((cookie) => {
          const separatorIndex = cookie.indexOf('=');
          const name = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie;
          document.cookie = `${name}=; Max-Age=0; path=/`;
        });

      try {
        Object.keys(window.localStorage)
          .filter((key) => key.startsWith('sb-') || key.includes('auth-token'))
          .forEach((key) => window.localStorage.removeItem(key));

        Object.keys(window.sessionStorage)
          .filter((key) => key.startsWith('sb-') || key.includes('auth-token'))
          .forEach((key) => window.sessionStorage.removeItem(key));
      } catch {
        // Ignore storage access issues in restricted browser contexts.
      }
    } catch (error) {
      console.error('Logout failed, forcing local reset:', error);
    } finally {
      router.replace('/');
      router.refresh();

      // Force a final hard navigation so mobile browsers never get stuck in stale auth UI.
      window.location.assign('/');
    }
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
    const userRole = (profileData?.role || profile?.role || '').toLowerCase();
    if (userRole === 'admin' || userRole === 'super_admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const handleGuestHomeClick = () => {
    setMobileOpen(false);

    if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    router.push('/');
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

                  {isAdminUser && (
                    <>
                      <Link
                        href="/admin"
                        style={dropdownItem}
                        onClick={() => setOpen(false)}
                      >
                        Admin Dashboard
                      </Link>

                      <Link
                        href="/admin/observe"
                        style={dropdownItem}
                        onClick={() => setOpen(false)}
                      >
                        Observe Lesson
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
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
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
                <button type="button" className="mobile-nav-link" onClick={handleGuestHomeClick}>
                  Home
                </button>
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
                {isAdminUser && (
                  <>
                    <Link href="/admin" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Admin Dashboard
                    </Link>
                    <Link href="/admin/observe" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Observe Lesson
                    </Link>
                    <Link href="/admin/invite" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                      Add User
                    </Link>
                  </>
                )}
                <Link href="/reset-password" className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
                  Change Password
                </Link>
                <button
                  type="button"
                  className="mobile-nav-link mobile-nav-logout"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
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