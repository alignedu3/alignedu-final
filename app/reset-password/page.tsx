'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Password set! You can now log in.');
      window.location.href = '/dashboard';
    }

    setLoading(false);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ color: '#fff' }}>Set Your Password</h1>

      <input
        type="password"
        placeholder="Enter new password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: 10, marginTop: 20 }}
      />

      <button onClick={handleReset} style={{ marginTop: 20 }}>
        {loading ? 'Saving...' : 'Set Password'}
      </button>
    </main>
  );
}
