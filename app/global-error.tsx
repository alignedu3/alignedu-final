'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={page}>
          <div style={shell}>
            <div style={badge}>Application Error</div>
            <h1 style={title}>Something went wrong</h1>
            <p style={message}>
              The app hit an unexpected issue. We’ve captured the error so it can be reviewed quickly.
            </p>
            <div style={actions}>
              <button onClick={reset} style={primaryButton}>
                Try Again
              </button>
              <button onClick={() => window.location.replace('/')} style={secondaryButton}>
                Go Home
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  background:
    'radial-gradient(circle at top left, rgba(37, 99, 235, 0.12), transparent 26%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 20%), linear-gradient(180deg, #f7fbff 0%, #edf4ff 100%)',
};

const shell: React.CSSProperties = {
  width: '100%',
  maxWidth: 560,
  padding: '32px 28px',
  borderRadius: 24,
  border: '1px solid rgba(15, 23, 42, 0.12)',
  background: 'rgba(255, 255, 255, 0.92)',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
  textAlign: 'center',
};

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  border: '1px solid rgba(248,113,113,0.28)',
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 16,
  color: '#f87171',
  background: 'rgba(239,68,68,0.12)',
};

const title: React.CSSProperties = {
  fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
  lineHeight: 1.1,
  letterSpacing: '-0.03em',
  color: '#0f172a',
  marginBottom: 12,
};

const message: React.CSSProperties = {
  color: '#475569',
  fontSize: 15,
  lineHeight: 1.7,
  maxWidth: 440,
  margin: '0 auto',
};

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginTop: 20,
};

const primaryButton: React.CSSProperties = {
  minHeight: 46,
  padding: '12px 20px',
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#fff',
  fontWeight: 700,
  boxShadow: '0 14px 30px rgba(249, 115, 22, 0.24)',
};

const secondaryButton: React.CSSProperties = {
  minHeight: 46,
  padding: '12px 20px',
  borderRadius: 14,
  border: '1px solid rgba(15, 23, 42, 0.12)',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 700,
};
