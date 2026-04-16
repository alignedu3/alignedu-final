'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Something went wrong while signing up.');
      setLoading(false);
    }
  };

  return (
    <main style={{ position:'relative', display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', padding:'24px', background:'linear-gradient(180deg, #07111f 0%, #081120 100%)', fontFamily:'Inter, Roboto, Arial, sans-serif', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:'340px', height:'340px', borderRadius:'999px', background:'rgba(56,189,248,0.10)', filter:'blur(70px)', top:'8%', left:'8%', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:'320px', height:'320px', borderRadius:'999px', background:'rgba(249,115,22,0.10)', filter:'blur(80px)', bottom:'10%', right:'10%', pointerEvents:'none' }} />
      <section style={{ position:'relative', zIndex:1, width:'100%', maxWidth:'460px', background:'rgba(15,23,42,0.86)', border:'1px solid rgba(148,163,184,0.16)', padding:'40px 32px', borderRadius:'24px', boxShadow:'0 24px 60px rgba(2,6,23,0.28)', backdropFilter:'blur(14px)', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'8px 14px', borderRadius:'999px', background:'rgba(56,189,248,0.12)', color:'#7dd3fc', border:'1px solid rgba(56,189,248,0.18)', fontSize:'12px', fontWeight:800, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'16px' }}>AlignEDU Access</div>
        <h1 style={{ fontSize:'34px', fontWeight:800, lineHeight:1.05, letterSpacing:'-0.03em', color:'#f8fafc', marginBottom:'14px' }}>Create Your Account</h1>
        <p style={{ fontSize:'15px', lineHeight:1.8, color:'#94a3b8', marginBottom:'28px' }}>Sign up to access your personalized lesson analysis and insights.</p>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', textAlign:'left' }}>
            <label htmlFor="email" style={{ fontSize:'14px', color:'#e5e7eb', fontWeight:700, marginBottom:'8px' }}>Email</label>
            <input type="email" id="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width:'100%', padding:'14px 16px', fontSize:'15px', border:'1px solid rgba(148,163,184,0.22)', borderRadius:'14px', background:'rgba(255,255,255,0.04)', color:'#f8fafc', outline:'none' }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', textAlign:'left' }}>
            <label htmlFor="password" style={{ fontSize:'14px', color:'#e5e7eb', fontWeight:700, marginBottom:'8px' }}>Password</label>
            <input type="password" id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width:'100%', padding:'14px 16px', fontSize:'15px', border:'1px solid rgba(148,163,184,0.22)', borderRadius:'14px', background:'rgba(255,255,255,0.04)', color:'#f8fafc', outline:'none' }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', textAlign:'left' }}>
            <label htmlFor="confirmPassword" style={{ fontSize:'14px', color:'#e5e7eb', fontWeight:700, marginBottom:'8px' }}>Confirm Password</label>
            <input type="password" id="confirmPassword" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width:'100%', padding:'14px 16px', fontSize:'15px', border:'1px solid rgba(148,163,184,0.22)', borderRadius:'14px', background:'rgba(255,255,255,0.04)', color:'#f8fafc', outline:'none' }} />
          </div>
          {error ? <p style={{ margin:0, color:'#fca5a5', fontSize:'14px', textAlign:'left' }}>{error}</p> : null}
          <button type="submit" disabled={loading} style={{ background:'linear-gradient(135deg, #f97316, #ea580c)', color:'#ffffff', padding:'14px 20px', fontSize:'15px', borderRadius:'14px', border:'none', fontWeight:700, marginTop:'6px', opacity:loading ? 0.85 : 1, cursor:loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
      </section>
    </main>
  );
}
