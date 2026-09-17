'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutSessionId = searchParams.get('checkout_session_id');

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const activateCheckout = async (sessionId: string) => {
    setActivating(true);
    setError('');
    const response = await fetch('/api/billing/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setActivating(false);
      if (response.status !== 401) setError(data.error || 'Your account was created, but the subscription could not be activated yet.');
      return false;
    }
    router.replace('/dashboard?billing=success');
    return true;
  };

  useEffect(() => {
    if (!checkoutSessionId) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) activateCheckout(checkoutSessionId);
    });
    return () => { cancelled = true; };
  }, [checkoutSessionId, supabase]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      setLoading(false);
      return;
    }

    const nextPath = checkoutSessionId
      ? `/signup?billing=success&checkout_session_id=${encodeURIComponent(checkoutSessionId)}`
      : '/dashboard';

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/handle-auth?next=${encodeURIComponent(nextPath)}` },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session && checkoutSessionId) {
        const activated = await activateCheckout(checkoutSessionId);
        if (activated) return;
      }

      if (data.session) {
        router.push('/dashboard');
        return;
      }

      setMessage(checkoutSessionId
        ? 'Account created. Check your email to confirm it, then AlignEDU will finish activating your paid plan.'
        : 'Account created. Check your email to confirm your account, then sign in.');
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Something went wrong while signing up.');
      setLoading(false);
    }
  };

  const loginHref = checkoutSessionId
    ? `/login?next=${encodeURIComponent(`/signup?billing=success&checkout_session_id=${checkoutSessionId}`)}`
    : '/login';

  return (
    <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:'28px 18px', background:'radial-gradient(circle at top left, rgba(59,130,246,.2), transparent 30%), linear-gradient(135deg,#071426,#0b1c33)', fontFamily:'Inter,Arial,sans-serif' }}>
      <section style={{ width:'100%', maxWidth:470, padding:'34px', borderRadius:24, background:'rgba(15,23,42,.92)', border:'1px solid rgba(148,163,184,.18)', boxShadow:'0 30px 80px rgba(2,6,23,.35)', color:'#fff' }}>
        <div style={{ color:'#5eead4', textTransform:'uppercase', letterSpacing:'.12em', fontWeight:800, fontSize:12, marginBottom:10 }}>{checkoutSessionId ? 'Complete your subscription' : 'AlignEDU access'}</div>
        <h1 style={{ margin:'0 0 10px', fontSize:34, letterSpacing:'-.035em' }}>{checkoutSessionId ? 'Create your AlignEDU account' : 'Create your account'}</h1>
        <p style={{ margin:'0 0 24px', color:'#cbd5e1', lineHeight:1.65 }}>{checkoutSessionId ? 'Your Stripe checkout is complete. Use the same email you used at checkout so we can securely attach your paid plan.' : 'Create an account to start using AlignEDU.'}</p>
        {activating ? <div style={{ padding:'13px 14px', borderRadius:12, background:'rgba(20,184,166,.12)', color:'#99f6e4', marginBottom:18, fontWeight:700 }}>Activating your subscription…</div> : null}
        <form onSubmit={handleSubmit} style={{ display:'grid', gap:16 }}>
          <label style={{ display:'grid', gap:7, fontWeight:700, fontSize:14 }}>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width:'100%', boxSizing:'border-box', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(148,163,184,.25)', background:'rgba(255,255,255,.05)', color:'#fff', fontSize:15 }} /></label>
          <label style={{ display:'grid', gap:7, fontWeight:700, fontSize:14 }}>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={{ width:'100%', boxSizing:'border-box', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(148,163,184,.25)', background:'rgba(255,255,255,.05)', color:'#fff', fontSize:15 }} /></label>
          <label style={{ display:'grid', gap:7, fontWeight:700, fontSize:14 }}>Confirm password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} style={{ width:'100%', boxSizing:'border-box', padding:'13px 14px', borderRadius:12, border:'1px solid rgba(148,163,184,.25)', background:'rgba(255,255,255,.05)', color:'#fff', fontSize:15 }} /></label>
          {error ? <p style={{ margin:0, color:'#fca5a5', fontSize:14 }}>{error}</p> : null}
          {message ? <p style={{ margin:0, color:'#99f6e4', fontSize:14, lineHeight:1.6 }}>{message}</p> : null}
          <button type="submit" disabled={loading || activating} style={{ border:0, borderRadius:12, padding:'14px 16px', background:'linear-gradient(135deg,#0f766e,#0e7490)', color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', opacity: loading || activating ? .7 : 1 }}>{loading ? 'Creating account…' : checkoutSessionId ? 'Create account & activate plan' : 'Create account'}</button>
        </form>
        <p style={{ margin:'20px 0 0', textAlign:'center', color:'#94a3b8', fontSize:14 }}>Already have an account? <Link href={loginHref} style={{ color:'#67e8f9', fontWeight:800, textDecoration:'none' }}>Sign in</Link></p>
      </section>
    </main>
  );
}
