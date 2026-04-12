'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function InvitePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'teacher' | 'admin'>('teacher');
  const [linkedAdminId, setLinkedAdminId] = useState('');
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load all admins and current user so the dropdown is populated
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentAdminId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'admin');

      if (data) {
        setAdmins(data);
        // Default to current admin
        const self = data.find(a => a.id === user?.id);
        if (self) setLinkedAdminId(self.id);
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
    if (role === 'teacher' && !linkedAdminId) {
      setError('Please select which admin this teacher will be linked to.');
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
          linkedAdminId: role === 'teacher' ? linkedAdminId : null,
        }),
      });

      const data = await res.json();

      if (data.error) {
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
        <h1 style={heading}>Invite User</h1>
        <p style={subheading}>Add a new teacher or admin to the platform.</p>

        <div style={card}>
          {/* Role selector */}
          <div style={fieldGroup}>
            <label style={label}>Role</label>
            <div style={roleToggleWrap}>
              {(['teacher', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    ...roleBtn,
                    background: role === r ? '#f97316' : 'var(--surface-chip)',
                    color: role === r ? '#fff' : 'var(--text-secondary)',
                    border: role === r ? '1px solid #f97316' : '1px solid var(--border-strong)',
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldGroup}>
            <label style={label}>Full Name</label>
            <input
              placeholder="e.g. Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={input}
            />
          </div>

          <div style={fieldGroup}>
            <label style={label}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. jane@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
            />
          </div>

          {/* Admin picker — only shown when inviting a teacher */}
          {role === 'teacher' && (
            <div style={fieldGroup}>
              <label style={label}>Link to Admin</label>
              <select
                value={linkedAdminId}
                onChange={(e) => setLinkedAdminId(e.target.value)}
                style={selectStyle}
              >
                <option value="">— Select an admin —</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}{a.id === currentAdminId ? ' (you)' : ''}
                  </option>
                ))}
              </select>
              <p style={hint}>This teacher will appear on the selected admin's dashboard.</p>
            </div>
          )}

          {error && <p style={errorStyle}>{error}</p>}
          {success && <p style={successStyle}>{success}</p>}

          <button onClick={handleInvite} style={button} disabled={loading}>
            {loading ? 'Sending invite…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  padding: '40px 20px',
  background:
    'radial-gradient(circle at top left, var(--surface-page-radial-a), transparent 30%), var(--surface-page)',
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

const container: React.CSSProperties = { maxWidth: 560, margin: '0 auto' };

const heading: React.CSSProperties = { fontSize: 32, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 800 };

const subheading: React.CSSProperties = { color: 'var(--text-secondary)', marginBottom: 28, fontSize: 15 };

const card: React.CSSProperties = {
  background: 'var(--bg-card)',
  padding: 28,
  borderRadius: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
};

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

const selectStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--surface-input)',
  color: 'var(--text-primary)',
  fontSize: 15,
  outline: 'none',
  width: '100%',
};

const roleToggleWrap: React.CSSProperties = { display: 'flex', gap: 10 };

const roleBtn: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
};

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
