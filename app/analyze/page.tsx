"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalysisPage() {
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

  const filePreviewCardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
    boxShadow: '0 24px 80px rgba(15,23,42,0.22)',
  };

  const filePreviewHeaderStyle: React.CSSProperties = {
    color: '#f97316',
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
    color: '#fff',
    fontSize: 16,
    lineHeight: 1.5,
  };

  const fileMetaStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: 13,
  };

  const resultCardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 20,
    padding: 22,
    marginTop: 26,
    boxShadow: '0 24px 80px rgba(15,23,42,0.18)',
  };

  const resultSectionStyle: React.CSSProperties = {
    background: '#111827',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    border: '1px solid rgba(148,163,184,0.08)',
  };

  const resultHeaderStyle: React.CSSProperties = {
    color: '#f97316',
    marginBottom: 10,
    fontSize: 14,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };

  const resultTitleStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  };

  const resultTextStyle: React.CSSProperties = {
    color: '#cbd5e1',
    lineHeight: 1.75,
    fontSize: 15,
    whiteSpace: 'pre-wrap',
  };

  const resultListStyle: React.CSSProperties = {
    color: '#cbd5e1',
    paddingLeft: 20,
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
  };

  const resultItemStyle: React.CSSProperties = {
    marginBottom: 8,
  };

  const resultLabelStyle: React.CSSProperties = {
    color: '#94a3b8',
    marginBottom: 6,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const summaryBarStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 16,
    marginBottom: 18,
  };

  const metricCardStyle: React.CSSProperties = {
    background: '#111827',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: 16,
    padding: 16,
    textAlign: 'center',
  };

  const metricLabelStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 8,
  };

  const metricValueStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
  };

  const metricSubtextStyle: React.CSSProperties = {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 6,
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
  // ── END FIX 1 ──

  const resultSections = parseAnalysisResult(result);
  const resultMetrics = parseAnalysisMetrics(result);

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

      if (audioFile && audioDuration && audioDuration > 5400) {
        setError("Audio is too long. Please upload a file shorter than 90 minutes.");
        setLoading(false);
        return;
      }

      let transcriptText = lessonNotes.trim();

      if (audioFile && audioDuration) {
        setProcessingStep("Splitting audio into chunks...");
        const chunks = await splitAudioIntoChunks(audioFile, audioDuration);

        const spokenParts: string[] = [];
        for (let index = 0; index < chunks.length; index += 1) {
          const spokenText = await transcribeChunk(chunks[index], index, chunks.length);
          if (spokenText) spokenParts.push(spokenText);
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
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Math"
                />
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
                resultSections.map((section, index) => {
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
                })
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}