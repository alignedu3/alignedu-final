'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { fetchJsonWithTimeout } from '@/lib/fetchJsonWithTimeout';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const waitForSession = async (attempts = 10, delayMs = 250) => {
      for (let i = 0; i < attempts; i += 1) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return data.session;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return null;
    };

    const handleAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      const code = params.get('code');
      const queryType = params.get('type');

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = hashParams.get('type');
      const authType = hashType || queryType;

      // Supabase may return either a `code` query param or access/refresh tokens in URL hash.
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          router.replace('/login');
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error: setError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (setError) {
          console.error('Session set error:', setError);
          router.replace('/login');
          return;
        }
      }

      const session = await waitForSession();

      if (session) {
        const shouldGoToReset = next === '/reset-password' || authType === 'invite' || authType === 'recovery';
        if (shouldGoToReset) {
          window.sessionStorage.setItem('alignedu-password-recovery', '1');
          router.replace('/reset-password');
          return;
        }

        try {
          const { data: authData } = await fetchJsonWithTimeout<{
            profile?: { role?: string | null };
          }>('/api/auth/me', {
            credentials: 'include',
            cache: 'no-store',
            timeoutMs: 5000,
          });
          const role = authData?.profile?.role ?? null;

          if (role && ['admin', 'super_admin'].includes(role)) {
            router.replace('/admin');
          } else if (role === 'teacher') {
            router.replace('/dashboard');
          } else {
            router.replace(next || '/dashboard');
          }
        } catch (error) {
          console.error('Auth callback profile lookup failed:', error);
          router.replace(next || '/dashboard');
        }
      } else {
        // Invite/recovery links without an established session should return to login.
        router.replace('/login');
      }
    };

    handleAuth();
  }, [router]);

  return <p style={{ padding: 20, color: '#fff' }}>Setting up your account…</p>;
}
