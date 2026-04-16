'use client';

import { useEffect, useState } from 'react';

type ResetState =
  | { status: 'loading'; message: string }
  | { status: 'error'; message: string };

export default function ResetAccessPage() {
  const [state, setState] = useState<ResetState>({
    status: 'loading',
    message: 'Preparing your password reset…',
  });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      setState({ status: 'error', message: 'This reset link is missing required information.' });
      return;
    }

    const resolveReset = async () => {
      try {
        const res = await fetch('/api/auth/resolve-reset-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok || !data.actionLink) {
          setState({ status: 'error', message: data?.error || 'Unable to open this reset link.' });
          return;
        }

        window.location.replace(data.actionLink);
      } catch (error) {
        console.error('Reset access error:', error);
        setState({ status: 'error', message: 'Something went wrong while opening the reset link.' });
      }
    };

    resolveReset();
  }, []);

  return (
    <main style={mainStyle}>
      <section style={cardStyle}>
        <h1 style={headingStyle}>AlignEDU Password Reset</h1>
        <p style={messageStyle}>{state.message}</p>
        {state.status === 'error' ? (
          <a href="/forgot-password" style={linkStyle}>
            Request a new reset email
          </a>
        ) : null}
      </section>
    </main>
  );
}

const mainStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'var(--surface-page)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '460px',
  padding: '36px 28px',
  borderRadius: '24px',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  boxShadow: 'var(--shadow-card)',
  textAlign: 'center',
};

const headingStyle: React.CSSProperties = {
  margin: '0 0 12px',
  color: 'var(--text-primary)',
  fontSize: '30px',
  fontWeight: 800,
};

const messageStyle: React.CSSProperties = {
  margin: 0,
  color: 'var(--text-secondary)',
  lineHeight: 1.7,
  fontSize: '15px',
};

const linkStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '20px',
  color: '#7dd3fc',
  fontWeight: 700,
};