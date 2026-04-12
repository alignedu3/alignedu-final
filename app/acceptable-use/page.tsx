import Link from 'next/link';

export default function AcceptableUsePage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Acceptable Use Policy</h1>
          <p className="legal-meta">Effective date: April 11, 2026</p>

          <section className="legal-section">
            <h2>1. Purpose</h2>
            <p>
              This policy protects users, students, educators, and the platform by defining prohibited
              activities.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Prohibited Uses</h2>
            <ul>
              <li>Illegal activity or unauthorized access attempts.</li>
              <li>Uploading malicious code or disruptive content.</li>
              <li>Harassment, abuse, or discriminatory conduct.</li>
              <li>Submitting content you are not authorized to share.</li>
              <li>Reverse engineering or misuse of platform APIs or systems.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Enforcement</h2>
            <p>
              Violations may result in investigation, content removal, account suspension, or
              termination.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Reporting</h2>
            <p>
              Report suspected abuse to support@alignedu.net.
            </p>
          </section>

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
