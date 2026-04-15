"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Simulate premium check (replace with real check if available)
const isPremium = true;

type ReportSection = {
  title: string;
  content: string;
  bullets: string[];
};

const REPORT_HEADING_MAP: Record<string, string> = {
  "instructional coaching feedback": "Coaching Priorities",
  "texas teks standards alignment": "Standards Alignment",
  "staar teks coverage": "Assessment Readiness",
  metrics: "Performance Snapshot",
  summary: "Executive Summary",
};

function cleanDisplayText(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-•*]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeTitle(title: string) {
  const cleaned = cleanDisplayText(title)
    .replace(/^=+\s*/, "")
    .replace(/\s*=+$/, "")
    .replace(/:+$/, "")
    .trim();

  const mapped = REPORT_HEADING_MAP[cleaned.toLowerCase()];
  if (mapped) return mapped;
  if (!cleaned) return "Summary";
  return cleaned;
}

function cleanBulletText(line: string) {
  return cleanDisplayText(line)
    .replace(/^[-•*]\s*/, "")
    .replace(/^[0-9]+\.\s*/, "")
    .trim();
}

function parseLabeledSection(content: string): ReportSection[] {
  if (!content.trim()) return [];

  const matches = Array.from(
    content.matchAll(/(?:^|\n)\s*[-•*]\s*([^:\n]+):\s*([\s\S]*?)(?=(?:\n\s*[-•*]\s*[^:\n]+:\s*)|$)/g)
  );

  if (matches.length > 0) {
    return matches
      .map((match) => {
        const body = cleanDisplayText(match[2] || "");
        const bullets = body
          .split(/\n+/)
          .map((line) => cleanBulletText(line))
          .filter(Boolean);

        return {
          title: normalizeTitle(match[1] || "Summary"),
          content: body,
          bullets: bullets.length > 1 ? bullets : [],
        };
      })
      .filter((section) => section.content || section.bullets.length);
  }

  const fallback = cleanDisplayText(content);
  return fallback
    ? [{ title: "Summary", content: fallback, bullets: [] }]
    : [];
}

function parseAnalysisResult(text: string): ReportSection[] {
  if (!text) return [];

  const cleaned = cleanDisplayText(text)
    .replace(/Metrics:\s*[\s\S]*?(?=\n(?:===|[A-Z][A-Za-z\s]+:)|$)/i, "")
    .replace(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===/gi, "")
    .replace(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===/gi, "")
    .replace(/===\s*STAAR TEKS COVERAGE\s*===/gi, "")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const firstLine = lines[0] || "";
      const bodyLines = lines.slice(1);
      const isHeading =
        lines.length > 1 &&
        !/^[-•*]/.test(firstLine) &&
        !/^[0-9]+\./.test(firstLine) &&
        firstLine.length < 80;

      const content = cleanDisplayText(isHeading ? bodyLines.join("\n") : lines.join("\n"));
      const bullets = (isHeading ? bodyLines : lines)
        .filter((line) => /^[-•*]/.test(line) || /^[0-9]+\./.test(line))
        .map((line) => cleanBulletText(line))
        .filter(Boolean);

      return {
        title: normalizeTitle(isHeading ? firstLine : "Summary"),
        content,
        bullets: bullets.length === lines.length || bullets.length > 1 ? bullets : [],
      };
    })
    .filter((section) => section.content || section.bullets.length);
}

function parseAnalysisMetrics(text: string) {
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
}

function parseFeedbackSections(text: string) {
  const coachingMatch = text.match(/===\s*INSTRUCTIONAL COACHING FEEDBACK\s*===([\s\S]*?)(?====|$)/i);
  const teksMatch = text.match(/===\s*TEXAS TEKS STANDARDS ALIGNMENT\s*===([\s\S]*?)(?====|$)/i);
  const staarMatch = text.match(/===\s*STAAR TEKS COVERAGE\s*===([\s\S]*?)(?====|$)/i);

  return {
    coaching: coachingMatch ? parseLabeledSection(coachingMatch[1]) : [],
    teks: teksMatch ? parseLabeledSection(teksMatch[1]) : [],
    staar: staarMatch ? parseLabeledSection(staarMatch[1]) : [],
  };
}

