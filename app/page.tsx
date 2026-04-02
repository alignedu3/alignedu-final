// app/analyze/Login/page.tsx
"use client";  // Add this line to mark the component as a Client Component
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
}import { useState } from 'react';

export default function AnalyzePage() {
    const [file, setFile] = useState(null);
    const [feedback, setFeedback] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleAnalyzeClick = async () => {
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            setFeedback(data.feedback);
        }
    };

    return (
        <div>
            <h1>Upload Lesson Plan or Curriculum for Analysis</h1>
            
            <form>
                <label htmlFor="fileUpload">Upload File:</label>
                <input 
                    type="file" 
                    id="fileUpload" 
                    name="file" 
                    accept=".txt,.pdf,.docx,.jpg,.png"
                    onChange={handleFileChange} 
                />
                <button type="button" onClick={handleAnalyzeClick}>
                    Analyze
                </button>
            </form>

            {feedback && (
                <div>
                    <h2>Analysis Feedback</h2>
                    <p>{feedback}</p>
                </div>
            )}
        </div>
    );
}export default function Page() {
  return (
    <div>
      <section className="main-section">
        <h1>AlignEDU</h1>
        <p>AI that turns lectures into clear understanding. Improve student outcomes and teaching effectiveness with real-time insights.</p>
        <div>
          <button>Try it Free</button>
          <button>See Demo</button>
        </div>
      </section>

      <section className="features-container">
        <div className="feature">
          <h3>Real-Time Analysis</h3>
          <p>Get instant feedback on classroom instruction to make improvements on the fly.</p>
        </div>
        <div className="feature">
          <h3>Curriculum Alignment</h3>
          <p>Ensure lessons are on track with curriculum standards like TEKS and Common Core.</p>
        </div>
        <div className="feature">
          <h3>Actionable Insights</h3>
          <p>Receive summarized feedback to enhance teaching strategies and engagement.</p>
        </div>
      </section>
    </div>
  );
}
