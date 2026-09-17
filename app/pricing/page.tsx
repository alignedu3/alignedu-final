'use client';

import { useState } from 'react';
import Link from 'next/link';

const plans = [
  { key: 'free', name: 'Free', price: '$0', annual: '', limit: '2 lesson analyses / month', copy: 'Explore AlignEDU before upgrading.', features: ['AI lesson intelligence', 'Coverage, clarity, engagement & assessment', 'Personal dashboard'], featured: false },
  { key: 'teacher', name: 'Teacher', price: '$14.99', annual: '$149/year', limit: '10 lesson analyses / month', copy: 'For individual educators using AlignEDU consistently.', features: ['Everything in Free', '10 completed analyses each month', 'Analysis history & instructional insights'], featured: false },
  { key: 'teacher_pro', name: 'Teacher Pro', price: '$24.99', annual: '$249/year', limit: '30 lesson analyses / month', copy: 'For educators who want deeper, more frequent classroom intelligence.', features: ['Everything in Teacher', '30 completed analyses each month', 'Higher-volume lesson reflection'], featured: true },
  { key: 'school', name: 'School / District', price: 'Custom', annual: '', limit: 'Team access + pooled/custom usage', copy: 'For instructional leaders, campuses and districts.', features: ['Administrator dashboards', 'Invite & manage authorized users', 'Organization-level visibility'], featured: false },
] as const;

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const checkout = async (plan: 'teacher' | 'teacher_pro') => {
    const response = await fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, interval: annual ? 'annual' : 'monthly' }) });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.href = `/login?next=${encodeURIComponent('/pricing')}`; return; }
    if (data.url) window.location.href = data.url;
    else alert(data.error || 'Checkout is temporarily unavailable.');
  };

  return <main className="pricing-page">
    <section className="pricing-hero">
      <Link href="/" className="back">← AlignEDU</Link>
      <span className="eyebrow">Plans built for real classrooms</span>
      <h1>Classroom intelligence that grows with you.</h1>
      <p>Start small, then choose the analysis capacity that matches how often you teach, reflect and improve.</p>
      <div className="toggle"><button className={!annual ? 'active' : ''} onClick={() => setAnnual(false)}>Monthly</button><button className={annual ? 'active' : ''} onClick={() => setAnnual(true)}>Annual <span>Save</span></button></div>
    </section>
    <section className="grid">
      {plans.map((plan) => <article key={plan.key} className={`card ${plan.featured ? 'featured' : ''}`}>
        {plan.featured && <div className="badge">Most capable individual plan</div>}
        <div><h2>{plan.name}</h2><p className="copy">{plan.copy}</p></div>
        <div className="price">{annual && plan.annual ? plan.annual : plan.price}{plan.price.startsWith('$') && !annual ? <small>/month</small> : null}</div>
        <div className="limit">{plan.limit}</div>
        <ul>{plan.features.map(feature => <li key={feature}>✓ {feature}</li>)}</ul>
        {plan.key === 'free' && <Link className="cta secondary" href="/signup">Get started</Link>}
        {plan.key === 'teacher' && <button className="cta secondary" onClick={() => checkout('teacher')}>Choose Teacher</button>}
        {plan.key === 'teacher_pro' && <button className="cta primary" onClick={() => checkout('teacher_pro')}>Choose Teacher Pro</button>}
        {plan.key === 'school' && <a className="cta secondary" href="mailto:support@alignedu.net?subject=AlignEDU School or District Plan">Talk to AlignEDU</a>}
      </article>)}
    </section>
    <p className="note">Annual individual subscriptions retain the same monthly analysis allowance. School and district administrators can invite authorized users; individual plans cannot.</p>
    <style jsx>{`
      .pricing-page{min-height:100vh;background:linear-gradient(180deg,#071426 0,#0b1c33 34%,#f8fafc 34%);font-family:Inter,Arial,sans-serif;padding:28px 18px 64px;color:#0f172a}.pricing-hero{max-width:1120px;margin:auto;color:white;text-align:center;padding:10px 0 44px}.back{display:inline-block;color:#bae6fd;text-decoration:none;margin-bottom:28px;font-weight:700}.eyebrow{display:block;color:#5eead4;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:800}.pricing-hero h1{font-size:clamp(2.2rem,6vw,4rem);letter-spacing:-.04em;line-height:1.04;margin:12px auto;max-width:850px}.pricing-hero p{color:#cbd5e1;font-size:17px;line-height:1.65;max-width:680px;margin:0 auto 24px}.toggle{display:inline-flex;padding:4px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);border-radius:14px}.toggle button{border:0;background:transparent;color:#cbd5e1;padding:10px 16px;border-radius:10px;font-weight:750;cursor:pointer}.toggle button.active{background:white;color:#0f172a}.toggle span{font-size:10px;color:#0f766e}.grid{max-width:1180px;margin:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:stretch}.card{position:relative;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:26px;box-shadow:0 18px 50px rgba(15,23,42,.09);display:flex;flex-direction:column;gap:18px;min-width:0}.card.featured{border:2px solid #0f766e;box-shadow:0 22px 60px rgba(15,118,110,.16)}.badge{font-size:11px;font-weight:800;color:#0f766e;background:#ccfbf1;border-radius:999px;padding:7px 10px;align-self:flex-start}.card h2{font-size:21px;margin:0 0 8px}.copy{color:#64748b;line-height:1.5;margin:0;font-size:14px}.price{font-size:30px;font-weight:850;letter-spacing:-.03em}.price small{font-size:13px;color:#64748b;font-weight:600}.limit{background:#f1f5f9;padding:11px;border-radius:12px;font-weight:750;font-size:13px}.card ul{list-style:none;padding:0;margin:0;display:grid;gap:10px;color:#475569;font-size:13px;line-height:1.4;flex:1}.cta{width:100%;box-sizing:border-box;text-align:center;padding:13px 14px;border-radius:12px;font-weight:800;text-decoration:none;cursor:pointer;font-size:14px}.primary{background:linear-gradient(135deg,#0f766e,#0e7490);color:white;border:0}.secondary{background:white;color:#0f172a;border:1px solid #cbd5e1}.note{max-width:900px;margin:28px auto 0;text-align:center;color:#64748b;font-size:13px;line-height:1.6}@media(max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.pricing-page{padding:18px 14px 44px;background:linear-gradient(180deg,#071426 0,#0b1c33 27%,#f8fafc 27%)}.pricing-hero{padding-bottom:28px}.pricing-hero h1{font-size:2.35rem}.pricing-hero p{font-size:15px}.grid{grid-template-columns:1fr;gap:13px}.card{padding:21px;border-radius:20px}.price{font-size:28px}.toggle{width:100%;box-sizing:border-box}.toggle button{flex:1}.cta{min-height:48px;display:grid;place-items:center}}
    `}</style>
  </main>;
}
