'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const handleAuth = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        const user = data.session.user;

        // 🔥 Get user role from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        // 🔥 Redirect based on role
        if (profile?.role === 'admin') {
          router.push('/admin');
        } else if (profile?.role === 'teacher') {
          router.push('/teacher');
        } else {
          // fallback (in case role is missing)
          router.push('/');
        }
      } else {
        router.push('/');
      }
    };

    handleAuth();
  }, [router]);

  return <p style={{ padding: 20 }}>Setting up your account...</p>;
}