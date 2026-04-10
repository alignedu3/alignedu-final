'use client';

import { useState } from 'react';

export default function InvitePage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!name || !email) return;

    setLoading(true);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        alert('Invite sent!');
        setName('');
        setEmail('');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    }

    setLoading(false);
  };

  return (
    <main style={page}>
      <div style={container}>
        <h1 style={heading}>Invite Users</h1>
        <p style={subheading}>
          Add a new teacher or admin to the platform.
        </p>

        <div style={card}>
          <input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={input}
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={input}
          />

          <button onClick={handleInvite} style={button} disabled={loading}>
            {loading ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </main>
  );
}

// styles
const page = {
  minHeight: '100vh',
  padding: '40px 24px',
  background:
    'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 30%), linear-gradient(180deg, #07111f 0%, #081120 100%)',
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

const container = {
  maxWidth: 600,
  margin: '0 auto',
};

const heading = {
  fontSize: 36,
  color: '#fff',
  marginBottom: 10,
};

const subheading = {
  color: '#94a3b8',
  marginBottom: 24,
};

const card = {
  background: '#1f2937',
  padding: 24,
  borderRadius: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
};

const input = {
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #374151',
  background: '#111827',
  color: '#fff',
};

const button = {
  background: '#f97316',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  fontWeight: 600,
  cursor: 'pointer',
};
