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

    const chunkSeconds = 300;
    const chunkCount = Math.ceil(duration / chunkSeconds);
    const chunks: File[] = [];

    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * chunkSeconds;
      const currentChunkSeconds = Math.min(chunkSeconds, duration - start);
      const segmentName = `segment-${index}.wav`;

      setProcessingStep(`Creating chunk ${index + 1} of ${chunkCount}...`);

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

      const segmentBlob = new Blob([segmentBytes.buffer as ArrayBuffer], {
        type: "audio/wav",
      });

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

  const transcribeChunk = async (chunk: File, index: number, total: number) => {
    setProcessingStep(`Transcribing chunk ${index + 1} of ${total}...`);

    const chunkForm = new FormData();
    chunkForm.append("file", chunk);

    const chunkRes = await fetch("/api/transcribe", {
      method: "POST",
      body: chunkForm,
    });

    const chunkData = await chunkRes.json();

    if (!chunkRes.ok) {
      throw new Error(chunkData?.error || "Chunk transcription failed.");
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

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || data?.details || "Analysis failed, but system recovered.");
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

        {/* HEADER */}
        <div className="analysis-header">
          <h1>AI Lesson Analysis</h1>
          <p>Analyze your lesson with AI-powered instructional feedback.</p>
        </div>

        {/* INPUT CARD */}
        <div className="analysis-card">

          <div className="analysis-section-title">
            Lesson Input
          </div>

          <p className="analysis-subtitle">
            Provide your lesson in any format below.
          </p>

          {/* GRID INPUTS */}
          <div className="analysis-grid">

            <div className="analysis-field">
              <label>Grade</label>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Select Grade"
              />
            </div>

            <div className="analysis-field">
              <label>Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Math, ELA, Science"
              />
            </div>

          </div>

          <div className="analysis-field">
            <label>Lesson Notes</label>
            <textarea
              value={lessonNotes}
              onChange={(e) => setLessonNotes(e.target.value)}
              placeholder="Paste your lesson plan or notes..."
            />
          </div>

          {/* AUDIO */}
          <div className="analysis-field">
            <label>Upload Audio</label>

            <input
              type="file"
              accept="audio/*"
              onChange={(e) =>
                handleAudioChange(e.target.files?.[0] || null)
              }
            />

            <div className="analysis-audio-meta">
              {audioDuration !== null && (
                <p>Audio duration: {Math.round(audioDuration)} seconds</p>
              )}
              <p>Max 90 minutes. Audio is auto-split if needed.</p>
            </div>

            {/* UI ONLY BUTTON (no logic attached) */}
            <button
              type="button"
              className="secondary-button"
              onClick={() => {}}
            >
              Start Recording
            </button>
          </div>

          {/* ACTION */}
          <button
            className="primary-button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? processingStep || "Analyzing..." : "Analyze Lesson"}
          </button>

          {error && <div className="error-text">{error}</div>}

        </div>

        {/* RESULTS */}
        {result && (
          <div className="analysis-results">
            <h2>Results</h2>
            <pre>{result}</pre>
          </div>
        )}

      </div>
    </main>
  );
}