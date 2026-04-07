"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  // On page load, check for saved theme preference
  useEffect(() => {
    const savedMode = localStorage.getItem('theme');
    setIsDarkMode(savedMode === 'dark' || (savedMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches));
  }, []);

  // Toggle theme and save it in localStorage
  const toggleTheme = () => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', newMode);
    document.documentElement.setAttribute('data-theme', newMode); // Update the theme on the root element
  };

  const handleBookDemo = () => {
    window.location.href = "mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo.";
  };

  return (
    <main style={{ fontFamily: 'Roboto, Arial, sans-serif' }}>

      {/* HERO */}
      <section style={{
        textAlign: 'center',
        padding: '120px 20px',
        background: 'linear-gradient(135deg, #0078d4, #00aaff)',
        color: isDarkMode ? 'white' : '#111827'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', fontWeight: '600' }}>
          Transform Every Lecture Into Measurable Insight
        </h1>
        
        <p style={{ fontSize: '18px', maxWidth: '700px', margin: '0 auto 30px', color: isDarkMode ? '#d1d5db' : '#374151' }}>
          AI-powered classroom analysis that helps schools improve instruction, verify curriculum coverage, and drive student outcomes.
        </p>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <button onClick={() => { router.push("/analyze"); }} style={primaryBtn}>
            Try It Now
          </button>
          <button onClick={handleBookDemo} style={primaryBtn}>
            Book Demo
          </button>
        </div>
        
        <p style={{ marginTop: '15px', fontSize: '14px', color: isDarkMode ? '#d1d5db' : '#6b7280' }}>
          Upload a lecture and see instant results
        </p>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 20px', background: isDarkMode ? '#1f2937' : '#f9fafb', textAlign: 'center' }}>
        <p style={{ color: '#4caf50', fontWeight: 'bold', letterSpacing: '1px' }}>Key Features</p>
        <h2 style={{ fontSize: '32px', marginBottom: '50px', color: isDarkMode ? 'white' : '#1f2937' }}>
          What We Offer
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {[{ icon: '🧠', title: 'AI-Powered Analysis', desc: 'Analyze classroom performance with AI.' },
            { icon: '📋', title: 'Curriculum Alignment', desc: 'Verify TEKS and state standards coverage.' },
            { icon: '💡', title: 'Actionable Insights', desc: 'Get clear, immediate feedback.' }].map(({ icon, title, desc }) => (
            <div key={title} style={featureBubble}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '20px', marginBottom: '10px', color: isDarkMode ? '#fefefe' : '#111827' }}>{title}</h3>
              <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b', lineHeight: '1.6', fontSize: '15px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#f1f5f9' }}>
        <p style={{ color: '#4caf50', fontWeight: 'bold', letterSpacing: '1px' }}>How It Works</p>
        <h2 style={{ fontSize: '32px', marginBottom: '60px', color: '#111827' }}>Simple 3-Step Process</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {[
            { step: '1', icon: '📤', title: 'Upload Lecture', desc: 'Record live lectures or upload pre-recorded content.' },
            { step: '2', icon: '⚙️', title: 'AI Analysis', desc: 'Our AI evaluates the content for insights and alignment.' },
            { step: '3', icon: '📊', title: 'Get Feedback', desc: 'Receive immediate feedback and suggestions.' }
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={featureBubble}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#111827' }}>{title}</h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6', fontSize: '14px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #3498db, #2ecc71)', color: 'white' }}>
        <h2 style={{ fontSize: '56px', marginBottom: '50px', textAlign: 'center', fontWeight: '600' }}>
          Who It's For
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '3rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {[
            { icon: '👩‍🏫', title: 'Teachers', desc: 'Improve lesson delivery with real-time feedback.' },
            { icon: '🏫', title: 'Administrators', desc: 'Evaluate classrooms with AI-driven analysis.' },
            { icon: '🏙️', title: 'Districts', desc: 'Ensure curriculum coverage across multiple schools.' }
          ].map(({ icon, title, desc }) => (
            <div key={title} style={featureBubble}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>{icon}</div>
              <h3 style={{ fontSize: '24px', marginBottom: '10px', color: 'white' }}>{title}</h3>
              <p style={{ color: '#ffffff', lineHeight: '1.6', fontSize: '16px' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{
        textAlign: 'center',
        padding: '80px 20px',
        background: '#2d3748',
        color: 'white'
      }}>
        <h2>Ready to Transform Teaching?</h2>
        
        <p style={{ marginBottom: '20px' }}>
          Join schools using AI to improve instruction.
        </p>
        
        <button onClick={handleBookDemo} style={primaryBtn}>
          Book Demo
        </button>
      </section>
      
      {/* FOOTER */}
      <footer style={{ textAlign: 'center', padding: '40px' }}>
        <p>AlignEDU</p>
        <p>support@alignedu.net</p>
      </footer>

      {/* Light/Dark Mode Toggle Button */}
      <button onClick={toggleTheme} style={{
        position: 'fixed', 
        bottom: '20px', 
        left: '20px', 
        padding: '10px 20px', 
        fontSize: '14px', 
        cursor: 'pointer',
        backgroundColor: '#facc15',
        color: '#1e293b',
        borderRadius: '8px',
        border: 'none'
      }}>
        Toggle {isDarkMode ? 'Light' : 'Dark'} Mode
      </button>

    </main>
 
