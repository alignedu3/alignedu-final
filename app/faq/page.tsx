import Link from 'next/link';

const faqItems = [
  {
    question: 'What does AlignEDU analyze?',
    answer:
      'AlignEDU analyzes lesson notes and audio transcripts to surface instructional score, coverage, clarity, engagement signals, and coaching recommendations.',
  },
  {
    question: 'Who is AlignEDU for?',
    answer:
      'AlignEDU is designed for teachers, instructional coaches, school leaders, and district teams who want faster, more consistent instructional insight.',
  },
  {
    question: 'Do I need to upload audio to use it?',
    answer:
      'No. You can submit written lesson notes only. Audio upload is optional and helps enrich analysis when available.',
  },
  {
    question: 'How long can an uploaded audio file be?',
    answer:
      'The platform currently supports files up to 90 minutes. Longer recordings should be split before upload.',
  },
  {
    question: 'Is my data private and secure?',
    answer:
      'Yes. AlignEDU applies security controls to protect your account and submitted data. See the Security and Privacy pages for details.',
  },
  {
    question: 'Can admins see teacher-level data?',
    answer:
      'Administrators can access the dashboards and reports they are authorized to manage based on account role and configured access controls.',
  },
  {
    question: 'Does AlignEDU replace instructional judgment?',
    answer:
      'No. AlignEDU is a decision-support tool. Educators should review outputs and apply professional judgment before acting on recommendations.',
  },
  {
    question: 'How do I request support or a demo?',
    answer:
      'Use the Book Demo option or contact support@alignedu.net for help with setup, onboarding, and account questions.',
  },
];

export default function FaqPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <article className="legal-card">
          <h1 className="legal-title">Frequently Asked Questions</h1>
          <p className="legal-meta">Everything you need to know about using AlignEDU.</p>

          {faqItems.map((item) => (
            <section key={item.question} className="legal-section">
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </section>
          ))}

          <Link href="/" className="legal-back">Back to Home</Link>
        </article>
      </div>
    </main>
  );
}
