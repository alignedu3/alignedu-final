import React from 'react';
import '../globals.css';

export default function AnalysisPage() {
  return (
    <main className="analysis-page">
      <h1>Lesson Analysis</h1>
      <p>Upload lesson plans, textbooks, or audio recordings for instant AI analysis.</p>
      <input type="file" />
      <button className="analyze-button">Analyze</button>
    </main>
  );
}
