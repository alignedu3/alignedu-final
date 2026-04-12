import Link from 'next/link';

export default function SecurityPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Security</h1>
          <p className="legal-meta">Last updated: April 11, 2026</p>

          <section className="legal-section">
            <h2>1. Security Program</h2>
            <p>
              AlignEDU maintains administrative, technical, and organizational controls designed to
              protect customer data and platform availability.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Access Controls</h2>
            <ul>
              <li>Role-based access and authentication controls.</li>
              <li>Restricted access to production systems on a least-privilege basis.</li>
              <li>Credential and key management practices.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Data Protection</h2>
            <ul>
              <li>Encryption in transit and encryption at rest where applicable.</li>
              <li>Ongoing monitoring and logging for security events.</li>
              <li>Backup and recovery practices for business continuity.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Incident Response</h2>
            <p>
              We maintain procedures for identifying, containing, and remediating security incidents,
              including customer notification obligations where required by law or contract.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Responsible Disclosure</h2>
            <p>
              To report a potential vulnerability, contact support@alignedu.net with detailed findings.
            </p>
          </section>

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
