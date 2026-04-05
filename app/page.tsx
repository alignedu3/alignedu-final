// app/page.tsx
import React from 'react';
import './globals.css'; // Import global CSS

export default function HomePage() {
  return (
<<<<<<< HEAD
    <main className="homepage">
      {/* HERO SECTION */}
      <section className="hero">
        <div>
          <h1>AI That Turns Lectures Into Clear Understanding</h1>
          <p>
            AlignEDU analyzes lectures in real time, giving students and educators instant insights, summaries, and understanding.
=======
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="logo-container">
          <img src="/logo.png" alt="AlignEDU Logo" className="logo" />
        </div>
        <h1 className="hero-title">AlignEDU</h1>
        <p className="hero-subtitle">
          AI That Turns Lectures Into Clear Understanding
        </p>
        <p className="hero-description">
          AlignEDU analyzes lectures in real time, giving students and educators
          instant insights, summaries, and understanding.
        </p>
        <div className="cta-buttons">
          <button className="cta-button primary">Try It Free</button>
          <button className="cta-button secondary">See Demo</button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="feature">
          <h3 className="feature-title">AI Lecture Analysis</h3>
          <p className="feature-description">
            Instantly break down lectures into clear, structured insights.
>>>>>>> e9aea9952896125bedd91a1b4f9a9b1a35fef8bd
          </p>
          <div className="cta-buttons">
            <a href="#features" className="secondary-btn">Learn More</a>
            <a href="/analyze" className="primary-btn">Get Started</a>  
          </div>
        </div>
<<<<<<< HEAD
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
=======
        <div className="feature">
          <h3 className="feature-title">Real-Time Understanding</h3>
          <p className="feature-description">
            No more waiting — get immediate feedback on content.
          </p>
        </div>
        <div className="feature">
          <h3 className="feature-title">Learn Faster</h3>
          <p className="feature-description">
            Save time and improve comprehension with AI-powered learning.
          </p>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} AlignEDU</p>
      </footer>
    </div>
>>>>>>> e9aea9952896125bedd91a1b4f9a9b1a35fef8bd
  );
}
