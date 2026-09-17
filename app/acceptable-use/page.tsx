import Link from 'next/link';

export default function AcceptableUsePage() {
  return (
    <main className="legal-page"><div className="legal-shell"><article className="legal-card">
      <h1 className="legal-title">Acceptable Use Policy</h1><p className="legal-meta">Effective date: September 17, 2026</p>
      <section className="legal-section"><h2>1. Purpose</h2><p>This policy protects educators, students, organizations, and the AlignEDU platform and applies to all free, paid, and organization accounts.</p></section>
      <section className="legal-section"><h2>2. Authorized Content</h2><p>Only submit recordings, documents, transcripts, student-related information, or other content that you are authorized to collect, use, and share. Follow your school or district’s recording, consent, student-privacy, and technology policies.</p></section>
      <section className="legal-section"><h2>3. Prohibited Uses</h2><ul><li>Illegal activity, unauthorized access, credential sharing, or attempts to bypass plan or usage limits.</li><li>Uploading malware, disruptive code, or content intended to compromise the service.</li><li>Harassment, abuse, discriminatory conduct, or unlawful surveillance.</li><li>Submitting content without appropriate rights, authority, or required permissions.</li><li>Using AI outputs as the sole basis for high-stakes employment, discipline, grading, special-education, or other consequential decisions.</li><li>Reverse engineering, scraping, automated abuse, or misuse of platform APIs and systems.</li></ul></section>
      <section className="legal-section"><h2>4. Organization Administration</h2><p>School and district administrators must invite only authorized users and use role permissions appropriately. Individual subscribers may not use account sharing or other methods to create unlicensed multi-user access.</p></section>
      <section className="legal-section"><h2>5. Enforcement</h2><p>Violations may result in investigation, restriction of features, removal of content, suspension, or termination. We may take immediate protective action when necessary for security or legal compliance.</p></section>
      <section className="legal-section"><h2>6. Reporting</h2><p>Report suspected abuse or security concerns to support@alignedu.net.</p></section>
      <Link href="/" className="legal-back">Back to Home</Link>
    </article></div></main>
  );
}
