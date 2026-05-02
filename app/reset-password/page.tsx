'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fetchJsonWithTimeout } from '@/lib/fetchJsonWithTimeout';

const PASSWORD_MIN_LENGTH = 8;

function getPasswordRequirementErrors(password: string) {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('one special character');
  }

  return errors;
}

export default function ResetPassword() {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Verify session is valid before showing the form
  useEffect(() => {
    const supabase = createClient();
    const recoveryMarkerKey = 'alignedu-password-recovery';

    const waitForSession = async (attempts = 10, delayMs = 250) => {
      for (let i = 0; i < attempts; i += 1) {
        const { data } = await supabase.auth.getSession();
        if (data.session) return data.session;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return null;
    };

    const checkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hasRecoveryMarker = window.sessionStorage.getItem(recoveryMarkerKey) === '1';
      const recoveryFlowActive = Boolean(code || (accessToken && refreshToken) || hasRecoveryMarker);

      if (code) {
        await supabase.auth.signOut({ scope: 'local' });
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('Reset code exchange error:', exchangeError);
        }
      } else if (accessToken && refreshToken) {
        await supabase.auth.signOut({ scope: 'local' });
        const { error: setError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (setError) {
          console.error('Reset session set error:', setError);
        }
      }

      const session = await waitForSession();

      if (!session) {
        window.sessionStorage.removeItem(recoveryMarkerKey);
        router.replace('/login');
        return;
      }

      setIsRecoverySession(recoveryFlowActive);
      setSessionReady(true);
      setCheckingSession(false);
    };

    checkSession();
  }, [router]);

  const isRefreshTokenError = (message: string) => {
    const text = message.toLowerCase();
    return text.includes('invalid refresh token') || text.includes('refresh token not found');
  };

  const getPasswordValidationMessage = () => {
    if (!isRecoverySession && !currentPassword.trim()) {
      return 'Enter your current password to change it while signed in.';
    }

    const requirementErrors = getPasswordRequirementErrors(password);

    if (requirementErrors.length > 0) {
      return `Your password must include ${requirementErrors.join(', ')}.`;
    }

    if (password !== confirm) {
      return 'Your confirmation password must exactly match your new password.';
    }

    return null;
  };

  const passwordRequirementErrors = getPasswordRequirementErrors(password);
  const passwordChecklist = [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleReset = async () => {
    setError('');
    setSuccess('');

    const validationMessage = getPasswordValidationMessage();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const updatePayload = isRecoverySession
      ? { password }
      : { password, currentPassword };

    const { error: updateError } = await supabase.auth.updateUser(updatePayload);

    if (updateError) {
      if (isRefreshTokenError(updateError.message)) {
        await supabase.auth.signOut({ scope: 'global' });
        window.sessionStorage.removeItem('alignedu-password-recovery');
        setError('Your session expired. Please log in again, then change your password.');
      } else if (isRecoverySession && updateError.message.toLowerCase().includes('current password required')) {
        setError('This reset link was not opened in a recovery session. Please use the password reset link from your email again.');
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    window.sessionStorage.removeItem('alignedu-password-recovery');
    setSuccess('Password updated! Redirecting…');

    // Redirect to the correct dashboard based on role
    try {
      const { data } = await fetchJsonWithTimeout<{
        user?: { id: string } | null;
        profile?: { role?: string | null } | null;
      }>('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        timeoutMs: 5000,
      });

      setTimeout(() => {
        const destination = ['admin', 'super_admin'].includes(data?.profile?.role || '') ? '/admin' : '/dashboard';
        router.push(data?.user ? destination : '/login');
      }, 1200);
    } catch {
      setTimeout(() => { router.push('/login'); }, 1200);
    }

    setLoading(false);
  };

  if (checkingSession || !sessionReady) {
    return (
      <main style={mainContainer}>
        <section style={card}>
          <p style={subheading}>Setting up your account…</p>
        </section>
      </main>
    );
  }

  return (
    <main style={mainContainer}>
      <section style={card}>
        <h1 style={heading}>Set Your Password</h1>
        <p style={subheading}>
          {isRecoverySession ? 'Create a secure password for your account.' : 'Choose a new password for your signed-in account.'}
        </p>

        {!isRecoverySession ? (
          <div style={formGroup}>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={input}
            />
          </div>
        ) : null}

        <div style={formGroup}>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            placeholder="Use 8+ characters, upper/lowercase, a number, and a symbol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              ...input,
              borderColor:
                password.length === 0
                  ? 'var(--border-strong)'
                  : passwordRequirementErrors.length === 0
                    ? 'rgba(34, 197, 94, 0.45)'
                    : 'rgba(249, 115, 22, 0.38)',
              boxShadow:
                password.length === 0
                  ? 'none'
                  : passwordRequirementErrors.length === 0
                    ? '0 0 0 4px rgba(34, 197, 94, 0.10)'
                    : '0 0 0 4px rgba(249, 115, 22, 0.08)',
            }}
          />
        </div>

        <div style={requirementsCard}>
          <div style={requirementsHeader}>
            <p style={requirementsEyebrow}>Password requirements</p>
            <p style={requirementsTitle}>At least 8 characters, uppercase, lowercase, number, and symbol.</p>
          </div>
          <div style={checklistGrid}>
            {passwordChecklist.map((item) => (
              <div
                key={item.label}
                style={{
                  ...checklistItem,
                  borderColor: item.met ? 'rgba(34, 197, 94, 0.22)' : 'rgba(148, 163, 184, 0.14)',
                  background: item.met ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <span
                  style={{
                    ...checkIcon,
                    background: item.met ? 'rgba(34, 197, 94, 0.16)' : 'rgba(148, 163, 184, 0.12)',
                    color: item.met ? '#86efac' : 'var(--text-secondary)',
                  }}
                >
                  {item.met ? '✓' : '•'}
                </span>
                <span
                  style={{
                    ...checklistLabel,
                    color: item.met ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <p style={requirementsHint}>Confirmation must match exactly.</p>
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
const requirementsCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(125, 211, 252, 0.10), rgba(15, 23, 42, 0.04))',
  border: '1px solid rgba(125, 211, 252, 0.16)',
  borderRadius: '16px',
  padding: '12px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
};
const requirementsHeader: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};
const requirementsEyebrow: React.CSSProperties = {
  margin: 0,
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  fontWeight: 800,
  color: '#7dd3fc',
};
const requirementsTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '12px',
  lineHeight: 1.5,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};
const checklistGrid: React.CSSProperties = {
  display: 'grid',
  gap: '6px',
};
const checklistItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '10px',
  border: '1px solid transparent',
};
const checkIcon: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '999px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 800,
  flexShrink: 0,
};
const checklistLabel: React.CSSProperties = {
  fontSize: '12px',
  lineHeight: 1.4,
};
const requirementsHint: React.CSSProperties = {
  margin: 0,
  fontSize: '11px',
  color: 'var(--text-secondary)',
  lineHeight: 1.5,
};
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
