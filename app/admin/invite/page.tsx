'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'teacher' | 'admin'>('teacher');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Confirm the current admin has a local session before showing invite actions.
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        setError('Your session expired. Please log in again.');
      }
    };
    load();
  }, []);

  const handleInvite = async () => {
    setError('');
    setSuccess('');
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof data?.error === 'string'
            ? data.error
            : 'The invite request failed before the server returned details. Please try again.'
        );
      } else if (data?.error) {
        setError(data.error);
      } else {
        setSuccess(`Invite sent to ${email}!`);
        setName('');
        setEmail('');
        setRole('teacher');
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <main style={page}>
      <div style={container}>
        <header style={hero}>
          <div>
            <div style={eyebrow}>Team Management</div>
            <h1 style={heading}>Add a User</h1>
            <p style={subheading}>Invite a teacher or administrator and place them into the right workflow from day one.</p>
          </div>
          <Link href="/admin" style={backButton}>Back to Administrator Dashboard</Link>
        </header>

        <form style={card} onSubmit={(event) => { event.preventDefault(); void handleInvite(); }}>
          <div>
            <div style={sectionEyebrow}>Invitation Details</div>
            <h2 style={cardHeading}>Who are you adding?</h2>
            <p style={cardIntro}>They will receive a secure email invitation to create their account.</p>
          </div>
          {/* Role selector */}
          <div style={fieldGroup}>
            <label style={label}>Choose a role</label>
            <div style={roleToggleWrap}>
              {(['teacher', 'admin'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    ...roleBtn,
                    background: role === r ? 'rgba(249,115,22,0.12)' : 'var(--surface-chip)',
                    color: role === r ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: role === r ? '1px solid #f97316' : '1px solid var(--border-strong)',
                  }}
                >
                  <span style={roleIcon}>{r === 'teacher' ? 'T' : 'A'}</span>
                  <span style={{ textAlign: 'left' }}>
                    <strong style={roleTitle}>{r.charAt(0).toUpperCase() + r.slice(1)}</strong>
                    <small style={roleDescription}>{r === 'teacher' ? 'Analyze lessons and review personal growth' : 'Observe, coach, and manage assigned teachers'}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={roleContextCard}>
            <span style={roleContextIcon}>{role === 'teacher' ? 'T' : 'A'}</span>
            <div>
              <strong style={roleContextTitle}>
                {role === 'teacher' ? 'Adding a teacher' : 'Adding an administrator'}
              </strong>
              <p style={roleContextText}>
                {role === 'teacher'
                  ? 'This teacher will receive a personal lesson-analysis dashboard and will automatically appear within your coaching scope.'
                  : 'This administrator will receive observation and team-management tools. You can assign teachers within the administrator hierarchy after they join.'}
              </p>
            </div>
          </div>

          <div style={fieldGroup}>
            <label htmlFor="invite-full-name" style={label}>Full Name</label>
            <input
              id="invite-full-name"
              autoComplete="name"
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
            />
          </div>

          <div style={fieldGroup}>
            <label htmlFor="invite-email" style={label}>Email Address</label>
            <input
              id="invite-email"
              type="email"
              autoComplete="email"
              placeholder="e.g. jane@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
          </div>

          {role === 'teacher' && (
            <p style={hint}>Teachers invited here are automatically linked to your admin dashboard.</p>
          )}

          {error && <p style={errorStyle}>{error}</p>}
          {success && <p style={successStyle}>{success}</p>}

          <button type="submit" style={{ ...button, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Sending invite…' : 'Send Invite'}
          </button>
        </form>
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  padding: '32px 20px 56px',
  background: 'linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)',
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

const container: React.CSSProperties = { maxWidth: 820, margin: '0 auto' };

const hero: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 20, padding: 'clamp(24px, 4vw, 38px)', borderRadius: 28, border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--surface-card-solid) 0%, var(--bg-tertiary) 100%)', boxShadow: 'var(--shadow-card)' };
const eyebrow: React.CSSProperties = { color: '#ea580c', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, marginBottom: 8 };
const backButton: React.CSSProperties = { color: 'var(--text-primary)', background: 'var(--surface-card-solid)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '11px 16px', textDecoration: 'none', fontSize: 13, fontWeight: 700 };

const heading: React.CSSProperties = { fontSize: 'clamp(2rem, 4vw, 2.8rem)', lineHeight: 1.05, color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 800 };

const subheading: React.CSSProperties = { color: 'var(--text-secondary)', margin: 0, maxWidth: 690, lineHeight: 1.6, fontSize: 16 };

const card: React.CSSProperties = {
  background: 'var(--surface-card-solid)',
  padding: 28,
  borderRadius: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
};

const sectionEyebrow: React.CSSProperties = { color: '#ea580c', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 800, marginBottom: 7 };
const cardHeading: React.CSSProperties = { color: 'var(--text-primary)', margin: '0 0 6px', fontSize: 23 };
const cardIntro: React.CSSProperties = { color: 'var(--text-secondary)', margin: 0, fontSize: 14, lineHeight: 1.55 };

const fieldGroup: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

const label: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 };

const hint: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12, margin: 0 };

const input: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-input)',
  color: 'var(--text-primary)',
  fontSize: 15,
  outline: 'none',
};

const roleToggleWrap: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 };

const roleBtn: React.CSSProperties = {
  flex: 1,
  padding: '13px',
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const roleIcon: React.CSSProperties = { display: 'grid', placeItems: 'center', flex: '0 0 34px', width: 34, height: 34, borderRadius: 11, background: 'rgba(249,115,22,0.14)', color: '#ea580c', fontWeight: 800 };
const roleTitle: React.CSSProperties = { display: 'block', fontSize: 14, marginBottom: 2 };
const roleDescription: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500, lineHeight: 1.35 };
const roleContextCard: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 16, border: '1px solid rgba(249,115,22,0.22)', background: 'rgba(249,115,22,0.07)' };
const roleContextIcon: React.CSSProperties = { display: 'grid', placeItems: 'center', flex: '0 0 36px', width: 36, height: 36, borderRadius: 12, background: 'rgba(249,115,22,0.16)', color: '#ea580c', fontWeight: 800 };
const roleContextTitle: React.CSSProperties = { display: 'block', color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 };
const roleContextText: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.55, margin: 0 };

const button: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#fff',
  padding: '13px',
  borderRadius: 10,
  border: 'none',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
  marginTop: 4,
};


const errorStyle: React.CSSProperties = {
  color: '#fca5a5',
  fontSize: 14,
  background: 'rgba(239,68,68,0.1)',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(239,68,68,0.2)',
  margin: 0,
};

const successStyle: React.CSSProperties = {
  color: '#86efac',
  fontSize: 14,
  background: 'rgba(34,197,94,0.1)',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(34,197,94,0.2)',
  margin: 0,
};
