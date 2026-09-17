'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const plans = [
  { name: 'Free', price: '$0', note: '2 analyses / month' },
  { name: 'Teacher', price: '$14.99', cadence: '/month', note: '10 analyses / month' },
  { name: 'Teacher Pro', price: '$24.99', cadence: '/month', note: '30 analyses / month', featured: true },
  { name: 'School / District', price: 'Custom', note: 'Team access + admin tools' },
];

export default function HomepagePlansTeaser() {
  const pathname = usePathname();
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pathname !== '/') {
      setPortalHost(null);
      return;
    }

    const footer = document.querySelector('main footer');
    const parent = footer?.parentElement;
    if (!footer || !parent) return;

    const host = document.createElement('div');
    host.setAttribute('data-home-pricing-preview', 'true');
    host.style.display = 'contents';

    const finalCta = footer.previousElementSibling;
    parent.insertBefore(host, finalCta || footer);
    setPortalHost(host);

    return () => {
      setPortalHost(null);
      host.remove();
    };
  }, [pathname]);

  if (pathname !== '/' || !portalHost) return null;

  return createPortal(
    <section className="home-plans" aria-labelledby="home-plans-title">
      <div className="home-plans-shell">
        <div className="home-plans-heading">
          <span className="home-plans-eyebrow">Plans & pricing</span>
          <h2 id="home-plans-title">Choose the access that fits how you teach.</h2>
          <p>A quick look at AlignEDU plans. Open the full pricing page for annual options and complete plan details.</p>
        </div>

        <div className="home-plans-grid">
          {plans.map((plan) => (
            <Link
              key={plan.name}
              href="/pricing"
              className={`home-plan-card ${plan.featured ? 'featured' : ''}`}
            >
              <div className="home-plan-topline">
                <strong>{plan.name}</strong>
                {plan.featured ? <span className="home-plan-badge">Featured</span> : null}
              </div>
              <div className="home-plan-price">
                <b>{plan.price}</b>{plan.cadence ? <small>{plan.cadence}</small> : null}
              </div>
              <span className="home-plan-note">{plan.note}</span>
            </Link>
          ))}
        </div>

        <div className="home-plans-action">
          <Link href="/pricing">View all plans & pricing <span aria-hidden="true">→</span></Link>
        </div>
      </div>

      <style jsx>{`
        .home-plans{padding:clamp(48px,6vw,64px) 20px;background:var(--background);border-top:1px solid var(--border)}
        .home-plans-shell{max-width:1180px;margin:0 auto}
        .home-plans-heading{max-width:760px;margin:0 auto 24px;text-align:center}
        .home-plans-eyebrow{display:inline-flex;align-items:center;justify-content:center;padding:7px 11px;border-radius:999px;background:rgba(20,184,166,.10);color:#0f766e;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
        .home-plans-heading h2{margin:12px 0 9px;font-size:clamp(1.8rem,3.4vw,2.65rem);line-height:1.12;letter-spacing:-.035em;color:var(--text-primary)}
        .home-plans-heading p{max-width:650px;margin:0 auto;color:var(--text-secondary);font-size:15px;line-height:1.7}
        .home-plans-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .home-plan-card{display:flex;flex-direction:column;gap:10px;padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface);color:var(--text-primary);text-decoration:none;min-width:0;box-shadow:0 10px 28px rgba(15,23,42,.045);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .home-plan-card:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(15,23,42,.075)}
        .home-plan-card.featured{border-color:rgba(15,118,110,.65);box-shadow:0 14px 34px rgba(15,118,110,.10)}
        .home-plan-topline{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px}
        .home-plan-topline strong{font-size:14px}
        .home-plan-badge{padding:4px 7px;border-radius:999px;background:#ccfbf1;color:#0f766e;font-size:9px;font-weight:850;letter-spacing:.04em;text-transform:uppercase}
        .home-plan-price{display:flex;align-items:baseline;gap:3px;min-height:31px}
        .home-plan-price b{font-size:23px;letter-spacing:-.03em}
        .home-plan-price small{color:var(--text-secondary);font-size:11px;font-weight:650}
        .home-plan-note{color:var(--text-secondary);font-size:12px;line-height:1.45}
        .home-plans-action{display:flex;justify-content:center;margin-top:22px}
        .home-plans-action a{display:inline-flex;align-items:center;gap:8px;padding:11px 16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text-primary);font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 8px 22px rgba(15,23,42,.05)}
        @media(max-width:900px){.home-plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:560px){.home-plans{padding:42px 14px}.home-plans-heading{margin-bottom:20px}.home-plans-heading h2{font-size:1.85rem}.home-plans-grid{grid-template-columns:1fr;gap:10px}.home-plan-card{padding:16px}.home-plans-action{margin-top:18px}.home-plans-action a{width:100%;justify-content:center;min-height:46px;box-sizing:border-box}}
      `}</style>
    </section>,
    portalHost,
  );
}
