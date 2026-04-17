'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import ProtectedPageState from '@/components/ProtectedPageState';

export default function AdminError({
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
    <div style={{ padding: '20px' }}>
      <ProtectedPageState
        mode="error"
        title="Admin workspace unavailable"
        message="An unexpected error interrupted this admin view. You can retry the page or return to the dashboard."
        actionHref="/admin"
        actionLabel="Return to Admin Dashboard"
      />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: -120 }}>
        <button onClick={reset} style={button}>
          Try Again
        </button>
      </div>
    </div>
  );
}

const button: React.CSSProperties = {
  minHeight: 44,
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid rgba(15, 23, 42, 0.12)',
  background: '#fff',
  color: '#0f172a',
  fontWeight: 700,
};
