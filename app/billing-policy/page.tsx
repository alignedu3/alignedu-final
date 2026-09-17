import Link from 'next/link';

export default function BillingPolicyPage() {
  return (
    <main className="legal-page"><div className="legal-shell"><article className="legal-card">
      <h1 className="legal-title">Subscription & Billing Policy</h1><p className="legal-meta">Effective date: September 17, 2026</p>
      <section className="legal-section"><h2>Plans and Allowances</h2><p>AlignEDU may offer Free, Teacher, Teacher Pro, and School/District plans. Current prices, included monthly analysis allowances, and plan features are shown on the Pricing page and control if they differ from older marketing materials.</p></section>
      <section className="legal-section"><h2>Renewal</h2><p>Paid self-service subscriptions renew automatically at the selected monthly or annual interval until canceled. Annual individual plans use the monthly analysis allowance stated for that plan unless otherwise disclosed.</p></section>
      <section className="legal-section"><h2>Cancellation</h2><p>Cancel before the next renewal date to avoid the next recurring charge. After cancellation, paid access generally remains available through the end of the current paid period.</p></section>
      <section className="legal-section"><h2>Refunds</h2><p>Except where required by law, subscription charges are generally non-refundable. Suspected duplicate charges, processing errors, or other billing problems can be submitted to support@alignedu.net for review.</p></section>
      <section className="legal-section"><h2>School and District Accounts</h2><p>Organization plans may have custom pricing, user counts, pooled or negotiated usage, invoicing, and separate written order terms. Authorized organization administrators may manage invited users according to their permissions.</p></section>
      <section className="legal-section"><h2>Payment Processing</h2><p>Payments may be processed by a third-party payment provider. AlignEDU receives billing and subscription status needed to provide paid access but does not need to store full payment-card details.</p></section>
      <Link href="/pricing" className="legal-back">View Plans</Link> <Link href="/" className="legal-back">Back to Home</Link>
    </article></div></main>
  );
}
