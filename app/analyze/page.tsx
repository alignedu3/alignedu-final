"use client";

import React, { useState, useRef } from "react";

export default function AnalysisPage() {
  const [lessonNotes, setLessonNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrlRef = useRef<string>("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      setRecordedBlob(e.data);
      audioUrlRef.current = URL.createObjectURL(e.data);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSubmit = async () => {
    if (!lessonNotes && !audioFile && !recordedBlob) {
      alert("Provide notes or audio");
      return;
    }

    if (!grade || !subject) {
      alert("Select grade and subject");
      return;
    }

    setLoading(true);
    setResult("");

    const formData = new FormData();
    formData.append("grade", grade);
    formData.append("subject", subject);

    // ✅ FIXED FIELD NAMES
    if (lessonNotes) formData.append("lecture", lessonNotes);

    if (audioFile) {
      formData.append("file", audioFile);
    } else if (recordedBlob) {
      const blob = new Blob([recordedBlob], { type: "audio/wav" });
      formData.append("file", blob);
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      console.error(err);
      alert("Error analyzing lesson");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analysis-container">
      <h1>Analyze Your Lesson</h1>

      <div className="form-group">
        <label>Grade</label>
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">Select Grade</option>
          {[...Array(12)].map((_, i) => (
            <option key={i} value={i + 1}>
              Grade {i + 1}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Subject</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">Select Subject</option>
          <option value="math">Math</option>
          <option value="science">Science</option>
          <option value="history">History</option>
        </select>
      </div>

      <textarea
        placeholder="Paste lesson notes..."
        value={lessonNotes}
        onChange={(e) => setLessonNotes(e.target.value)}
      />

      <input type="file" onChange={handleFileUpload} />

      <div className="recording">
        {isRecording ? (
          <button onClick={handleStopRecording}>Stop Recording</button>
        ) : (
          <button onClick={handleStartRecording}>Start Recording</button>
        )}
      </div>

      {recordedBlob && <audio controls src={audioUrlRef.current} />}

      <button onClick={handleSubmit}>
        {loading ? "Analyzing..." : "Analyze Lesson"}
      </button>

      {/* ✅ RESULTS */}
      {result && (
        <div className="result-box">
          <h2>Analysis Results</h2>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
