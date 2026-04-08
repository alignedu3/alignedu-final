"use client";

import React, { useMemo, useRef, useState } from "react";

type ParsedSection = {
  title: string;
  content: string[];
};

export default function AnalysisPage() {
  const [lessonNotes, setLessonNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrlRef = useRef<string>("");

  const parsedSections = useMemo(() => parseAnalysisResult(result), [result]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAudioFile(e.target.files[0]);
      setError("");
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        setRecordedBlob(e.data);
        audioUrlRef.current = URL.createObjectURL(e.data);
        setAudioFile(null);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Microphone access was not available.");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    if (!lessonNotes && !audioFile && !recordedBlob) {
      setError("Please provide lesson notes, upload an audio file, or record audio.");
      return;
    }

    if (!grade || !subject) {
      setError("Please select both a grade and a subject.");
      return;
    }

    setLoading(true);
    setResult("");
    setError("");

    const formData = new FormData();
    formData.append("grade", grade);
    formData.append("subject", subject);

    if (lessonNotes) {
      formData.append("lecture", lessonNotes);
    }

    if (audioFile) {
      formData.append("file", audioFile);
    } else if (recordedBlob) {
      const blob = new Blob([recordedBlob], { type: "audio/wav" });
      formData.append("file", blob, "recorded-lesson.wav");
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.result || "Error analyzing lesson.");
      }

      setResult(data?.result || "Analysis completed, but no result was returned.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error analyzing lesson.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="analysis-wrapper">
      <div className="analysis-shell">
        <div className="analysis-header">
          <div className="analysis-badge">AI Lesson Analysis</div>
          <h1 className="analysis-title">Analyze Your Lesson</h1>
          <p className="analysis-subtitle">
            Upload a lesson, record classroom audio, or paste lesson notes to generate
            structured instructional feedback in minutes.
          </p>
        </div>

        <section className="analysis-panel">
          <div className="analysis-panel-grid">
            <div className="analysis-form-card">
              <div className="analysis-section-top">
                <h2>Start Analysis</h2>
                <p>
                  Select the grade and subject, then provide lesson notes or audio for
                  AI-supported instructional feedback.
                </p>
              </div>

              <div className="row">
                <div className="analysis-field-group">
                  <label className="analysis-label">Grade</label>
                  <select
                    className="analysis-select"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="">Select Grade</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={String(i + 1)}>
                        Grade {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="analysis-field-group">
                  <label className="analysis-label">Subject</label>
                  <select
                    className="analysis-select"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    <option value="math">Math</option>
                    <option value="science">Science</option>
                    <option value="history">History</option>
                    <option value="english">English</option>
                    <option value="biology">Biology</option>
                  </select>
                </div>
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Lesson Notes</label>
                <textarea
                  placeholder="Paste lesson notes, objectives, or a lesson summary here..."
                  value={lessonNotes}
                  onChange={(e) => setLessonNotes(e.target.value)}
                />
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Upload Audio</label>
                <input type="file" onChange={handleFileUpload} accept="audio/*" />
              </div>

              <div className="recording-section">
                {isRecording ? (
                  <button onClick={handleStopRecording} className="stop-btn" type="button">
                    Stop Recording
                  </button>
                ) : (
                  <button onClick={handleStartRecording} className="start-btn" type="button">
                    Start Recording
                  </button>
                )}
              </div>

              {recordedBlob && (
                <div className="audio-preview">
                  <audio controls src={audioUrlRef.current} />
                </div>
              )}

              {error ? <div className="analysis-error">{error}</div> : null}

              <div className="analysis-actions">
                <button
                  onClick={handleSubmit}
                  className="analyze-btn"
                  type="button"
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Analyze Lesson"}
                </button>
              </div>
            </div>

            <div className="analysis-side-card">
              <h3>What this report includes</h3>
              <ul className="analysis-side-list">
                <li>Overall lesson summary</li>
                <li>Instructional strengths</li>
                <li>Instructional gaps</li>
                <li>Recommendations for improvement</li>
                <li>Curriculum alignment notes</li>
              </ul>

              <div className="analysis-side-note">
                For the strongest demo, use a clear lesson summary or a short classroom
                recording with a selected grade and subject.
              </div>
            </div>
          </div>
        </section>

        <section className="analysis-results-card">
          <div className="analysis-results-header">
            <h2>Analysis Results</h2>
            <p>Your lesson feedback will appear below in a structured report format.</p>
          </div>

          <div className="analysis-results-body">
            {loading ? (
              <div className="analysis-loading">
                <div className="analysis-loading-dot" />
                <span>Running AI analysis...</span>
              </div>
            ) : result ? (
              parsedSections.length > 0 ? (
                <div className="analysis-report-grid">
                  {parsedSections.map((section) => (
                    <div key={section.title} className="analysis-report-card">
                      <h3 className="analysis-report-title">{section.title}</h3>

                      {section.content.some((item) => item.trim().startsWith("-")) ? (
                        <ul className="analysis-report-list">
                          {section.content.map((item, index) => (
                            <li key={`${section.title}-${index}`}>
                              {item.replace(/^-+\s*/, "").trim()}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="analysis-report-text">
                          {section.content.map((item, index) => (
                            <p key={`${section.title}-${index}`}>{item}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="analysis-result-text">{result}</div>
              )
            ) : (
              <div className="analysis-empty-state">
                Upload a lesson, recording, or notes to generate a client-ready instructional report.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function parseAnalysisResult(result: string): ParsedSection[] {
  if (!result.trim()) return [];

  const knownHeadings = [
    "Overall Summary",
    "Instructional Strengths",
    "Instructional Gaps",
    "Recommendations",
    "Curriculum Alignment Notes",
  ];

  const normalizedLines = result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const line of normalizedLines) {
    const cleaned = line.replace(/:$/, "");
    const matchedHeading = knownHeadings.find(
      (heading) => heading.toLowerCase() === cleaned.toLowerCase()
    );

    if (matchedHeading) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: matchedHeading, content: [] };
      continue;
    }

    if (!currentSection) {
      currentSection = { title: "Analysis", content: [] };
    }

    currentSection.content.push(line);
  }

  if (currentSection) sections.push(currentSection);

  return sections.filter((section) => section.content.length > 0);
}
