import Link from 'next/link';

export default function DisclaimerPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Disclaimer</h1>
          <p className="legal-meta">Effective date: April 11, 2026</p>

          <section className="legal-section">
            <h2>1. Informational Use</h2>
            <p>
              AlignEDU provides educational analytics and instructional insights for informational and
              support purposes only.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. No Professional, Legal, or Financial Advice</h2>
            <p>
              Content and outputs from AlignEDU are not legal, financial, or regulatory advice and
              should not replace professional judgment.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. AI Output Limitations</h2>
            <p>
              AI-generated summaries and recommendations may contain inaccuracies. Users are
              responsible for reviewing outputs before relying on them for decisions.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Third-Party Services</h2>
            <p>
              AlignEDU may integrate with third-party tools and infrastructure. We are not responsible
              for third-party content, policies, or downtime outside our control.
            </p>
          </section>

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
