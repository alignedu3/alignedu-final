"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

// Simulate premium check (replace with real check if available)
const isPremium = true;

export default function AnalysisPage() {
    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement>(null);

    // Start recording
    const startRecording = async () => {
      setError("");
      setRecordedChunks([]);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
        };
        recorder.start();
        setIsRecording(true);
        setIsPaused(false);
      } catch (err) {
        setError("Microphone access denied or unavailable.");
      }
    };

    // Pause recording
    const pauseRecording = () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        setIsPaused(true);
      }
    };

    // Resume recording
    const resumeRecording = () => {
      if (mediaRecorder && mediaRecorder.state === "paused") {
        mediaRecorder.resume();
        setIsPaused(false);
      }
    };

    // Stop recording
    const stopRecording = () => {
      if (mediaRecorder && (mediaRecorder.state === "recording" || mediaRecorder.state === "paused")) {
        mediaRecorder.stop();
        setIsRecording(false);
        setIsPaused(false);
      }
    };

    // Save recording as file
    const saveRecording = () => {
      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        handleAudioChange(file);
        setRecordedChunks([]);
        if (audioPlayerRef.current) audioPlayerRef.current.src = URL.createObjectURL(blob);
      }
    };
  const router = useRouter();

  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonNotes, setLessonNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const gradeOptions = [
    'Pre-K',
    'Kindergarten',
    '1st Grade',
    '2nd Grade',
    '3rd Grade',
    '4th Grade',
    '5th Grade',
    '6th Grade',
    '7th Grade',
    '8th Grade',
    '9th Grade',
    '10th Grade',
    '11th Grade',
    '12th Grade',
    'Higher Ed',
  ];

  const subjectOptions = [
    'English Language Arts',
    'Reading',
    'Writing',
    'Literature',
    'Mathematics',
    'Algebra',
    'Geometry',
    'Statistics',
    'Science',
    'Biology',
    'Chemistry',
    'Physics',
    'Earth Science',
    'Environmental Science',
    'Social Studies',
    'History',
    'Geography',
    'Civics / Government',
    'Economics',
    'World Languages',
    'Computer Science',
    'Health',
    'Physical Education',
    'Art',
    'Music',
  ];

  const filePreviewCardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
    boxShadow: '0 24px 80px rgba(15,23,42,0.22)',
  };

  const filePreviewHeaderStyle: React.CSSProperties = {
    color: 'var(--accent)',
    fontSize: 13,
    letterSpacing: '0.16em',
    marginBottom: 14,
    textTransform: 'uppercase',
    fontWeight: 700,
  };

  const filePreviewBodyStyle: React.CSSProperties = {
    display: 'grid',
    gap: 12,
  };

  const fileTextStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 16,
    lineHeight: 1.5,
  };

  const fileMetaStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 13,
  };

  const resultCardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 20,
    padding: 22,
    marginTop: 26,
    boxShadow: '0 24px 80px rgba(15,23,42,0.18)',
  };

  const resultSectionStyle: React.CSSProperties = {
    background: 'var(--surface-card-solid)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    border: '1px solid rgba(148,163,184,0.08)',
  };

  const resultHeaderStyle: React.CSSProperties = {
    color: 'var(--accent)',
    marginBottom: 10,
    fontSize: 14,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };

  const resultTitleStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 18,
    marginBottom: 10,
  };

  const resultTextStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    lineHeight: 1.75,
    fontSize: 15,
    whiteSpace: 'pre-wrap',
  };

  const resultListStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    paddingLeft: 20,
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
  };

  const resultItemStyle: React.CSSProperties = {
    marginBottom: 8,
  };

  const resultLabelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    marginBottom: 6,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const summaryBarStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 16,
    marginBottom: 18,
  };

  const metricCardStyle: React.CSSProperties = {
    background: 'var(--surface-card-solid)',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 16,
    padding: 16,
    textAlign: 'center',
  };

  const metricLabelStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  };

  const metricValueStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 22,
    fontWeight: 700,
  };

  const metricSubtextStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 13,
    marginTop: 6,
  };

  const recorderCardStyle: React.CSSProperties = {
    marginBottom: 16,
    background: 'var(--surface-card-solid)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: 16,
    textAlign: 'center',
  };

  const recorderTitleStyle: React.CSSProperties = {
    color: 'var(--accent)',
    fontWeight: 800,
    marginBottom: 10,
    letterSpacing: '0.03em',
  };

  const recorderButtonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  };

  const recorderBtnBaseStyle: React.CSSProperties = {
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '8px 14px',
    fontWeight: 700,
    minWidth: 92,
  };

  const splitAudioIntoChunks = async (file: File, duration: number) => {
    const ffmpegModule = await import("@ffmpeg/ffmpeg");
    const { FFmpeg } = ffmpegModule;
    const ffmpeg = new FFmpeg();
    setProcessingStep("Loading audio splitter...");
    await ffmpeg.load();

    const extension = file.name.split(".").pop() || "mp3";
    const inputName = `input.${extension}`;
    const fileData = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, fileData);

    const chunkSeconds = 60;
    const chunkCount = Math.ceil(duration / chunkSeconds);
    const chunks: File[] = [];

    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * chunkSeconds;
      const currentChunkSeconds = Math.min(chunkSeconds, duration - start);
      const segmentName = `segment-${index}.wav`;

      setProcessingStep(
        `Creating chunk ${index + 1} of ${chunkCount}...`
      );

      await ffmpeg.exec([
        "-ss",
        `${start}`,
        "-i",
        inputName,
        "-t",
        `${currentChunkSeconds}`,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        segmentName,
      ]);

      const segmentData = await ffmpeg.readFile(segmentName);
      const segmentBytes =
        segmentData instanceof Uint8Array
          ? segmentData
          : new TextEncoder().encode(segmentData);
      const segmentBlob = new Blob([
        segmentBytes.buffer as ArrayBuffer,
      ], { type: "audio/wav" });

      chunks.push(
        new File([segmentBlob], segmentName, {
          type: "audio/wav",
        })
      );
      await ffmpeg.deleteFile(segmentName);
    }

    await ffmpeg.deleteFile(inputName);
    return chunks;
  };

  const resolveAudioDuration = async (file: File): Promise<number | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);

      audio.addEventListener('loadedmetadata', () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : null;
        URL.revokeObjectURL(url);
        resolve(duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(null);
      });
    });
  };

  const parseJsonOrText = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: text, transcript: "", result: null };
    }
  };

  const parseAnalysisResult = (text: string) => {
    if (!text) return [];

    const groups = text
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    return groups.map((chunk) => {
      const lines = chunk
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const firstLine = lines[0] || "";
      const titleCandidate = firstLine.replace(/^[-•*]\s*/, "");
      const isTitle = lines.length > 1 && !/^[-•*\s]/.test(firstLine);

      return {
        title: isTitle ? titleCandidate : "Summary",
        content: isTitle ? lines.slice(1).join("\n") : lines.join("\n"),
      };
    });
  };

  // ── FIX 1: updated regex to handle "(0-100)" in label ──
  const parseAnalysisMetrics = (text: string) => {
    const stringValue = (match: RegExpMatchArray | null) =>
      match ? Number(match[1]) : null;

    const score = stringValue(text.match(/Instructional Score[\s\S]*?:\s*([0-9]{1,3})/i));
    const coverage = stringValue(text.match(/Coverage[\s\S]*?:\s*([0-9]{1,3})/i));
    const clarity = stringValue(text.match(/Clarity[\s\S]*?:\s*([0-9]{1,3})/i));
    const engagement = stringValue(text.match(/Engagement[\s\S]*?:\s*([0-9]{1,3})/i));
    const gaps = stringValue(text.match(/Gaps(?:\s*Flagged)?[\s\S]*?:\s*([0-9]{1,3})/i));

    return {
      score: score ?? null,
      coverage: coverage ?? null,
      clarity: clarity ?? null,
      engagement: engagement ?? null,
      gaps: gaps ?? null,
    };
  };

  // Parse both instructional coaching and TEKS sections from response
  const parseFeedbackSections = (text: string) => {
    const coachingMatch = text.match(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===([\s\S]*?)(?====|$)/i);
    const teksMatch = text.match(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===([\s\S]*?)$/i);

    const parseSection = (content: string) => {
      if (!content) return [];
      const groups = content
        .split(/(?:^|\n)[-•*]\s+[A-Z][^\n:]*:\s*/)
        .filter(Boolean)
        .map(chunk => chunk.trim())
        .filter(Boolean);
      return groups;
    };

    return {
      coaching: coachingMatch ? parseSection(coachingMatch[1]) : [],
      teks: teksMatch ? parseSection(teksMatch[1]) : [],
    };
  };

  const resultSections = parseAnalysisResult(result);
  const resultMetrics = parseAnalysisMetrics(result);
  const feedbackSections = parseFeedbackSections(result);

  const transcribeChunk = async (chunk: File, index: number, total: number) => {
    setProcessingStep(`Transcribing chunk ${index + 1} of ${total}...`);
    const chunkForm = new FormData();
    chunkForm.append("file", chunk);

    const chunkRes = await fetch("/api/transcribe", {
      method: "POST",
      body: chunkForm,
    });

    const chunkData = await parseJsonOrText(chunkRes);
    if (!chunkRes.ok) {
      const message =
        chunkRes.status === 413 ||
        String(chunkData?.error || "").includes("Request Entity Too Large")
          ? "Audio chunk is too large. Try a shorter recording or smaller chunk size."
          : chunkData?.error || chunkData?.result || "Chunk transcription failed.";
      throw new Error(message);
    }

    return String(chunkData.transcript || "");
  };

  const handleAudioChange = (file: File | null) => {
    if (!file) {
      if (selectedFileUrl) {
        URL.revokeObjectURL(selectedFileUrl);
      }
      setAudioFile(null);
      setSelectedFileUrl(null);
      setAudioDuration(null);
      setError("");
      return;
    }

    if (selectedFileUrl) {
      URL.revokeObjectURL(selectedFileUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setSelectedFileUrl(url);
    setAudioDuration(null);
    setError("");

    const audio = new Audio(url);

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener("error", () => {
      setError("Unable to read audio duration. Please try a different file.");
      setSelectedFileUrl(null);
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError("");
      setResult("");
      setProcessingStep("Preparing analysis...");

      let resolvedDuration = audioDuration;
      if (audioFile && !resolvedDuration) {
        resolvedDuration = await resolveAudioDuration(audioFile);
        if (resolvedDuration) setAudioDuration(resolvedDuration);
      }

      if (audioFile && resolvedDuration && resolvedDuration > 5400) {
        setError("Audio is too long. Please upload a file shorter than 90 minutes.");
        setLoading(false);
        return;
      }

      let transcriptText = lessonNotes.trim();

      if (audioFile) {
        const spokenParts: string[] = [];

        // If duration is unknown or short, transcribe directly as one chunk.
        if (!resolvedDuration || resolvedDuration <= 60) {
          const spokenText = await transcribeChunk(audioFile, 0, 1);
          if (spokenText) spokenParts.push(spokenText);
        } else {
          setProcessingStep("Splitting audio into chunks...");
          const chunks = await splitAudioIntoChunks(audioFile, resolvedDuration);

          for (let index = 0; index < chunks.length; index += 1) {
            const spokenText = await transcribeChunk(chunks[index], index, chunks.length);
            if (spokenText) spokenParts.push(spokenText);
          }
        }

        const spokenText = spokenParts.join("\n\n");
        if (spokenText) {
          transcriptText = transcriptText
            ? `${transcriptText}\n\nAudio Transcript:\n${spokenText}`
            : spokenText;
        }
      }

      if (!transcriptText || transcriptText.length < 10) {
        setError("Please provide lesson notes or upload an audio file for transcription.");
        setLoading(false);
        return;
      }

      const analysisForm = new FormData();
      analysisForm.append("grade", grade);
      analysisForm.append("subject", subject);
      analysisForm.append("lecture", transcriptText);

      setProcessingStep("Sending for analysis...");

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: analysisForm,
      });

      const data = await parseJsonOrText(res);

      if (!res.ok) {
        setError(
          data?.error || data?.details || data?.result || "Analysis failed, but system recovered."
        );
        setResult(data?.result || "");
        setLoading(false);
        setProcessingStep("");
        return;
      }

      setProcessingStep("Finalizing results...");
      setResult(data?.result || "No result returned");

      // ── FIX 2: only redirect if logged in and saved ──
      if (data?.saved) {
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
      // ── END FIX 2 ──

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
      setProcessingStep("");
    }
  };

  return (
    <main className="analysis-wrapper">
      <div className="analysis-container">
        <div className="analysis-header">
          <span className="analysis-badge">Premium AI Insights</span>
          <h1 className="analysis-title">Lesson Analysis for Next-Level Teaching</h1>
          <p className="analysis-subtitle">
            Upload notes or audio and get an instructor-ready review with teaching scores, engagement signals, and targeted next steps.
          </p>
        </div>

        <div className="analysis-shell">
          <div className="analysis-panel-grid">
            <section className="analysis-form-card">
              <div className="analysis-section-top">
                <h2>Lesson submission</h2>
                <p>
                  Share your lesson details or audio recording and let our AI produce a polished coaching report.
                </p>
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  <option value="">Select grade level</option>
                  {gradeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Lesson Notes</label>
                <textarea
                  value={lessonNotes}
                  onChange={(e) => setLessonNotes(e.target.value)}
                  placeholder="Paste lesson here..."
                />
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Audio Upload</label>
                {isPremium && (
                  <div style={recorderCardStyle}>
                    <div style={recorderTitleStyle}>Premium Audio Recorder</div>

                    <div style={recorderButtonRowStyle}>
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={isRecording}
                        style={{ ...recorderBtnBaseStyle, background: '#22c55e', cursor: isRecording ? 'not-allowed' : 'pointer' }}
                      >
                        Record
                      </button>
                      <button
                        type="button"
                        onClick={pauseRecording}
                        disabled={!isRecording || isPaused}
                        style={{ ...recorderBtnBaseStyle, background: '#f59e0b', cursor: (!isRecording || isPaused) ? 'not-allowed' : 'pointer' }}
                      >
                        Pause
                      </button>
                      <button
                        type="button"
                        onClick={resumeRecording}
                        disabled={!isRecording || !isPaused}
                        style={{ ...recorderBtnBaseStyle, background: '#0ea5e9', cursor: (!isRecording || !isPaused) ? 'not-allowed' : 'pointer' }}
                      >
                        Resume
                      </button>
                    </div>

                    <div style={{ ...recorderButtonRowStyle, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={stopRecording}
                        disabled={!isRecording}
                        style={{ ...recorderBtnBaseStyle, background: '#ef4444', cursor: !isRecording ? 'not-allowed' : 'pointer' }}
                      >
                        Stop
                      </button>
                      <button
                        type="button"
                        onClick={saveRecording}
                        disabled={isRecording || recordedChunks.length === 0}
                        style={{ ...recorderBtnBaseStyle, background: '#f97316', cursor: (isRecording || recordedChunks.length === 0) ? 'not-allowed' : 'pointer' }}
                      >
                        Save
                      </button>
                    </div>

                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 6 }}>
                      {isRecording ? (isPaused ? 'Paused' : 'Recording...') : recordedChunks.length > 0 ? 'Ready to save or re-record.' : 'Click Record to begin.'}
                    </div>
                    <audio ref={audioPlayerRef} controls style={{ width: '100%', borderRadius: 8, marginTop: 8, display: recordedChunks.length > 0 ? 'block' : 'none' }} />
                  </div>
                )}
                <label className="upload-zone">
                  <input
                    className="upload-input"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioChange(e.target.files?.[0] || null)}
                  />
                  <div className="upload-zone-content">
                    <div className="upload-icon">🎙️</div>
                    <p>Click to upload your audio file.</p>
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>
                      Max 90 minutes. Longer files are split automatically.
                    </p>
                  </div>
                </label>
                {audioFile && (
                  <div style={filePreviewCardStyle}>
                    <div style={filePreviewHeaderStyle}>Selected audio file</div>
                    <div style={filePreviewBodyStyle}>
                      <div style={fileTextStyle}>{audioFile.name}</div>
                      <div style={fileMetaStyle}>
                        {audioDuration ? `${Math.round(audioDuration)}s` : 'Loading duration...'}
                      </div>
                      {selectedFileUrl && (
                        <audio controls src={selectedFileUrl} style={{ width: '100%', borderRadius: 12, marginTop: 12 }} />
                      )}
                    </div>
                  </div>
                )}
                {audioDuration !== null && (
                  <p style={{ marginTop: 8, color: "#94a3b8", fontSize: 14 }}>
                    Audio duration: {Math.round(audioDuration)} seconds
                  </p>
                )}
              </div>

              <div className="analysis-actions">
                <button className="analyze-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? processingStep || "Analyzing..." : "Analyze Lesson"}
                </button>
              </div>

              {error && <div className="analysis-error">{error}</div>}
            </section>

            <aside className="analysis-side-card">
              <h3>What you get</h3>
              <p>
                A premium report with instructional feedback, equity checks, and strategic next steps.
              </p>
              <ul className="analysis-side-list">
                <li>Instructional Score</li>
                <li>Coverage & clarity assessment</li>
                <li>Engagement and student signals</li>
                <li>Gaps, missed opportunities, and next steps</li>
              </ul>
            </aside>
          </div>

          {result && (
            <section style={resultCardStyle}>
              <div style={resultHeaderStyle}>Lesson Analysis</div>

              <div style={summaryBarStyle}>
                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}>Instructional Score</div>
                  <div style={metricValueStyle}>{resultMetrics.score ?? '—'}</div>
                  <div style={metricSubtextStyle}>Overall teaching quality</div>
                </div>
                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}>Coverage</div>
                  <div style={metricValueStyle}>{resultMetrics.coverage ?? '—'}</div>
                  <div style={metricSubtextStyle}>Standards & content scope</div>
                </div>
                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}>Clarity</div>
                  <div style={metricValueStyle}>{resultMetrics.clarity ?? '—'}</div>
                  <div style={metricSubtextStyle}>Instructional clarity</div>
                </div>
                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}>Engagement</div>
                  <div style={metricValueStyle}>{resultMetrics.engagement ?? '—'}</div>
                  <div style={metricSubtextStyle}>Student participation</div>
                </div>
              </div>

              {resultSections.length === 0 ? (
                <div style={resultTextStyle}>{result}</div>
              ) : (
                <>
                  {feedbackSections.coaching.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ ...resultTitleStyle, color: '#0f172a', fontSize: 16, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #e2e8f0' }}>🎓 Instructional Coaching Feedback</div>
                      {feedbackSections.coaching.map((item, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={resultTextStyle}>{item}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {feedbackSections.teks.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ ...resultTitleStyle, color: '#0369a1', fontSize: 16, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #cffafe' }}>📋 Texas TEKS Standards Alignment</div>
                      {feedbackSections.teks.map((item, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={resultTextStyle}>{item}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {resultSections.map((section, index) => {
                    const lines = section.content
                      .split(/\n/)
                      .map((line) => line.trim())
                      .filter(Boolean);

                    const hasBullets = lines.every((line) => /^[-•*]/.test(line));

                    return (
                      <div key={index} style={resultSectionStyle}>
                        {section.title && <div style={resultTitleStyle}>{section.title}</div>}
                        {hasBullets ? (
                          <ul style={resultListStyle}>
                            {lines.map((line, li) => (
                              <li key={li} style={resultItemStyle}>
                                {line.replace(/^[-•*]\s*/, '')}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={resultTextStyle}>{section.content}</div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}