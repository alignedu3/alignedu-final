"use client";
"use client";
"use client";
"use client";
"use client";
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <main style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* HERO */}
      <section style={{
        textAlign: 'center',
        padding: '120px 20px',
        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '44px', marginBottom: '20px' }}>
          Turn Every Lecture Into Measurable Teaching Insight
        </h1>

        <p style={{ fontSize: '18px', maxWidth: '700px', margin: '0 auto 30px' }}>
          AI-powered classroom analysis that helps schools improve instruction, verify curriculum coverage, and drive student outcomes.
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <button onClick={() => { router.push("/analyze"); }} className="demo-button" style={primaryBtn}>
            Try It Now
          </button>

          <a href="mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=Hi%20AlignEDU%20Team%2C%0A%0AI'd%20love%20to%20schedule%20a%20demo%20or%20quick%20call%20to%20learn%20how%20AlignEDU%20can%20help%20our%20school%20improve%20instruction%20with%20AI." style={{ backgroundColor: 'white', color: '#1e293b', padding: '12px 25px', borderRadius: '8px', border: 'none', fontWeight: 'bold', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', lineHeight: '1', boxSizing: 'border-box', height: '45px' }}>
            Book Demo
          </a>
        </div>

        <p style={{ marginTop: '15px', fontSize: '14px' }}>
          Upload a lecture and see instant results
        </p>
      </section>

      {/* FEATURES */}
      {/* FEATURES */}
      <section style={{ padding: '80px 20px', background: '#f8fafc', textAlign: 'center' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>What We Do</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px', color: '#0f172a' }}>Improve Teaching Automatically</h2>
        <div style={{ display: 'flex',
          alignItems: 'center', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1100px', margin: '0 auto' }}>
          {[
            { icon: '🧠', title: 'AI-Powered Analysis', desc: 'Analyze classroom instruction instantly with cutting-edge AI.' },
            { icon: '📋', title: 'Curriculum Alignment', desc: 'Verify TEKS and standards automatically with every lesson.' },
            { icon: '💡', title: 'Actionable Insights', desc: 'Get clear, immediate feedback to improve teaching quality.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'white', borderRadius: '16px', padding: '36px 28px', flex: '1', minWidth: '240px', maxWidth: '320px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#0f172a' }}>{title}</h3>
              <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '15px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: 'white' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>How It Works</p>
        <h2 style={{ fontSize: '32px', marginBottom: '60px', color: '#0f172a' }}>From Lecture to Insight in Seconds</h2>
        <div style={{ display: 'flex',
          alignItems: 'center', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { step: '1', icon: '📤', title: 'Upload Lecture', desc: 'Record live or upload an audio/video file of your lesson.' },
            { step: '2', icon: '⚙️', title: 'AI Analysis', desc: 'Our AI evaluates instruction, pacing, and curriculum alignment.' },
            { step: '3', icon: '📊', title: 'Get Feedback', desc: 'Receive instant, actionable insights and alignment scores.' },
          ].map(({ step, icon, title, desc }, i) => (
            <div key={step} style={{ display: 'flex',
          alignItems: 'center', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center', padding: '0 30px', maxWidth: '260px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #16a34a)', display: 'flex',
          alignItems: 'center', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>{icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a', marginBottom: '6px' }}>STEP {step}</div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#0f172a' }}>{title}</h3>
                <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '14px' }}>{desc}</p>
              </div>
              
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', textAlign: 'center' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>{"Who It's For"}</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px', color: 'white' }}>Built for Educators and Administrators</h2>
        <div style={{ display: 'flex',
          alignItems: 'center', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
          {[
            { icon: '👩‍🏫', title: 'Teachers', desc: 'Improve lesson delivery with instant, personalized feedback after every class.' },
            { icon: '🏫', title: 'Administrators', desc: 'Evaluate classrooms consistently and identify areas for improvement at scale.' },
            { icon: '🏙️', title: 'Districts', desc: 'Ensure curriculum coverage and instructional quality across every school.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '36px 28px', flex: '1', minWidth: '240px', maxWidth: '300px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '14px' }}>{icon}</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: 'white' }}>{title}</h3>
              <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '15px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BEFORE / AFTER */}
      <section style={{ padding: '80px 20px', background: '#f8fafc', textAlign: 'center' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>The Difference</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px', color: '#0f172a' }}>Why AlignEDU Exists</h2>
        <div style={{ display: 'flex',
          alignItems: 'center', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ flex: '1', minWidth: '280px', background: 'white', borderRadius: '16px', padding: '36px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', textAlign: 'left' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '20px', fontSize: '20px' }}>❌ Before AlignEDU</h3>
            {['Inconsistent evaluations', 'Limited classroom visibility', 'Delayed feedback', 'No curriculum verification'].map(item => (
              <div key={item} style={{ display: 'flex',
          alignItems: 'center', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#64748b' }}>
                <span style={{ color: '#ef4444' }}>✕</span> {item}
              </div>
            ))}
          </div>
          <div style={{ flex: '1', minWidth: '280px', background: 'white', borderRadius: '16px', padding: '36px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', textAlign: 'left' }}>
            <h3 style={{ color: '#16a34a', marginBottom: '20px', fontSize: '20px' }}>✅ With AlignEDU</h3>
            {['Real-time insights', 'Standardized evaluation', 'Immediate feedback', 'Verified alignment'].map(item => (
              <div key={item} style={{ display: 'flex',
          alignItems: 'center', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#64748b' }}>
                <span style={{ color: '#16a34a' }}>✓</span> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORM FEATURES */}
      <section style={{ padding: '80px 20px', background: 'white', textAlign: 'center' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '13px' }}>Platform</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px', color: '#0f172a' }}>The Only Platform That Does It All</h2>
        <div style={{ display: 'flex',
          alignItems: 'center', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { icon: '🎙️', text: 'Real-time AI lecture analysis' },
            { icon: '📚', text: 'Curriculum alignment verification' },
            { icon: '⚡', text: 'Automated feedback and insights' },
            { icon: '🏫', text: 'Built for teachers, admins, and districts' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex',
          alignItems: 'center', alignItems: 'center', gap: '12px', background: '#f1f5f9', borderRadius: '12px', padding: '16px 24px', minWidth: '280px', flex: '1', maxWidth: '400px' }}>
              <span style={{ fontSize: '24px' }}>{icon}</span>
              <span style={{ color: '#0f172a', fontWeight: '500' }}>{text}</span>
            </div>
          ))}
        </div>
      </section>

      

      {/* FINAL CTA */}
      <section style={{
        textAlign: 'center',
        padding: '100px 20px',
        background: '#111827',
        color: 'white'
      }}>
        <h2>Ready to Transform Teaching?</h2>

        <p style={{ marginBottom: '20px' }}>
          Join schools using AI to improve instruction.
        </p>

        <a href="mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=Hi%20AlignEDU%20Team%2C%0A%0AI'd%20love%20to%20schedule%20a%20demo%20or%20quick%20call%20to%20learn%20how%20AlignEDU%20can%20help%20our%20school%20improve%20instruction%20with%20AI." style={{ ...primaryBtn, textDecoration: 'none', padding: '12px 25px', borderRadius: '8px', display: 'inline-block' }}>
          Book Demo
        </a>
      </section>

      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px' }}>
        <p>AlignEDU</p>
        <p>support@alignedu.net</p>
      </footer>

    </main>
  );
}

const flexRow = {
  display: 'flex',
          alignItems: 'center',
  justifyContent: 'center',
  gap: '40px',
  marginTop: '40px',
  flexWrap: 'wrap' as const
};

const card = {
  background: 'white',
  padding: '30px',
  borderRadius: '10px',
  width: '260px',
  boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
};

const primaryBtn = {
  backgroundColor: '#facc15',
  color: '#1e293b',
  padding: '12px 25px',
  borderRadius: '8px',
  border: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  height: '45px',
  cursor: 'pointer'
};

const secondaryBtn = {
  backgroundColor: 'white',
  color: '#1e293b',
  padding: '12px 25px',
  borderRadius: '8px',
  border: 'none'
};
