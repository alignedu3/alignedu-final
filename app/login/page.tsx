'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Email:', email, 'Password:', password);
    router.push('/analyze');
  };

  return (
    <main style={mainContainer}>
      <section style={loginContainer}>
        <h1 style={heading}>Login to Your Account</h1>
        <form onSubmit={handleSubmit} style={formContainer}>
          <div style={inputGroup}>
            <label htmlFor="email" style={labelStyles}>Email</label>
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
            <label htmlFor="password" style={labelStyles}>Password</label>
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

          <button type="submit" style={submitBtn}>Login</button>
        </form>
        <p style={footerText}>
          Don't have an account? <a href="/signup" style={signupLink}>Sign Up</a>
        </p>
      </section>
    </main>
  );
}

// Styles
const mainContainer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#f5f7fa',
  fontFamily: 'Roboto, Arial, sans-serif',
};

const loginContainer: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '40px',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  width: '100%',
  maxWidth: '400px',
  textAlign: 'center',
};

const heading: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: '600',
  color: '#1D4ED8',
  marginBottom: '16px',
};

const formContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const inputGroup: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};

const labelStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#1D4ED8',
  fontWeight: '500',
  marginBottom: '8px',
};

const inputStyles: React.CSSProperties = {
  padding: '12px',
  fontSize: '16px',
  border: '1px solid #ccc',
  borderRadius: '8px',
  width: '100%',
  marginBottom: '16px',
  outline: 'none',
  transition: 'border-color 0.3s ease',
};

const submitBtn: React.CSSProperties = {
  backgroundColor: '#38BDF8',
  color: 'white',
  padding: '12px 20px',
  fontSize: '16px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: '600',
  transition: 'background-color 0.3s ease, transform 0.2s ease',
};

submitBtn[':hover'] = {
  backgroundColor: '#0EA5E9',
  transform: 'translateY(-2px)',
};

const footerText: React.CSSProperties = {
  marginTop: '20px',
  fontSize: '14px',
  color: '#64748b',
};

const signupLink: React.CSSProperties = {
  color: '#38BDF8',
  textDecoration: 'none',
};
