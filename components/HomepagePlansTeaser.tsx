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
            <Link key={plan.name} href="/pricing" className={`home-plan-bubble ${plan.featured ? 'featured' : ''}`}>
              <div className="home-plan-topline">
                <strong>{plan.name}</strong>
                {plan.featured ? <span className="home-plan-badge">Popular</span> : null}
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
        .home-plans{position:relative;overflow:hidden;padding:clamp(50px,6vw,68px) 20px;background:linear-gradient(180deg,var(--background),var(--surface));border-top:1px solid var(--border)}
        .home-plans::before,.home-plans::after{content:'';position:absolute;border-radius:999px;filter:blur(18px);pointer-events:none;opacity:.65}
        .home-plans::before{width:210px;height:210px;left:-75px;top:24px;background:rgba(56,189,248,.12)}
        .home-plans::after{width:180px;height:180px;right:-55px;bottom:6px;background:rgba(20,184,166,.12)}
        .home-plans-shell{position:relative;z-index:1;max-width:1180px;margin:0 auto}
        .home-plans-heading{max-width:760px;margin:0 auto 28px;text-align:center}
        .home-plans-eyebrow{display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:999px;background:rgba(20,184,166,.10);border:1px solid rgba(15,118,110,.14);color:#0f766e;font-size:11px;font-weight:850;letter-spacing:.12em;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.65)}
        .home-plans-heading h2{margin:13px 0 9px;font-size:clamp(1.8rem,3.4vw,2.65rem);line-height:1.12;letter-spacing:-.035em;color:var(--text-primary)}
        .home-plans-heading p{max-width:650px;margin:0 auto;color:var(--text-secondary);font-size:15px;line-height:1.7}
        .home-plans-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:stretch}
        .home-plan-bubble{display:flex;flex-direction:column;justify-content:center;gap:10px;min-height:132px;padding:20px 22px;border:1px solid rgba(148,163,184,.22);border-radius:999px;background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(248,250,252,.78));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--text-primary);text-decoration:none;min-width:0;box-shadow:0 14px 34px rgba(15,23,42,.07),inset 0 1px 0 rgba(255,255,255,.85);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
        .home-plan-bubble:hover{transform:translateY(-3px);border-color:rgba(15,118,110,.34);box-shadow:0 18px 40px rgba(15,23,42,.10),inset 0 1px 0 rgba(255,255,255,.9)}
        .home-plan-bubble.featured{border-color:rgba(15,118,110,.55);background:linear-gradient(145deg,rgba(236,253,245,.94),rgba(240,253,250,.86));box-shadow:0 16px 40px rgba(15,118,110,.11),inset 0 1px 0 rgba(255,255,255,.88)}
        .home-plan-topline{display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;min-height:22px}
        .home-plan-topline strong{font-size:14px}
        .home-plan-badge{padding:4px 8px;border-radius:999px;background:#ccfbf1;color:#0f766e;font-size:9px;font-weight:850;letter-spacing:.04em;text-transform:uppercase}
        .home-plan-price{display:flex;align-items:baseline;justify-content:center;gap:3px;min-height:31px;text-align:center}
        .home-plan-price b{font-size:24px;letter-spacing:-.03em}.home-plan-price small{color:var(--text-secondary);font-size:11px;font-weight:650}
        .home-plan-note{color:var(--text-secondary);font-size:12px;line-height:1.45;text-align:center}
        .home-plans-action{display:flex;justify-content:center;margin-top:24px}
        .home-plans-action a{display:inline-flex;align-items:center;gap:8px;padding:12px 17px;border:1px solid rgba(148,163,184,.25);border-radius:999px;background:rgba(255,255,255,.82);backdrop-filter:blur(10px);color:var(--text-primary);font-size:13px;font-weight:800;text-decoration:none;box-shadow:0 8px 22px rgba(15,23,42,.06)}
        @media(max-width:900px){.home-plans-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.home-plan-bubble{border-radius:34px}}
        @media(max-width:560px){.home-plans{padding:42px 14px}.home-plans-heading{margin-bottom:22px}.home-plans-heading h2{font-size:1.85rem}.home-plans-grid{grid-template-columns:1fr;gap:10px}.home-plan-bubble{min-height:auto;padding:17px 18px;border-radius:26px}.home-plans-action{margin-top:18px}.home-plans-action a{width:100%;justify-content:center;min-height:46px;box-sizing:border-box}}
        @media(prefers-color-scheme:dark){.home-plan-bubble{background:linear-gradient(145deg,rgba(30,41,59,.86),rgba(15,23,42,.78));box-shadow:0 14px 34px rgba(2,6,23,.24),inset 0 1px 0 rgba(255,255,255,.07)}.home-plan-bubble.featured{background:linear-gradient(145deg,rgba(6,78,59,.50),rgba(15,118,110,.20))}.home-plans-action a{background:rgba(15,23,42,.76)}}
      `}</style>
    </section>,
    portalHost,
  );
}
