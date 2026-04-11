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

  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

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
    setAudioFile(file);
    setAudioDuration(null);
    setError("");

    if (!file) return;

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);

    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration);
      URL.revokeObjectURL(url);
    });

    audio.addEventListener("error", () => {
      setError("Unable to read audio duration. Please try a different file.");
      URL.revokeObjectURL(url);
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

      setTimeout(() => {
        router.refresh();
      }, 800);
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
            <section className="analysis-results-card">
              <div className="analysis-results-header">
                <h2>AI Analysis Result</h2>
                <p>Review the full coaching summary below.</p>
              </div>
              <div className="result-box analysis-results-body">
                <pre className="analysis-result-text">{result}</pre>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
