'use client';

import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const hasAuthCode = params.has('code');
    const hasTokenPair = hashParams.has('access_token') && hashParams.has('refresh_token');
    const authType = hashParams.get('type') || params.get('type');
    const isInviteOrRecovery = authType === 'invite' || authType === 'recovery';

    if (hasAuthCode || hasTokenPair || isInviteOrRecovery) {
      const next = params.get('next') || '/reset-password';
      const callbackUrl = `/auth/handle-auth?next=${encodeURIComponent(next)}`;
      window.location.replace(`${callbackUrl}${window.location.hash || ''}`);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          email,
          password,
        }),
      }).finally(() => window.clearTimeout(timeoutId));

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setError(payload?.error || 'Something went wrong while logging in.');
        setLoading(false);
        return;
      }

      window.location.replace(payload?.destination || '/dashboard');
      return;
    } catch (err) {
      console.error(err);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Login is taking longer than expected. Please try again.');
      } else {
        setError('Unable to reach the login service. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <main style={mainContainer}>
      <div style={backgroundGlowOne} />
      <div style={backgroundGlowTwo} />

      <section style={loginContainer}>
        <div style={badge}>AlignEDU Access</div>

        <h1 style={heading}>Login to Your Account</h1>

        <p style={subheading}>
          Access your lesson analysis dashboard and continue turning instruction into measurable insight.
        </p>

        <form onSubmit={handleSubmit} style={formContainer}>
          <div style={inputGroup}>
            <label htmlFor="email" style={labelStyles}>
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyles}
            />
          </div>

          <div style={inputGroup}>
            <label htmlFor="password" style={labelStyles}>
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyles}
            />
          </div>

          {error ? <p style={errorText}>{error}</p> : null}
          <a href="/forgot-password" style={{display: "block", marginTop: "8px", color: "#7dd3fc", fontSize: "14px", textAlign: "left"}}>Forgot password?</a>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitBtn,
              opacity: loading ? 0.85 : 1,
              transform: isHovered && !loading ? 'translateY(-2px)' : 'translateY(0)',
              boxShadow:
                isHovered && !loading
                  ? '0 18px 36px rgba(249, 115, 22, 0.30)'
                  : '0 14px 30px rgba(249, 115, 22, 0.22)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

const mainContainer: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  padding: '24px',
  background:
    'radial-gradient(circle at top left, var(--surface-page-radial-a), transparent 28%), radial-gradient(circle at top right, var(--surface-page-radial-b), transparent 24%), var(--surface-page)',
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
  overflow: 'hidden',
};

const backgroundGlowOne: React.CSSProperties = {
  position: 'absolute',
  width: '340px',
  height: '340px',
  borderRadius: '999px',
  background: 'rgba(56, 189, 248, 0.10)',
  filter: 'blur(70px)',
  top: '8%',
  left: '8%',
  pointerEvents: 'none',
};

const backgroundGlowTwo: React.CSSProperties = {
  position: 'absolute',
  width: '320px',
  height: '320px',
  borderRadius: '999px',
  background: 'rgba(249, 115, 22, 0.10)',
  filter: 'blur(80px)',
  bottom: '10%',
  right: '10%',
  pointerEvents: 'none',
};

const loginContainer: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: '100%',
  maxWidth: '460px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  padding: '40px 32px',
  borderRadius: '24px',
  boxShadow: 'var(--shadow-card)',
  backdropFilter: 'blur(14px)',
  textAlign: 'center',
};

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 14px',
  borderRadius: '999px',
  background: 'rgba(56, 189, 248, 0.12)',
  color: '#7dd3fc',
  border: '1px solid rgba(56, 189, 248, 0.18)',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: '16px',
};

const heading: React.CSSProperties = {
  fontSize: '34px',
  fontWeight: 800,
  lineHeight: '1.05',
  letterSpacing: '-0.03em',
  color: 'var(--text-primary)',
  marginBottom: '14px',
};

const subheading: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.8',
  color: 'var(--text-secondary)',
  marginBottom: '28px',
};

const formContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
};

const inputGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
};

const labelStyles: React.CSSProperties = {
  fontSize: '14px',
  color: 'var(--text-primary)',
  fontWeight: 700,
  marginBottom: '8px',
};

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: '15px',
  border: '1px solid var(--border-strong)',
  borderRadius: '14px',
  background: 'var(--surface-input)',
  color: 'var(--text-primary)',
  outline: 'none',
};

const submitBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#ffffff',
  padding: '14px 20px',
  fontSize: '15px',
  borderRadius: '14px',
  border: 'none',
  fontWeight: 700,
  width: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  lineHeight: 1,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  marginTop: '6px',
};

const errorText: React.CSSProperties = {
  margin: 0,
  color: '#fca5a5',
  fontSize: '14px',
  textAlign: 'left',
};
