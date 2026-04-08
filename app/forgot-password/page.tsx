'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.alignedu.net/reset-password',
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email for a password reset link!');
    }
    setLoading(false);
  };

  return (
    <main style={mainContainer}>
      <section style={card}>
        <h1 style={heading}>Forgot Password</h1>
        <p style={subheading}>Enter your email and we'll send you a reset link.</p>
        <form onSubmit={handleSubmit} style={form}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={input}
          />
          {error && <p style={errorText}>{error}</p>}
          {message && <p style={successText}>{message}</p>}
          <button type="submit" disabled={loading} style={btn}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <a href="/login" style={backLink}>Back to Login</a>
      </section>
    </main>
  );
}

const mainContainer: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', background: 'linear-gradient(180deg, #07111f 0%, #081120 100%)',
  fontFamily: 'Inter, Arial, sans-serif', padding: '24px',
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: '440px', background: 'rgba(15, 23, 42, 0.86)',
  border: '1px solid rgba(148, 163, 184, 0.16)', padding: '40px 32px',
  borderRadius: '24px', boxShadow: '0 24px 60px rgba(2, 6, 23, 0.28)',
  backdropFilter: 'blur(14px)', textAlign: 'center',
};
const heading: React.CSSProperties = { fontSize: '28px', fontWeight: 800, color: '#f8fafc', marginBottom: '10px' };
const subheading: React.CSSProperties = { fontSize: '15px', color: '#94a3b8', marginBottom: '24px' };
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px' };
const input: React.CSSProperties = {
  width: '100%', padding: '14px 16px', fontSize: '15px',
  border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: '14px',
  background: 'rgba(255, 255, 255, 0.04)', color: '#f8fafc', outline: 'none',
};
const btn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff',
  padding: '14px', fontSize: '15px', borderRadius: '14px', border: 'none',
  fontWeight: 700, cursor: 'pointer',
};
const errorText: React.CSSProperties = { color: '#fca5a5', fontSize: '14px', margin: 0 };
const successText: React.CSSProperties = { color: '#86efac', fontSize: '14px', margin: 0 };
const backLink: React.CSSProperties = { display: 'block', marginTop: '20px', color: '#7dd3fc', fontSize: '14px' };
