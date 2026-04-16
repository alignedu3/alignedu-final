import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-meta">Effective date: April 11, 2026</p>

          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <ul>
              <li>Account information such as name, email, and role.</li>
              <li>Lesson-related content you submit, including notes and audio uploads.</li>
              <li>Usage and device data for reliability, security, and product improvement.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Information</h2>
            <ul>
              <li>To provide lesson analysis and platform functionality.</li>
              <li>To secure accounts, prevent abuse, and maintain service performance.</li>
              <li>To communicate important product, billing, or support updates.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Data Sharing</h2>
            <p>
              We do not sell personal data. We may share data with trusted service providers that help
              us operate AlignEDU, subject to confidentiality and security obligations.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Data Retention</h2>
            <p>
              We retain information for as long as needed to provide services, meet contractual
              obligations, resolve disputes, and comply with legal requirements.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Security</h2>
            <p>
              We use administrative, technical, and organizational safeguards designed to protect your
              information. No system can be guaranteed 100 percent secure.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Your Choices</h2>
            <p>
              You may request access, correction, or deletion of personal information where applicable
              by contacting support@alignedu.net.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Children</h2>
            <p>
              AlignEDU is intended for schools and education professionals. We do not knowingly collect
              personal information directly from children through self-service signup.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Contact</h2>
            <p>Privacy questions: support@alignedu.net</p>
          </section>

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
