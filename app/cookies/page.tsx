import Link from 'next/link';

export default function CookiesPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Cookie Policy</h1>
          <p className="legal-meta">Effective date: April 11, 2026</p>

          <section className="legal-section">
            <h2>1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device to help websites operate and remember
              preferences.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Cookies</h2>
            <ul>
              <li>Essential cookies for authentication and secure sessions.</li>
              <li>Preference cookies for settings such as UI preferences.</li>
              <li>Operational analytics to improve performance and reliability.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Managing Cookies</h2>
            <p>
              You can control cookies through browser settings. Disabling essential cookies may affect
              core platform functionality.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Updates</h2>
            <p>
              We may update this Cookie Policy as our product evolves.
            </p>
          </section>

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
