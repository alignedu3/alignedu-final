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
          <button onClick={() => { router.push("/analyze"); }} style={primaryBtn}>
            Try It Now
          </button>
          <button 
            onClick={() => { 
              window.location.href = "mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo."; 
            }} 
            style={primaryBtn}
          >
            Book Demo
          </button>
        </div>
        
        <p style={{ marginTop: '15px', fontSize: '14px' }}>
          Upload a lecture and see instant results
        </p>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 20px', background: '#f8fafc', textAlign: 'center' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px' }}>Key Features</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px', color: '#0f172a' }}>
          What We Offer
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[{ icon: '🧠', title: 'AI-Powered Analysis', desc: 'Analyze classroom performance with AI.' },
            { icon: '📋', title: 'Curriculum Alignment', desc: 'Verify TEKS and state standards coverage.' },
            { icon: '💡', title: 'Actionable Insights', desc: 'Get clear, immediate feedback.' }].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'white', borderRadius: '16px', padding: '20px', width: '250px' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#0f172a' }}>{title}</h3>
              <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '15px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#e5e7eb' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px' }}>How It Works</p>
        <h2 style={{ fontSize: '32px', marginBottom: '60px', color: '#0f172a' }}>Simple 3-Step Process</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { step: '1', icon: '📤', title: 'Upload Lecture', desc: 'Record live lectures or upload pre-recorded content.' },
            { step: '2', icon: '⚙️', title: 'AI Analysis', desc: 'Our AI evaluates the content for insights and alignment.' },
            { step: '3', icon: '📊', title: 'Get Feedback', desc: 'Receive immediate feedback and suggestions.' }
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#0f172a' }}>{title}</h3>
              <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '14px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', letterSpacing: '1px' }}>Who It’s For</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px' }}>For Teachers, Admins, and Districts</h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {[
            { icon: '👩‍🏫', title: 'Teachers', desc: 'Improve lesson delivery with real-time feedback.' },
            { icon: '🏫', title: 'Administrators', desc: 'Evaluate classrooms with AI-driven analysis.' },
            { icon: '🏙️', title: 'Districts', desc: 'Ensure curriculum coverage across multiple schools.' }
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px', width: '250px' }}>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: 'white' }}>{title}</h3>
              <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '15px' }}>{desc}</p>
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
        
        <button 
          onClick={() => { 
            window.location.href = "mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo."; 
          }} 
          style={primaryBtn}
        >
          Book Demo
        </button>
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

const primaryBtn: React.CSSProperties = {
  backgroundColor: '#facc15',
  color: '#1e293b',
  padding: '12px 25px',
  borderRadius: '8px', 
  border: 'none',
  fontWeight: 'bold', 
  fontSize: '14px',  
  height: '45px',    
  cursor: 'pointer', 
  display: 'inline-flex',
  alignItems: 'center',  
  justifyContent: 'center',
  lineHeight: '1'
};
