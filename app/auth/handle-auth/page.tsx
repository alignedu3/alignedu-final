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
        // user is authenticated via invite
        router.push('/reset-password');
      } else {
        router.push('/');
      }
    };

    handleAuth();
  }, [router]);

  return <p style={{ padding: 20 }}>Setting up your account...</p>;
}
