// app/analyze/Login/page.tsx
"use client";  // Ensure this is at the very top

import React, { useState } from 'react';

<<<<<<< HEAD
export default function AnalyzePage() {
  const [result, setResult] = useState("");
  const [lessonNotes, setLessonNotes] = useState("");
  const [files, setFiles] = useState({
    curriculum: null,
    textbook: null,
    lessonPlan: null,
    audio: null,
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles((prev) => ({
        ...prev,
        [fileType]: file,
      }));
    }
  };

  const analyze = () => {
    setResult(`
Alignment Score: 82%

Strengths:
- Clear explanation of topic
- Strong structure

Improvements:
- Add more student engagement
- Improve pacing in middle section

Suggestions:
- Include interactive questions
- Add real-world examples

Note:
No curriculum or textbook provided. Analysis based on general teaching quality.
    `);
  };

  return (
    <div className="analyze-page">

      {/* LEFT SIDE */}
      <div className="analyze-left">
        <div className="panel">
          <h2>Lesson Input</h2>
          <p className="subtitle">
            Upload materials or paste your lesson for analysis.
          </p>

          <textarea
            placeholder="Paste lesson notes or transcript..."
            value={lessonNotes}
            onChange={(e) => setLessonNotes(e.target.value)}
            className="text-input"
          />

          <div className="divider">Materials</div>

          <div className="upload-group">
            <label>Curriculum</label>
            <input type="file" onChange={(e) => handleFileChange(e, "curriculum")} />
          </div>

          <div className="upload-group">
            <label>Textbook</label>
            <input type="file" onChange={(e) => handleFileChange(e, "textbook")} />
          </div>

          <div className="upload-group">
            <label>Lesson Plan</label>
            <input type="file" onChange={(e) => handleFileChange(e, "lessonPlan")} />
          </div>

          <div className="upload-group">
            <label>Audio Recording</label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => handleFileChange(e, "audio")}
            />
          </div>

          <button className="analyze-btn" onClick={analyze}>
            Analyze Lesson
          </button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="analyze-right">
        <div className="panel">
          <h2>AI Feedback</h2>

          {result ? (
            <div className="result-box">
              <pre>{result}</pre>
            </div>
          ) : (
            <div className="results-placeholder">
              Your analysis will appear here after submission.
            </div>
          )}
        </div>
      </div>

=======
const LoginPage = () => {
  const [email, setEmail] = useState('');

  return (
    <div>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        placeholder="Enter your email" 
      />
      <button>Login</button>
>>>>>>> e9aea9952896125bedd91a1b4f9a9b1a35fef8bd
    </div>
  );
};

export default LoginPage;
