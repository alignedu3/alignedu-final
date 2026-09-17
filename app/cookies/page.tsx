import Link from 'next/link';

export default function CookiesPage() {
  return (
    <main className="legal-page"><div className="legal-shell"><article className="legal-card">
      <h1 className="legal-title">Cookie Policy</h1><p className="legal-meta">Effective date: September 17, 2026</p>
      <section className="legal-section"><h2>1. What Cookies Are</h2><p>Cookies and similar browser storage technologies help websites maintain sessions, remember settings, and operate securely.</p></section>
      <section className="legal-section"><h2>2. How AlignEDU Uses Them</h2><ul><li>Essential authentication and secure-session functions.</li><li>Preferences such as interface and theme settings.</li><li>Operational analytics, diagnostics, reliability, and security monitoring.</li><li>Subscription and checkout continuity where needed to complete or manage billing flows.</li></ul></section>
      <section className="legal-section"><h2>3. Third-Party Services</h2><p>Service providers used for hosting, authentication, analytics, security, and payments may set or read cookies or similar technologies when necessary to provide their services.</p></section>
      <section className="legal-section"><h2>4. Managing Cookies</h2><p>You can control cookies through browser settings. Blocking essential cookies or storage may prevent login, checkout, account management, or other core functions from working correctly.</p></section>
      <section className="legal-section"><h2>5. Updates</h2><p>We may update this policy as AlignEDU’s services and technology providers change.</p></section>
      <section className="legal-section"><h2>6. Contact</h2><p>Questions: support@alignedu.net</p></section>
      <Link href="/" className="legal-back">Back to Home</Link>
    </article></div></main>
  );
}