function getScoreBand(score: number | null) {
  if (score === null) return { label: "Report Ready", tone: "#64748b" };
  if (score >= 85) return { label: "Strong Practice", tone: "#15803d" };
  if (score >= 70) return { label: "Solid With Refinements", tone: "#b45309" };
  return { label: "Priority Support Area", tone: "#b91c1c" };
}

export default function AnalysisPage() {
    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [recorderStatus, setRecorderStatus] = useState("");
    const audioPlayerRef = useRef<HTMLAudioElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingStreamRef = useRef<MediaStream | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const shouldAutoSaveOnStopRef = useRef(false);
    const wasStoppedForBackgroundRef = useRef(false);
    const previewUrlRef = useRef<string | null>(null);

    const attachPreviewUrl = (blob: Blob) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const previewUrl = URL.createObjectURL(blob);
      previewUrlRef.current = previewUrl;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = previewUrl;
      }
    };

    const finalizeRecordedChunks = (chunks: Blob[]) => {
      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: "audio/webm" });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
      handleAudioChange(file);
      attachPreviewUrl(blob);
      recordedChunksRef.current = [];
      setRecordedChunks([]);
    };

    // Start recording
    const startRecording = async () => {
      setError("");
      setRecorderStatus("");
      setRecordedChunks([]);
      recordedChunksRef.current = [];
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recordingStreamRef.current = stream;
        setMediaRecorder(recorder);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            recordedChunksRef.current = [...recordedChunksRef.current, e.data];
            setRecordedChunks([...recordedChunksRef.current]);
          }
        };
        recorder.onstop = () => {
          recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
          mediaRecorderRef.current = null;
          setMediaRecorder(null);
          setIsRecording(false);
          setIsPaused(false);

          if (shouldAutoSaveOnStopRef.current) {
            const chunks = [...recordedChunksRef.current];
            finalizeRecordedChunks(chunks);
            if (wasStoppedForBackgroundRef.current) {
              setRecorderStatus("Recording auto-saved after phone lock or app background.");
            }
          }

          shouldAutoSaveOnStopRef.current = false;
          wasStoppedForBackgroundRef.current = false;
        };
        recorder.start(1000);
        setIsRecording(true);
        setIsPaused(false);
        setRecorderStatus("Recording in progress.");
      } catch (err) {
        setError("Microphone access denied or unavailable.");
      }
    };

    // Pause recording
    const pauseRecording = () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        setIsPaused(true);
        setRecorderStatus("Recording paused.");
      }
    };

    // Resume recording
    const resumeRecording = () => {
      if (mediaRecorder && mediaRecorder.state === "paused") {
        mediaRecorder.resume();
        setIsPaused(false);
        setRecorderStatus("Recording resumed.");
      }
    };

    // Stop recording
    const stopRecording = () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && (recorder.state === "recording" || recorder.state === "paused")) {
        shouldAutoSaveOnStopRef.current = false;
        wasStoppedForBackgroundRef.current = false;
        try {
          recorder.requestData();
        } catch {
          // requestData can fail on some browsers; stop() still finalizes recording.
        }
        recorder.stop();
        setRecorderStatus("Recording stopped. Save when ready.");
      }
    };

    // Save recording as file
    const saveRecording = () => {
      const chunks = [...recordedChunksRef.current];
      if (chunks.length === 0) return;
      finalizeRecordedChunks(chunks);
      setRecorderStatus("Recording saved to audio upload.");
    };

    useEffect(() => {
      const autoStopAndSave = () => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;
        if (recorder.state !== "recording" && recorder.state !== "paused") return;

        shouldAutoSaveOnStopRef.current = true;
        wasStoppedForBackgroundRef.current = true;
        try {
          recorder.requestData();
        } catch {
          // requestData can fail on certain iOS browser states.
        }
        recorder.stop();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          autoStopAndSave();
        }
      };

      const handlePageHide = () => {
        autoStopAndSave();
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handlePageHide);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handlePageHide);
      };
    }, []);

    useEffect(() => {
      return () => {
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
      };
    }, []);
  const pathname = usePathname();
  const isAdminObservationMode = pathname?.startsWith('/admin/observe');

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
  const [saveNotice, setSaveNotice] = useState("");
  const [observerReady, setObserverReady] = useState(!isAdminObservationMode);
  const [observedTeacherId, setObservedTeacherId] = useState("");
  const [observedTeachers, setObservedTeachers] = useState<Array<{ id: string; name: string }>>([]);

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

  const reportIntroStyle: React.CSSProperties = {
    display: 'grid',
    gap: 14,
    marginBottom: 24,
  };

  const reportBannerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    paddingBottom: 18,
    borderBottom: '1px solid rgba(148,163,184,0.12)',
    marginBottom: 20,
  };

  const reportEyebrowStyle: React.CSSProperties = {
    color: 'var(--accent-blue)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: 800,
  };

  const reportHeadingStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 800,
    marginTop: 6,
  };

  const reportSubheadingStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 15,
    lineHeight: 1.7,
    maxWidth: 760,
  };

  const reportChipRowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
  };

  const reportChipStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid rgba(148,163,184,0.14)',
    background: 'rgba(15,23,42,0.18)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  const reportGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 18,
    marginTop: 24,
  };

  const reportPanelStyle: React.CSSProperties = {
    background: 'var(--surface-card-solid)',
    borderRadius: 18,
    padding: 20,
    border: '1px solid rgba(148,163,184,0.1)',
  };

  const reportPanelTitleStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 17,
    fontWeight: 750,
    marginBottom: 10,
  };

  const reportPanelTextStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 15,
    lineHeight: 1.75,
    whiteSpace: 'pre-wrap',
  };

  const reportPanelListStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    paddingLeft: 18,
    margin: 0,
    fontSize: 15,
    lineHeight: 1.7,
    display: 'grid',
    gap: 8,
  };

  const reportSectionHeadingStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 20,
    fontWeight: 800,
    margin: '28px 0 14px',
  };

  const reportSummaryStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 18,
    background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,23,42,0.08))',
    border: '1px solid rgba(56,189,248,0.18)',
  };

  const reportNoticeStyle: React.CSSProperties = {
    padding: '12px 14px',
    borderRadius: 14,
    border: '1px solid rgba(16,185,129,0.2)',
    background: 'rgba(16,185,129,0.12)',
    color: 'var(--text-primary)',
    fontSize: 14,
    marginTop: 16,
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

  const resultSections = parseAnalysisResult(result);
  const resultMetrics = parseAnalysisMetrics(result);
  const feedbackSections = parseFeedbackSections(result);
  const scoreBand = getScoreBand(resultMetrics.score);
  const executiveSummary =
    feedbackSections.coaching[0]?.content ||
    resultSections.find((section) => section.content)?.content ||
    "";

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

  useEffect(() => {
    if (!isAdminObservationMode) {
      setObserverReady(true);
      return;
    }

    let isMounted = true;

    const loadObservedTeachers = async () => {
      try {
        setObserverReady(false);

        const authResponse = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const authData = await authResponse.json();

        if (!authData?.user) {
          window.location.replace('/login');
          return;
        }

        if (!['admin', 'super_admin'].includes(authData?.profile?.role)) {
          window.location.replace('/dashboard');
          return;
        }

        const visibilityResponse = await fetch('/api/admin/visibility', {
          credentials: 'include',
          cache: 'no-store',
        });
        const visibility = await visibilityResponse.json();

        if (!visibilityResponse.ok || !visibility.success) {
          throw new Error(visibility.error || 'Unable to load teacher visibility');
        }

        const teacherIds = (visibility.teacherIds || []) as string[];
        if (!teacherIds.length) {
          if (!isMounted) return;
          setObservedTeachers([]);
          setObservedTeacherId('');
          setObserverReady(true);
          return;
        }

        const supabase = createClient();
        const { data: teacherProfiles, error: teacherError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', teacherIds)
          .eq('role', 'teacher');

        if (teacherError) {
          throw teacherError;
        }

        const teachers = (teacherProfiles || [])
          .map((teacher) => ({
            id: teacher.id,
            name: teacher.name || 'Teacher',
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!isMounted) return;

        setObservedTeachers(teachers);
        setObservedTeacherId((current) => {
          if (current && teachers.some((teacher) => teacher.id === current)) {
            return current;
          }
          return teachers[0]?.id || '';
        });
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load teachers for observation.');
      } finally {
        if (isMounted) {
          setObserverReady(true);
        }
      }
    };

    loadObservedTeachers();

    return () => {
      isMounted = false;
    };
  }, [isAdminObservationMode]);

  const handleSubmit = async () => {
    try {
      if (isAdminObservationMode && !observedTeacherId) {
        setError('Select a teacher to continue.');
        return;
      }

      setLoading(true);
      setError("");
      setResult("");
      setSaveNotice("");
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
      if (isAdminObservationMode) {
        analysisForm.append("observedTeacherId", observedTeacherId);
      }

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
      if (data?.saved) {
        setSaveNotice(
          isAdminObservationMode
            ? "Observation saved. Review the report below and return to the admin dashboard when you are ready."
            : "Analysis saved. Review the report below and return to your dashboard when you are ready."
        );
      }

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setProcessingStep("");
    }
  };

  return (
    <main className="analysis-wrapper">
      <div className="analysis-container">
        <div className="analysis-header">
          <span className="analysis-badge">{isAdminObservationMode ? 'Admin Observation' : 'Lesson Review'}</span>
          <h1 className="analysis-title">{isAdminObservationMode ? 'Observation Report Builder' : 'Instructional Review'}</h1>
          <p className="analysis-subtitle">
            {isAdminObservationMode
              ? 'Create a clear observation report for school and district leaders, with coaching priorities and standards alignment in one place.'
              : 'Generate a clean coaching report with clear strengths, priority moves, and standards-aligned feedback teachers can act on quickly.'}
          </p>
        </div>

        <div className="analysis-shell">
          <div className="analysis-panel-grid">
            <section className="analysis-form-card">
              <div className="analysis-section-top">
                <h2>Lesson submission</h2>
                <p>
                  Submit notes or audio to generate a concise instructional report built for teachers, campus leaders, and district teams.
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

              {isAdminObservationMode && (
                <div className="analysis-field-group">
                  <label className="analysis-label">Teacher Being Observed</label>
                  <select
                    value={observedTeacherId}
                    onChange={(e) => setObservedTeacherId(e.target.value)}
                    disabled={!observerReady || observedTeachers.length === 0}
                  >
                    {observedTeachers.length === 0 ? (
                      <option value="">No teachers available</option>
                    ) : (
                      observedTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

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
                  placeholder="Paste lesson notes, observation notes, or transcript excerpts..."
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
                      {recorderStatus || (isRecording ? (isPaused ? 'Paused' : 'Recording...') : recordedChunks.length > 0 ? 'Ready to save or re-record.' : 'Click Record to begin.')}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 8, opacity: 0.85 }}>
                      If your phone locks or app goes to background, recording auto-stops and saves to prevent data loss.
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
                <button className="analyze-btn" onClick={handleSubmit} disabled={loading || (isAdminObservationMode && (!observerReady || !observedTeacherId))}>
                  {loading ? processingStep || "Analyzing..." : "Analyze Lesson"}
                </button>
              </div>

              {error && <div className="analysis-error">{error}</div>}
            </section>

            <aside className="analysis-side-card">
              <h3>Report at a glance</h3>
              <p>
                A streamlined review designed to support classroom coaching, school leadership, and district reporting.
              </p>
              <ul className="analysis-side-list">
                <li>Clear performance snapshot</li>
                <li>Key strengths and coaching priorities</li>
                <li>Standards alignment and readiness notes</li>
                <li>Practical next steps for follow-up</li>
              </ul>
            </aside>
          </div>

          {result && (
            <section style={resultCardStyle}>
              <div style={reportBannerStyle}>
                <div style={reportIntroStyle}>
                  <div style={reportEyebrowStyle}>District-ready report</div>
                  <div style={reportHeadingStyle}>Lesson Review</div>
                  <div style={reportSubheadingStyle}>
                    A clean instructional summary built for quick review, coaching conversations, and leadership follow-up.
                  </div>
                </div>
                <div style={reportChipRowStyle}>
                  {grade && <div style={reportChipStyle}>{grade}</div>}
                  {subject && <div style={reportChipStyle}>{subject}</div>}
                  <div style={{ ...reportChipStyle, color: scoreBand.tone, borderColor: `${scoreBand.tone}33` }}>
                    {scoreBand.label}
                  </div>
                </div>
              </div>

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
                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}>Gaps</div>
                  <div style={metricValueStyle}>{resultMetrics.gaps ?? '—'}</div>
                  <div style={metricSubtextStyle}>Priority issues to address</div>
                </div>
              </div>

              {saveNotice && (
                <div style={reportNoticeStyle}>{saveNotice}</div>
              )}

              {resultSections.length === 0 && feedbackSections.coaching.length === 0 && feedbackSections.teks.length === 0 && feedbackSections.staar.length === 0 ? (
                <div style={{ ...reportSummaryStyle, marginTop: 22 }}>
                  <div style={reportPanelTextStyle}>{cleanDisplayText(result)}</div>
                </div>
              ) : (
                <>
                  {executiveSummary && (
                    <div style={reportSummaryStyle}>
                      <div style={reportPanelTitleStyle}>Executive Summary</div>
                      <div style={reportPanelTextStyle}>{executiveSummary}</div>
                    </div>
                  )}

                  {feedbackSections.coaching.length > 0 && (
                    <>
                      <div style={reportSectionHeadingStyle}>Coaching Priorities</div>
                      <div style={reportGridStyle}>
                        {feedbackSections.coaching.map((section, index) => (
                          <div key={index} style={reportPanelStyle}>
                            <div style={reportPanelTitleStyle}>{section.title}</div>
                            {section.bullets.length > 0 ? (
                              <ul style={reportPanelListStyle}>
                                {section.bullets.map((item, li) => (
                                  <li key={li}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <div style={reportPanelTextStyle}>{section.content}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {feedbackSections.staar.length > 0 && (
                    <>
                      <div style={reportSectionHeadingStyle}>Assessment Readiness</div>
                      <div style={reportGridStyle}>
                        {feedbackSections.staar.map((section, index) => (
                          <div key={index} style={reportPanelStyle}>
                            <div style={reportPanelTitleStyle}>{section.title}</div>
                            {section.bullets.length > 0 ? (
                              <ul style={reportPanelListStyle}>
                                {section.bullets.map((item, li) => (
                                  <li key={li}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <div style={reportPanelTextStyle}>{section.content}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {feedbackSections.teks.length > 0 && (
                    <>
                      <div style={reportSectionHeadingStyle}>Standards Alignment</div>
                      <div style={reportGridStyle}>
                        {feedbackSections.teks.map((section, index) => (
                          <div key={index} style={reportPanelStyle}>
                            <div style={reportPanelTitleStyle}>{section.title}</div>
                            {section.bullets.length > 0 ? (
                              <ul style={reportPanelListStyle}>
                                {section.bullets.map((item, li) => (
                                  <li key={li}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <div style={reportPanelTextStyle}>{section.content}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {resultSections.length > 0 && (
                    <>
                      <div style={reportSectionHeadingStyle}>Detailed Notes</div>
                      <div style={reportGridStyle}>
                        {resultSections.map((section, index) => (
                          <div key={index} style={reportPanelStyle}>
                            <div style={reportPanelTitleStyle}>{section.title}</div>
                            {section.bullets.length > 0 ? (
                              <ul style={reportPanelListStyle}>
                                {section.bullets.map((item, li) => (
                                  <li key={li}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <div style={reportPanelTextStyle}>{section.content}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
