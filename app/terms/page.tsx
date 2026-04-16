import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Terms of Use</h1>
          <p className="legal-meta">Effective date: April 11, 2026</p>

          <section className="legal-section">
            <h2>1. Agreement</h2>
            <p>
              By accessing or using AlignEDU, you agree to these Terms of Use. If you are using the
              service on behalf of an organization, you represent that you have authority to bind that
              organization.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Service Description</h2>
            <p>
              AlignEDU is a premium SaaS platform that provides lesson analysis, instructional insights,
              and related reporting features. We may improve, update, or change features over time.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Accounts and Security</h2>
            <ul>
              <li>You are responsible for safeguarding account credentials.</li>
              <li>You must provide accurate account information.</li>
              <li>You must notify us promptly of unauthorized account activity.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Acceptable Use</h2>
            <p>
              You must use AlignEDU lawfully and professionally. You may not misuse the platform,
              attempt unauthorized access, or interfere with service reliability.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Customer Data</h2>
            <p>
              You retain ownership of your submitted content and data. You grant AlignEDU a limited
              license to process that data solely to provide and improve the service.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Subscription and Billing</h2>
            <p>
              Paid plans renew according to your subscription terms unless canceled. Fees are due as
              invoiced and may be subject to applicable taxes.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Intellectual Property</h2>
            <p>
              The platform, software, and branding are owned by AlignEDU and protected by intellectual
              property laws. No rights are transferred except as explicitly stated in these terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Disclaimer and Liability</h2>
            <p>
              AlignEDU provides instructional insights to support professional decision-making. Results
              are informational and not guaranteed to be error-free. To the maximum extent allowed by
              law, AlignEDU disclaims implied warranties and limits liability for indirect damages.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Termination</h2>
            <p>
              We may suspend or terminate accounts for material violations of these terms. You may stop
              using the service at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact</h2>
            <p>
              Questions about these terms: support@alignedu.net
            </p>
          </section>

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
