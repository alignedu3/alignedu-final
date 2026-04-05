// app/page.tsx
import React from 'react';
import './globals.css'; // Import global CSS

export default function Home() {
  return (
    <main className="homepage">
      {/* HERO SECTION */}
      <section className="hero">
        <div>
          <h1>AI That Turns Lectures Into Clear Understanding</h1>
          <p>
            AlignEDU analyzes lectures in real time, giving students and educators instant insights, summaries, and understanding.
          </p>
          <div className="cta-buttons">
            <a href="#features" className="secondary-btn">Learn More</a>
            <a href="/analyze" className="primary-btn">Get Started</a>  
          </div>
        </div>
      </section>
      
      {/* FEATURES SECTION */}
      <section id="features" className="features">
        <h2>What We Offer</h2>
        <div className="feature-grid">
          <div className="feature-bubble">
            <h4>AI-Powered Analysis</h4>  
            <p>Instantly analyze lessons for alignment with curriculum standards.</p>
          </div>
          <div className="feature-bubble">
            <h4>Curriculum Alignment</h4> 
            <p>Ensure your lessons are aligned with educational standards for maximum effectiveness.</p>
          </div>
          <div className="feature-bubble">
            <h4>Gap Detection</h4>
            <p>Find gaps in your lesson plans and ensure no key topics are missed.</p>
          </div>
        </div>  
      </section>
      
      {/* CTA SECTION */}
      <section className="cta-section">
        <h2>Get Started Today</h2>
        <p>Transform your teaching with smart AI-driven insights.</p>
        <a href="/analyze" className="primary-btn">Try AlignEDU Free</a>
      </section>
    </main>
  );
}
