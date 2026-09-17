'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const plans = [
  { name: 'Free', price: '$0', note: '2 analyses / month' },
  { name: 'Teacher', price: '$14.99/mo', note: '10 analyses / month' },
  { name: 'Teacher Pro', price: '$24.99/mo', note: '30 analyses / month', featured: true },
  { name: 'School / District', price: 'Custom', note: 'Team access + admin tools' },
];

export default function HomepagePlansTeaser() {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return (
    <section className="home-plans" aria-labelledby="home-plans-title">
      <div className="home-plans-shell">
        <div className="home-plans-heading">
          <div>
            <span>Plans</span>
            <h2 id="home-plans-title">Start with the access that fits your classroom.</h2>
            <p>Simple individual plans, with organization options for schools and districts.</p>
          </div>
          <Link href="/pricing">View full plans →</Link>
        </div>
        <div className="home-plans-grid">
          {plans.map((plan) => (
            <Link key={plan.name} href="/pricing" className={`home-plan-card ${plan.featured ? 'featured' : ''}`}>
              <strong>{plan.name}</strong>
              <b>{plan.price}</b>
              <small>{plan.note}</small>
            </Link>
          ))}
        </div>
      </div>
      <style jsx>{`
        .home-plans{background:var(--background);padding:28px 20px 34px;border-bottom:1px solid var(--border)}
        .home-plans-shell{max-width:1180px;margin:0 auto}
        .home-plans-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:16px}
        .home-plans-heading span{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0f766e}
        .home-plans-heading h2{margin:5px 0 5px;font-size:clamp(1.35rem,2.4vw,1.9rem);letter-spacing:-.025em;color:var(--text-primary)}
        .home-plans-heading p{margin:0;color:var(--text-secondary);font-size:14px}
        .home-plans-heading a{white-space:nowrap;color:#0f766e;font-weight:800;text-decoration:none;font-size:14px}
        .home-plans-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .home-plan-card{display:flex;flex-direction:column;gap:5px;padding:15px 16px;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:var(--text-primary);text-decoration:none;min-width:0}
        .home-plan-card.featured{border-color:#0f766e;box-shadow:0 8px 24px rgba(15,118,110,.08)}
        .home-plan-card strong{font-size:14px}.home-plan-card b{font-size:20px;letter-spacing:-.02em}.home-plan-card small{color:var(--text-secondary);font-size:12px}
        @media(max-width:820px){.home-plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.home-plans{padding:22px 14px 26px}.home-plans-heading{align-items:flex-start;flex-direction:column;gap:10px}.home-plans-grid{grid-template-columns:1fr 1fr;gap:8px}.home-plan-card{padding:13px}.home-plan-card b{font-size:17px}}
      `}</style>
    </section>
  );
}
