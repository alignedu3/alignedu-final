"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ParsedSection = {
  title: string;
  content: string[];
};

type ParsedAnalysis = {
  metrics: {
    coverageScore?: string;
    clarityRating?: string;
    gapsDetected?: string;
  };
  sections: ParsedSection[];
};

export default function AnalysisPage() {
  const router = useRouter();

  const [lessonNotes, setLessonNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrlRef = useRef<string>("");

  const parsedAnalysis = useMemo(() => parseAnalysisResult(result), [result]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAudioFile(e.target.files[0]);
      setError("");
      setRecordedBlob(null);

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = "";
      }
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
    setProcessingStep("Preparing lesson for analysis...");
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
      setProcessingStep("Uploading and transcribing lecture...");

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setProcessingStep("Generating instructional insights...");

      if (!res.ok) {
        throw new Error(data?.result || "Error analyzing lesson.");
      }

      setProcessingStep("Saving analysis...");
      setResult(data?.result || "Analysis completed, but no result was returned.");

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error analyzing lesson.");
    } finally {
      setLoading(false);
      setProcessingStep("");
    }
  };

  const { metrics, sections } = parsedAnalysis;

  return (
    <main className="analysis-wrapper">
      <div className="analysis-container">

        <div className="analysis-header">
          <div className="analysis-badge">AI Lesson Analysis</div>
          <h1 className="analysis-title">Analyze Your Lesson</h1>
          <p className="analysis-subtitle">
            Upload lesson notes, record audio, or submit files to receive structured AI feedback.
          </p>
        </div>

        <div className="analysis-panel-grid">

          <div className="analysis-form-card">

            <div className="analysis-section-top">
              <h2>Lesson Input</h2>
              <p>Provide your lesson in any format below.</p>
            </div>

            <div className="row">
              <div className="analysis-field-group">
                <label className="analysis-label">Grade</label>
                <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                  <option value="">Select Grade</option>
                  {[...Array(13)].map((_, i) => (
                    <option key={i} value={i === 0 ? "K" : i}>
                      {i === 0 ? "Kindergarten" : `Grade ${i}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Math, ELA, Science"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            <div className="analysis-field-group">
              <label className="analysis-label">Lesson Notes</label>
              <textarea
                placeholder="Paste your lesson plan or notes..."
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
              />
            </div>

            <div className="analysis-field-group">
              <label className="analysis-label">Upload Audio</label>
              <input type="file" accept="audio/*" onChange={handleFileUpload} />
            </div>

            <div className="recording-section">
              {!isRecording ? (
                <button className="start-btn" onClick={handleStartRecording}>
                  Start Recording
                </button>
              ) : (
                <button className="stop-btn" onClick={handleStopRecording}>
                  Stop Recording
                </button>
              )}

              {recordedBlob && (
                <audio controls src={audioUrlRef.current} />
              )}
            </div>

            {error && <div className="analysis-error">{error}</div>}

            <div className="submit-btn-container">
              <button
                className="analyze-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? processingStep || "Analyzing..." : "Analyze Lesson"}
              </button>
            </div>
          </div>

          <div className="analysis-side-card">
            <h3>Tips</h3>
            <ul className="analysis-side-list">
              <li>Include clear objectives</li>
              <li>Provide student interaction details</li>
              <li>Upload clear audio recordings</li>
            </ul>
          </div>

        </div>

        {result && (
          <div className="analysis-results-card">
            <div className="analysis-results-header">
              <h2>Analysis Results</h2>
            </div>
            <div className="analysis-result-text">
              {result}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

function parseAnalysisResult(text: string): ParsedAnalysis {
  if (!text) {
    return { metrics: {}, sections: [] };
  }

  return {
    metrics: {},
    sections: [
      {
        title: "Analysis",
        content: [text],
      },
    ],
  };
}