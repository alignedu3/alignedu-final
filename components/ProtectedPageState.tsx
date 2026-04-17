'use client';

import Link from 'next/link';

type ProtectedPageStateProps = {
  mode: 'loading' | 'error' | 'empty';
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function ProtectedPageState({
  mode,
  title,
  message,
  actionHref,
  actionLabel,
}: ProtectedPageStateProps) {
  const isLoading = mode === 'loading';

  return (
    <main style={page}>
      <div style={shell}>
        <div
          style={{
            ...badge,
            color: isLoading ? '#7dd3fc' : mode === 'error' ? '#fca5a5' : '#cbd5e1',
            borderColor: isLoading ? 'rgba(125,211,252,0.24)' : mode === 'error' ? 'rgba(252,165,165,0.24)' : 'rgba(203,213,225,0.24)',
            background: isLoading ? 'rgba(56,189,248,0.12)' : mode === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)',
          }}
        >
          {isLoading ? 'Loading' : mode === 'error' ? 'Something Went Wrong' : 'No Data Yet'}
        </div>
        <h1 style={titleStyle}>{title}</h1>
        <p style={messageStyle}>{message}</p>
        {actionHref && actionLabel ? (
          <Link href={actionHref} style={actionStyle}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  background:
    'radial-gradient(circle at top left, var(--surface-page-radial-a), transparent 26%), radial-gradient(circle at top right, var(--surface-page-radial-b), transparent 20%), var(--surface-page)',
};

const shell: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  padding: '32px 28px',
  borderRadius: 24,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  boxShadow: 'var(--shadow-card)',
  textAlign: 'center',
};

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  border: '1px solid transparent',
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
  lineHeight: 1.1,
  letterSpacing: '-0.03em',
  color: 'var(--text-primary)',
  marginBottom: 12,
};

const messageStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 15,
  lineHeight: 1.7,
  maxWidth: 440,
  margin: '0 auto',
};

const actionStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 20,
  minHeight: 46,
  padding: '12px 20px',
  borderRadius: 14,
  background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
  color: '#fff',
  fontWeight: 700,
  boxShadow: '0 14px 30px rgba(249, 115, 22, 0.24)',
};
