'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const handleAuth = async () => {
      // Check for a ?next= param in the URL (e.g. ?next=/reset-password from password-reset emails)
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        // If the link came from a password reset email, go to reset-password, not the dashboard
        if (next === '/reset-password') {
          router.push('/reset-password');
          return;
        }

        const user = data.session.user;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          router.push('/admin');
        } else if (profile?.role === 'teacher') {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
    };

    handleAuth();
  }, [router]);

  return <p style={{ padding: 20, color: '#fff' }}>Setting up your account…</p>;
}