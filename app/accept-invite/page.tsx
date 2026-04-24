'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type InviteState =
  | { status: 'loading'; message: string }
  | { status: 'accepted'; message: string }
  | { status: 'error'; message: string };

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const [state, setState] = useState<InviteState>(() =>
    token
      ? {
          status: 'loading',
          message: 'Preparing your invitation…',
        }
      : {
          status: 'error',
          message: 'This invite link is missing required information.',
        }
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const resolveInvite = async () => {
      try {
        const res = await fetch('/api/invite/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setState({ status: 'error', message: data?.error || 'Unable to open this invite.' });
          return;
        }

        if (data.accepted) {
          setState({ status: 'accepted', message: 'This invite has already been accepted. Please log in to continue.' });
          return;
        }

        if (!data.actionLink) {
          setState({ status: 'error', message: 'Unable to refresh this invite link.' });
          return;
        }

        window.location.replace(data.actionLink);
      } catch (error) {
        console.error('Accept invite error:', error);
        setState({ status: 'error', message: 'Something went wrong while opening the invite.' });
      }
    };

    resolveInvite();
  }, [token]);

  return (
    <main style={mainStyle}>
      <section style={cardStyle}>
        <h1 style={headingStyle}>AlignEDU Invite</h1>
        <p style={messageStyle}>{state.message}</p>
        {state.status !== 'loading' ? (
          <a href="/login" style={linkStyle}>
            Go to Login
          </a>
        ) : null}
      </section>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<InvitePageShell message="Preparing your invitation…" href="/login" linkLabel="Go to Login" />}>
      <AcceptInviteContent />
    </Suspense>
  );
}

function InvitePageShell({ message, href, linkLabel }: { message: string; href: string; linkLabel: string }) {
  return (
    <main style={mainStyle}>
      <section style={cardStyle}>
        <h1 style={headingStyle}>AlignEDU Invite</h1>
        <p style={messageStyle}>{message}</p>
        <a href={href} style={linkStyle}>
          {linkLabel}
        </a>
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
