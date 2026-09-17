'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

type SignUpPageProps = {
  checkoutSessionId?: string | null;
};

export default function SignUpPage({ checkoutSessionId = null }: SignUpPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const router = useRouter();

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
    <main className="signup-page">
      <section className="signup-card">
        <div className="signup-eyebrow">{checkoutSessionId ? 'Complete your subscription' : 'AlignEDU access'}</div>
        <h1>{checkoutSessionId ? 'Create your AlignEDU account' : 'Create your account'}</h1>
        <p className="signup-copy">{checkoutSessionId ? 'Your Stripe checkout is complete. Use the same email you used at checkout so we can securely attach your paid plan.' : 'Create an account to start using AlignEDU.'}</p>
        {activating ? <div className="status-box">Activating your subscription…</div> : null}

        <form onSubmit={handleSubmit}>
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
          <label>Confirm password<input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></label>
          {error ? <p className="error-text">{error}</p> : null}
          {message ? <p className="success-text">{message}</p> : null}
          <button type="submit" disabled={loading || activating}>{loading ? 'Creating account…' : checkoutSessionId ? 'Create account & activate plan' : 'Create account'}</button>
        </form>

        <p className="login-row">Already have an account? <Link href={loginHref}>Sign in</Link></p>
      </section>

      <style jsx>{`
        .signup-page{min-height:100svh;display:grid;place-items:center;padding:32px 18px;background:radial-gradient(circle at top left,rgba(59,130,246,.22),transparent 30%),radial-gradient(circle at bottom right,rgba(20,184,166,.14),transparent 28%),linear-gradient(135deg,#071426,#0b1c33);font-family:Inter,Arial,sans-serif;box-sizing:border-box}
        .signup-card{width:100%;max-width:470px;box-sizing:border-box;padding:34px;border-radius:26px;background:rgba(15,23,42,.9);border:1px solid rgba(148,163,184,.18);box-shadow:0 30px 80px rgba(2,6,23,.36),inset 0 1px 0 rgba(255,255,255,.05);backdrop-filter:blur(16px);color:#fff}
        .signup-eyebrow{display:inline-flex;padding:7px 11px;border-radius:999px;background:rgba(20,184,166,.11);border:1px solid rgba(94,234,212,.14);color:#5eead4;text-transform:uppercase;letter-spacing:.12em;font-weight:800;font-size:11px;margin-bottom:13px}
        h1{margin:0 0 11px;font-size:clamp(2rem,6vw,2.45rem);line-height:1.08;letter-spacing:-.04em}
        .signup-copy{margin:0 0 25px;color:#cbd5e1;line-height:1.65;font-size:15px}
        .status-box{padding:13px 14px;border-radius:13px;background:rgba(20,184,166,.12);border:1px solid rgba(94,234,212,.14);color:#99f6e4;margin-bottom:18px;font-weight:700;font-size:14px}
        form{display:grid;gap:16px}
        label{display:grid;gap:7px;font-weight:700;font-size:14px;color:#e2e8f0}
        input{width:100%;min-height:48px;box-sizing:border-box;padding:13px 14px;border-radius:13px;border:1px solid rgba(148,163,184,.25);background:rgba(255,255,255,.055);color:#fff;font-size:16px;outline:none;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
        input:focus{border-color:rgba(94,234,212,.58);box-shadow:0 0 0 3px rgba(20,184,166,.12);background:rgba(255,255,255,.07)}
        button{min-height:50px;border:0;border-radius:13px;padding:14px 16px;background:linear-gradient(135deg,#0f766e,#0e7490);color:#fff;font-weight:800;font-size:15px;cursor:pointer;box-shadow:0 12px 26px rgba(14,116,144,.18)}
        button:disabled{opacity:.68;cursor:not-allowed}
        .error-text,.success-text{margin:0;font-size:14px;line-height:1.55}.error-text{color:#fca5a5}.success-text{color:#99f6e4}
        .login-row{margin:21px 0 0;text-align:center;color:#94a3b8;font-size:14px}.login-row a{color:#67e8f9;font-weight:800;text-decoration:none}
        @media(max-width:560px){.signup-page{place-items:start center;padding:18px 12px 28px}.signup-card{padding:24px 18px 22px;border-radius:22px;margin-top:8px}.signup-eyebrow{font-size:10px;padding:6px 10px;margin-bottom:11px}h1{font-size:2rem}.signup-copy{font-size:14px;margin-bottom:21px}form{gap:14px}label{font-size:13px}input{min-height:50px;border-radius:12px;padding:13px 13px}button{min-height:52px;border-radius:12px;font-size:15px}.login-row{margin-top:18px;font-size:13px}}
      `}</style>
    </main>
  );
}
