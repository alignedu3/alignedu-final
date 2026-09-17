'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const plans = [
  { name: 'Free', price: '$0', note: '2 analyses / month', cta: 'Get started free' },
  { name: 'Teacher', price: '$14.99', cadence: '/month', annual: '$149/year', effective: '$12.42/mo', savings: 'Save $30.88/year', note: '10 analyses / month', cta: 'Choose Teacher' },
  { name: 'Teacher Pro', price: '$24.99', cadence: '/month', annual: '$249/year', effective: '$20.75/mo', savings: 'Save $50.88/year', note: '30 analyses / month', cta: 'Choose Teacher Pro', featured: true },
  { name: 'School / District', price: 'Custom', note: 'Team access + admin tools', cta: 'View school options' },
];

export default function HomepagePlansTeaser() {
  const pathname = usePathname();
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pathname !== '/') { setPortalHost(null); return; }
    const footer = document.querySelector('main footer');
    const parent = footer?.parentElement;
    if (!footer || !parent) return;
    const host = document.createElement('div');
    host.setAttribute('data-home-pricing-preview', 'true');
    host.style.display = 'contents';
    const finalCta = footer.previousElementSibling;
    parent.insertBefore(host, finalCta || footer);
    setPortalHost(host);
    return () => { setPortalHost(null); host.remove(); };
  }, [pathname]);

  if (pathname !== '/' || !portalHost) return null;

  return createPortal(
    <section className="home-plans" aria-labelledby="home-plans-title">
      <div className="home-plans-shell">
        <div className="home-plans-heading">
          <span className="home-plans-eyebrow">Plans & pricing</span>
          <h2 id="home-plans-title">Choose the access that fits how you teach.</h2>
          <p>Start free or choose more classroom intelligence. Save with annual billing on individual paid plans.</p>
        </div>

        <div className="home-plans-grid">
          {plans.map((plan) => (
            <article key={plan.name} className={`home-plan-card ${plan.featured ? 'featured' : ''}`}>
              <div className="home-plan-topline">
                <strong>{plan.name}</strong>
                {plan.featured ? <span className="home-plan-badge">Popular</span> : null}
              </div>
              <div className="home-plan-price"><b>{plan.price}</b>{plan.cadence ? <small>{plan.cadence}</small> : null}</div>
              {plan.annual ? <div className="home-plan-annual"><strong>{plan.annual}</strong><span>{plan.effective} effective</span>{plan.savings ? <em>{plan.savings}</em> : null}</div> : <div className="home-plan-annual placeholder"><span>{plan.name === 'Free' ? 'No credit card required' : 'Contact us for organization pricing'}</span></div>}
              <span className="home-plan-note">{plan.note}</span>
              <Link href={plan.name === 'Free' ? '/login' : '/pricing'} className={`home-plan-cta ${plan.featured ? 'primary' : ''}`}>{plan.cta}</Link>
            </article>
          ))}
        </div>

        <div className="home-plans-action"><Link href="/pricing">Compare all plan details <span aria-hidden="true">→</span></Link></div>
      </div>

      <style jsx>{`
        .home-plans{position:relative;overflow:hidden;padding:clamp(56px,6vw,76px) 20px;background:linear-gradient(180deg,var(--background),var(--surface));border-top:1px solid var(--border)}
        .home-plans::before,.home-plans::after{content:'';position:absolute;border-radius:999px;filter:blur(22px);pointer-events:none;opacity:.7}.home-plans::before{width:230px;height:230px;left:-80px;top:20px;background:rgba(56,189,248,.13)}.home-plans::after{width:210px;height:210px;right:-70px;bottom:0;background:rgba(20,184,166,.14)}
        .home-plans-shell{position:relative;z-index:1;max-width:1180px;margin:0 auto}.home-plans-heading{max-width:760px;margin:0 auto 32px;text-align:center}.home-plans-eyebrow{display:inline-flex;padding:8px 14px;border-radius:999px;background:rgba(20,184,166,.11);border:1px solid rgba(15,118,110,.18);color:#0f766e;font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.home-plans-heading h2{margin:14px 0 10px;font-size:clamp(1.9rem,3.5vw,2.75rem);line-height:1.1;letter-spacing:-.04em;color:var(--text-primary)}.home-plans-heading p{max-width:650px;margin:auto;color:var(--text-secondary);font-size:15px;line-height:1.65}
        .home-plans-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;align-items:stretch}.home-plan-card{display:flex;flex-direction:column;gap:12px;min-width:0;padding:24px 22px;border:1px solid rgba(148,163,184,.30);border-radius:28px;background:rgba(255,255,255,.92);box-shadow:0 16px 42px rgba(15,23,42,.08);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.home-plan-card:hover{transform:translateY(-3px);box-shadow:0 22px 50px rgba(15,23,42,.12);border-color:rgba(15,118,110,.35)}.home-plan-card.featured{border:2px solid rgba(15,118,110,.68);background:linear-gradient(160deg,#f0fdfa,#fff);box-shadow:0 20px 52px rgba(15,118,110,.14)}
        .home-plan-topline{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:25px}.home-plan-topline strong{font-size:15px;color:var(--text-primary)}.home-plan-badge{padding:5px 9px;border-radius:999px;background:#ccfbf1;color:#0f766e;font-size:9px;font-weight:850;text-transform:uppercase}.home-plan-price{display:flex;align-items:baseline;gap:4px;min-height:38px}.home-plan-price b{font-size:29px;letter-spacing:-.04em;color:var(--text-primary)}.home-plan-price small{color:var(--text-secondary);font-size:11px;font-weight:650}.home-plan-annual{min-height:62px;padding:10px 11px;border-radius:14px;background:rgba(15,118,110,.07);display:flex;flex-direction:column;gap:2px}.home-plan-annual strong{font-size:13px;color:#0f766e}.home-plan-annual span{font-size:11px;color:var(--text-secondary)}.home-plan-annual em{font-size:11px;font-style:normal;font-weight:850;color:#0f766e}.home-plan-annual.placeholder{justify-content:center;background:rgba(148,163,184,.08)}.home-plan-note{color:var(--text-secondary);font-size:12px;line-height:1.45}.home-plan-cta{margin-top:auto;min-height:44px;display:flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:13px;border:1px solid rgba(148,163,184,.4);background:#fff;color:#0f172a;text-decoration:none;font-size:12px;font-weight:850;box-shadow:0 6px 16px rgba(15,23,42,.05)}.home-plan-cta.primary{border-color:transparent;background:linear-gradient(135deg,#0f766e,#0e7490);color:white}.home-plans-action{display:flex;justify-content:center;margin-top:25px}.home-plans-action a{display:inline-flex;align-items:center;gap:8px;padding:12px 17px;border:1px solid rgba(148,163,184,.28);border-radius:999px;background:rgba(255,255,255,.86);color:var(--text-primary);font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 8px 22px rgba(15,23,42,.06)}
        @media(max-width:950px){.home-plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.home-plans{padding:44px 14px}.home-plans-heading{margin-bottom:24px}.home-plans-heading h2{font-size:1.9rem}.home-plans-grid{grid-template-columns:1fr;gap:12px}.home-plan-card{padding:20px;border-radius:22px}.home-plans-action{margin-top:18px}.home-plans-action a{width:100%;justify-content:center;min-height:46px;box-sizing:border-box}}
        @media(prefers-color-scheme:dark){.home-plan-card{background:rgba(30,41,59,.9)}.home-plan-card.featured{background:linear-gradient(160deg,rgba(6,78,59,.62),rgba(15,23,42,.92))}.home-plan-cta{background:rgba(15,23,42,.85);color:white}.home-plans-action a{background:rgba(15,23,42,.8)}}
      `}</style>
    </section>, portalHost,
  );
}
