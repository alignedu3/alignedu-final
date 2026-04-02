// app/page.tsx
import React from 'react';
import './globals.css'; // Import global CSS

export default function HomePage() {
  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="logo-container">
          <img src="/logo.png" alt="AlignEDU Logo" className="logo" />
        </div>
        <h1 className="hero-title">AlignEDU</h1>
        <p className="hero-subtitle">AI That Turns Lectures Into Clear Understanding</p>
        <p className="hero-description">
          AlignEDU analyzes lectures in real time, giving students and educators instant insights, summaries, and understanding.
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
          <p className="feature-description">Instantly break down lectures into clear, structured insights.</p>
        </div>
        <div className="feature">
          <h3 className="feature-title">Real-Time Understanding</h3>
          <p className="feature-description">No more waiting — get immediate feedback on content.</p>
        </div>
        <div className="feature">
          <h3 className="feature-title">Learn Faster</h3>
          <p className="feature-description">Save time and improve comprehension with AI-powered learning.</p>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="footer">
        <p>&copy; 2026 AlignEDU</p>
      </footer>
    </div>
  );
}
