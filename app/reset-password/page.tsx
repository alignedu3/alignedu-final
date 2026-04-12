'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isRefreshTokenError = (message: string) => {
    const text = message.toLowerCase();
    return text.includes('invalid refresh token') || text.includes('refresh token not found');
  };

  const handleReset = async () => {
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      if (isRefreshTokenError(updateError.message)) {
        await supabase.auth.signOut({ scope: 'local' });
        setError('Your session expired. Please log in again, then change your password.');
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    setSuccess('Password updated! Redirecting…');

    // Redirect to the correct dashboard based on role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setTimeout(() => {
        window.location.href = profile?.role === 'admin' ? '/admin' : '/dashboard';
      }, 1500);
    } else {
      setTimeout(() => { window.location.href = '/login'; }, 1500);
    }

    setLoading(false);
  };

  return (
    <main style={mainContainer}>
      <section style={card}>
        <h1 style={heading}>Reset Your Password</h1>
        <p style={subheading}>Enter and confirm your new password below.</p>

        <div style={formGroup}>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />
        </div>

        <div style={formGroup}>
          <label style={labelStyle}>Confirm Password</label>
          <input
            type="password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={input}
          />
        </div>

        {error && <p style={errorText}>{error}</p>}
        {success && <p style={successText}>{success}</p>}

        <button onClick={handleReset} disabled={loading} style={btn}>
          {loading ? 'Saving…' : 'Set New Password'}
        </button>

        <a href="/login" style={backLink}>Back to Login</a>
      </section>
    </main>
  );
}

const mainContainer: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', background: 'var(--surface-page)',
  fontFamily: 'Inter, Arial, sans-serif', padding: '24px',
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: '440px', background: 'var(--bg-card)',
  border: '1px solid var(--border)', padding: '40px 32px',
  borderRadius: '24px', boxShadow: 'var(--shadow-card)',
  backdropFilter: 'blur(14px)', display: 'flex', flexDirection: 'column', gap: '16px',
};
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 0 };
const subheading: React.CSSProperties = { fontSize: '15px', color: 'var(--text-secondary)', margin: 0 };
const formGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '6px' };
const labelStyle: React.CSSProperties = { color: 'var(--text-primary)', fontSize: '14px', fontWeight: 700 };
const input: React.CSSProperties = {
  width: '100%', padding: '14px 16px', fontSize: '15px',
  border: '1px solid var(--border-strong)', borderRadius: '14px',
  background: 'var(--surface-input)', color: 'var(--text-primary)', outline: 'none',
  boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff',
  padding: '14px', fontSize: '15px', borderRadius: '14px', border: 'none',
  fontWeight: 700, cursor: 'pointer', marginTop: '4px',
};
const errorText: React.CSSProperties = {
  color: '#fca5a5', fontSize: '14px', margin: 0,
  background: 'rgba(239,68,68,0.1)', padding: '10px 14px',
  borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)',
};
const successText: React.CSSProperties = {
  color: '#86efac', fontSize: '14px', margin: 0,
  background: 'rgba(34,197,94,0.1)', padding: '10px 14px',
  borderRadius: '8px', border: '1px solid rgba(34,197,94,0.2)',
};
const backLink: React.CSSProperties = { display: 'block', textAlign: 'center', color: '#7dd3fc', fontSize: '14px' };
