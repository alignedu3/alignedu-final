'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('Your password has been updated successfully. You can now return to the dashboard or log in again.');
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
          Reset Password
        </div>

        <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
          Choose a new password
        </h1>

        <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#64748b', marginBottom: '24px' }}>
          Enter your new password below to finish resetting your account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              fontSize: '15px',
              outline: 'none',
            }}
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid #cbd5e1',
              fontSize: '15px',
              outline: 'none',
            }}
          />

          {error ? (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>{error}</p>
          ) : null}

          {success ? (
            <p style={{ margin: 0, color: '#16a34a', fontSize: '14px' }}>{success}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '14px 16px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <div style={{ marginTop: '18px' }}>
          <Link href="/login" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
