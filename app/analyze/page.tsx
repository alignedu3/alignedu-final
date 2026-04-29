"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  cleanDisplayText,
  getScoreBand,
  parseAnalysisMetrics,
  parseAnalysisResult,
  parseFeedbackSections,
} from "@/lib/analysisReport";
import { fetchJsonWithTimeout } from "@/lib/fetchJsonWithTimeout";
import { getHigherEdBiologyObjectivesForChapter } from "@/lib/higherEdBiologyObjectives";

// Simulate premium check (replace with real check if available)
const isPremium = true;

type AnalysisMetricsState = {
  score: number | null;
  coverage: number | null;
  clarity: number | null;
  engagement: number | null;
  assessment: number | null;
  gaps: number | null;
};

const emptyAnalysisMetrics: AnalysisMetricsState = {
  score: null,
  coverage: null,
  clarity: null,
  engagement: null,
  assessment: null,
  gaps: null,
};

const ACTIVE_ANALYSIS_JOB_KEY = "active-analysis-job-id";

function formatDurationLabel(totalSeconds: number | null) {
  if (!totalSeconds || totalSeconds <= 0) return "Less than a minute";
  const rounded = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function estimateAnalysisProcessingSeconds(audioSeconds: number | null, chunkCount: number) {
  if (!audioSeconds || audioSeconds <= 0) {
    return 150;
  }

  const splittingSeconds = audioSeconds > 60 ? Math.min(210, Math.max(20, chunkCount * 3)) : 0;
  const uploadAndTranscriptionSeconds = Math.max(75, chunkCount * 10);
  const reportSeconds = Math.min(240, Math.max(75, audioSeconds / 32));

  return Math.round(splittingSeconds + uploadAndTranscriptionSeconds + reportSeconds);
}

function getChunkSecondsForDuration(duration: number) {
  if (duration >= 40 * 60) {
    return 5 * 60;
  }

  if (duration >= 15 * 60) {
    return 5 * 60;
  }

  if (duration >= 5 * 60) {
    return 2 * 60;
  }

  return 60;
}

export default function AnalysisPage() {
    const [isNarrowScreen, setIsNarrowScreen] = useState(false);
    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [recorderStatus, setRecorderStatus] = useState("");
    const audioPlayerRef = useRef<HTMLAudioElement>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);
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
      } catch {
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
  const router = useRouter();
  const isAdminObservationMode = pathname?.startsWith('/admin/observe');

  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [lessonNotes, setLessonNotes] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [analysisStartedAt, setAnalysisStartedAt] = useState<number | null>(null);
  const [elapsedAnalysisSeconds, setElapsedAnalysisSeconds] = useState(0);
  const [estimatedProcessingSeconds, setEstimatedProcessingSeconds] = useState<number | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const [analysisMetrics, setAnalysisMetrics] = useState<AnalysisMetricsState>(emptyAnalysisMetrics);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [observerReady, setObserverReady] = useState(!isAdminObservationMode);
  const [observedTeacherId, setObservedTeacherId] = useState("");
  const [observedTeachers, setObservedTeachers] = useState<Array<{ id: string; name: string }>>([]);

  const gradeOptions = [
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

  const isHigherEd = grade === 'Higher Ed';
  const isHigherEdBiology = isHigherEd && subject === 'Biology';
  const isHigherEdCustomText = isHigherEd && Boolean(subject) && subject !== 'Biology';
  const higherEdBiologyChapterOptions = Array.from({ length: 56 }, (_, index) => `Chapter ${index + 1}`);
  const higherEdChapterOptions = Array.from({ length: 40 }, (_, index) => `Chapter ${index + 1}`);
  const matchedBiologyObjectives = isHigherEdBiology ? getHigherEdBiologyObjectivesForChapter(chapter) : [];

  useEffect(() => {
    let isMounted = true;

    const loadViewerRole = async () => {
      try {
        if (!isMounted) return;
      } catch {
        // Allow analysis flow to continue even if the role prefetch fails.
      }
    };

    loadViewerRole();

    return () => {
      isMounted = false;
    };
  }, [isAdminObservationMode, router]);

  useEffect(() => {
    const updateScreen = () => setIsNarrowScreen(window.innerWidth <= 768);
    updateScreen();
    window.addEventListener('resize', updateScreen);
    return () => window.removeEventListener('resize', updateScreen);
  }, []);

  const applyCompletedJob = (job: {
    result?: string | null;
    metrics?: Partial<AnalysisMetricsState>;
  }) => {
    const returnedResult = job.result || "No result returned";
    const returnedMetrics = parseAnalysisMetrics(returnedResult);
    setResult(returnedResult);
    setAnalysisMetrics({
      score: typeof job.metrics?.score === "number" ? job.metrics.score : returnedMetrics.score,
      coverage: typeof job.metrics?.coverage === "number" ? job.metrics.coverage : returnedMetrics.coverage,
      clarity: typeof job.metrics?.clarity === "number" ? job.metrics.clarity : returnedMetrics.clarity,
      engagement: typeof job.metrics?.engagement === "number" ? job.metrics.engagement : returnedMetrics.engagement,
      assessment: typeof job.metrics?.assessment === "number" ? job.metrics.assessment : returnedMetrics.assessment,
      gaps: typeof job.metrics?.gaps === "number" ? job.metrics.gaps : returnedMetrics.gaps,
    });
  };

  const pollAnalysisJobUntilComplete = useCallback(async (jobId: string) => {
    setActiveJobId(jobId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ANALYSIS_JOB_KEY, jobId);
    }

    while (true) {
      const { response, data } = await fetchJsonWithTimeout<{
        success: boolean;
        error?: string;
        job?: {
          id: string;
          status: string;
          progressStep?: string | null;
          progressPercent?: number | null;
          error?: string | null;
          result?: string | null;
          metrics?: Partial<AnalysisMetricsState>;
          analysisId?: string | null;
        };
      }>(`/api/analyze/jobs/${jobId}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok || !data?.success || !data.job) {
        throw new Error(data?.error || "Unable to load analysis status.");
      }

      if (data.job.progressStep) {
        setProcessingStep(data.job.progressStep);
      }

      if (typeof data.job.progressPercent === "number" && estimatedProcessingSeconds) {
        const normalizedPercent = Math.max(1, Math.min(99, data.job.progressPercent));
        setElapsedAnalysisSeconds(Math.round((normalizedPercent / 100) * estimatedProcessingSeconds));
      }

      if (data.job.status === "completed") {
        applyCompletedJob(data.job);
        setSaveNotice(
          isAdminObservationMode
            ? "Observation saved. Review the report below and return to the admin dashboard when you are ready."
            : "Analysis saved. Review the report below and return to your dashboard when you are ready."
        );
        setActiveJobId(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ACTIVE_ANALYSIS_JOB_KEY);
        }
        return;
      }

      if (data.job.status === "failed") {
        setActiveJobId(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ACTIVE_ANALYSIS_JOB_KEY);
        }
        throw new Error(data?.error || data.job.error || "Analysis failed.");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 3000));
    }
  }, [estimatedProcessingSeconds, isAdminObservationMode]);

  useEffect(() => {
    if (typeof window === "undefined" || result) return;
    const savedJobId = window.localStorage.getItem(ACTIVE_ANALYSIS_JOB_KEY);
    if (!savedJobId) return;

    let cancelled = false;

    const resumeJob = async () => {
      try {
        setLoading(true);
        setActiveJobId(savedJobId);
        setProcessingStep("Reconnecting to your saved analysis...");
        await pollAnalysisJobUntilComplete(savedJobId);
      } catch (resumeError) {
        if (cancelled) return;
        setError(resumeError instanceof Error ? resumeError.message : "Unable to resume analysis status.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAnalysisStartedAt(null);
          setElapsedAnalysisSeconds(0);
        }
      }
    };

    void resumeJob();

    return () => {
      cancelled = true;
    };
  }, [result, isAdminObservationMode, pollAnalysisJobUntilComplete]);

  useEffect(() => {
    if (!loading || !analysisStartedAt) {
      setElapsedAnalysisSeconds(0);
      return;
    }

    setElapsedAnalysisSeconds(Math.max(0, Math.round((Date.now() - analysisStartedAt) / 1000)));
    const timer = window.setInterval(() => {
      setElapsedAnalysisSeconds(Math.max(0, Math.round((Date.now() - analysisStartedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [analysisStartedAt, loading]);

  const analysisProgress = useMemo(() => {
    if (!loading || !estimatedProcessingSeconds) return null;
    const percent = Math.min(96, Math.max(8, Math.round((elapsedAnalysisSeconds / estimatedProcessingSeconds) * 100)));
    const remainingSeconds = Math.max(0, estimatedProcessingSeconds - elapsedAnalysisSeconds);
    const isPastEstimate = elapsedAnalysisSeconds >= estimatedProcessingSeconds;

    return {
      percent,
      remainingSeconds,
      isPastEstimate,
    };
  }, [elapsedAnalysisSeconds, estimatedProcessingSeconds, loading]);

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
    minHeight: 138,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 8,
  };

  const featuredMetricCardStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(249,115,22,0.12) 0%, rgba(249,115,22,0.04) 100%)',
    border: '1px solid rgba(249,115,22,0.2)',
    minHeight: 172,
    padding: '18px 18px 16px',
    boxShadow: 'var(--shadow-soft)',
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
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
  };

  const featuredMetricValueStyle: React.CSSProperties = {
    fontSize: 48,
    color: '#c2410c',
  };

  const metricSubtextStyle: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: 13,
    marginTop: 0,
    minHeight: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.35,
  };

  const featuredMetricSubtextStyle: React.CSSProperties = {
    minHeight: 0,
    fontSize: 14,
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

  const reportHeadingStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 28,
    lineHeight: 1.1,
    fontWeight: 800,
    marginTop: 0,
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

  const reportStackStyle: React.CSSProperties = {
    display: 'grid',
    gap: 0,
    marginTop: 8,
    borderTop: '1px solid rgba(148,163,184,0.12)',
  };

  const reportPanelStyle: React.CSSProperties = {
    background: 'var(--surface-card-solid)',
    borderRadius: 18,
    padding: 20,
    border: '1px solid rgba(148,163,184,0.1)',
  };

  const reportSectionPanelStyle: React.CSSProperties = {
    ...reportPanelStyle,
    marginTop: 10,
  };

  const reportSectionRowStyle: React.CSSProperties = {
    padding: '18px 0',
    borderBottom: '1px solid rgba(148,163,184,0.12)',
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
    fontSize: 17,
    fontWeight: 750,
    margin: '28px 0 14px',
  };

  const reportMajorCardTitleStyle: React.CSSProperties = {
    color: 'var(--text-primary)',
    fontSize: 17,
    fontWeight: 750,
    marginBottom: 12,
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

  const actionClusterStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: 560,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const analyzeButtonLoadingStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 74,
    padding: '14px 18px 16px',
    borderRadius: 18,
    alignItems: 'stretch',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, rgba(249,115,22,0.96), rgba(251,146,60,0.95))',
    boxShadow: '0 18px 38px rgba(249, 115, 22, 0.22)',
  };

  const analyzeButtonIdleStyle: React.CSSProperties = {
    width: 'min(100%, 360px)',
    marginInline: 'auto',
  };

  const buttonStatusStackStyle: React.CSSProperties = {
    width: '100%',
    display: 'grid',
    gap: 10,
    textAlign: 'center',
  };

  const buttonStatusRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minWidth: 0,
  };

  const buttonPulseStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 0 0 6px rgba(255,255,255,0.14)',
    flexShrink: 0,
  };

  const buttonStatusTextStyle: React.CSSProperties = {
    color: '#ffffff',
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    fontWeight: 800,
    lineHeight: 1.3,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
  };

  const buttonMetaTextStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  };

  const buttonProgressTrackStyle: React.CSSProperties = {
    width: '100%',
    height: 8,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  };

  const buttonProgressFillStyle: React.CSSProperties = {
    height: '100%',
    borderRadius: 999,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.72) 0%, #fff 100%)',
    transition: 'width 0.5s ease',
  };

  const analysisStatusHintStyle: React.CSSProperties = {
    marginTop: 10,
    color: 'var(--text-secondary)',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.82,
    maxWidth: 420,
    marginInline: 'auto',
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

    const chunkSeconds = getChunkSecondsForDuration(duration);
    const chunkCount = Math.ceil(duration / chunkSeconds);
    const chunks: File[] = [];

    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * chunkSeconds;
      const currentChunkSeconds = Math.min(chunkSeconds, duration - start);
      const segmentName = `segment-${index}.mp3`;

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
        "-b:a",
        "64k",
        "-c:a",
        "libmp3lame",
        segmentName,
      ]);

      const segmentData = await ffmpeg.readFile(segmentName);
      const segmentBytes =
        segmentData instanceof Uint8Array
          ? segmentData
          : new TextEncoder().encode(segmentData);
      const segmentBlob = new Blob([
        segmentBytes.buffer as ArrayBuffer,
      ], { type: "audio/mpeg" });

      chunks.push(
        new File([segmentBlob], segmentName, {
          type: "audio/mpeg",
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

  const buildCombinedWaitTimeEvidence = (responses: Array<{
    responseWaitEvidence?: string;
    promptPauseCount?: number;
    averagePromptPauseSeconds?: number | null;
    longestPromptPauseSeconds?: number | null;
  }>) => {
    const totalPromptPauses = responses.reduce(
      (sum, item) => sum + (typeof item.promptPauseCount === "number" ? item.promptPauseCount : 0),
      0
    );
    const weightedPauseSeconds = responses.reduce((sum, item) => {
      if (
        typeof item.promptPauseCount === "number" &&
        item.promptPauseCount > 0 &&
        typeof item.averagePromptPauseSeconds === "number"
      ) {
        return sum + item.promptPauseCount * item.averagePromptPauseSeconds;
      }
      return sum;
    }, 0);
    const longestPause = responses.reduce((longest, item) => {
      if (typeof item.longestPromptPauseSeconds === "number") {
        return Math.max(longest, item.longestPromptPauseSeconds);
      }
      return longest;
    }, 0);

    if (totalPromptPauses > 0) {
      const averagePause = weightedPauseSeconds / totalPromptPauses;
      return `Audio timing evidence: across the submitted audio, ${totalPromptPauses} likely prompt-response pause${totalPromptPauses === 1 ? "" : "s"} of at least 4 seconds were detected. Average detected pause: ${averagePause.toFixed(
        1
      )} seconds. Longest detected pause: ${longestPause.toFixed(
        1
      )} seconds. Use this as supporting evidence that student think time may be present even when silence is not visible in the transcript text.`;
    }

    return responses
      .map((item) => String(item.responseWaitEvidence || "").trim())
      .find(Boolean) || "";
  };

  const transcribeAudioChunks = async (chunks: File[]) => {
    if (chunks.length === 0) {
      return { transcript: "", waitTimeEvidence: "" };
    }

    const responses = new Array<{
      transcript?: string;
      responseWaitEvidence?: string;
      promptPauseCount?: number;
      averagePromptPauseSeconds?: number | null;
      longestPromptPauseSeconds?: number | null;
      error?: string;
    }>(chunks.length);
    let nextIndex = 0;
    let completed = 0;
    const workerCount = Math.min(2, chunks.length);

    const worker = async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        if (currentIndex >= chunks.length) {
          return;
        }

        setProcessingStep(
          chunks.length > 1
            ? `Transcribing audio ${currentIndex + 1} of ${chunks.length}...`
            : "Transcribing audio..."
        );

        const transcriptionForm = new FormData();
        transcriptionForm.append("file", chunks[currentIndex]);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: transcriptionForm,
          credentials: "include",
        });

        const data = await parseJsonOrText(response);
        if (!response.ok) {
          throw new Error(data?.error || "Audio transcription failed.");
        }

        responses[currentIndex] = data;
        completed += 1;

        setProcessingStep(
          chunks.length > 1
            ? `Transcribed ${completed} of ${chunks.length} audio chunks...`
            : "Audio transcription complete."
        );
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const transcript = responses
      .map((item, index) => {
        const spokenText = String(item?.transcript || "").trim();
        if (!spokenText) return "";
        if (chunks.length === 1) return spokenText;
        return `[Transcript chunk ${index + 1} of ${chunks.length}]\n${spokenText}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return {
      transcript,
      waitTimeEvidence: buildCombinedWaitTimeEvidence(responses),
    };
  };

  const resultSections = parseAnalysisResult(result);
  const parsedResultMetrics = parseAnalysisMetrics(result);
  const resultMetrics = {
    score: analysisMetrics.score ?? parsedResultMetrics.score,
    coverage: analysisMetrics.coverage ?? parsedResultMetrics.coverage,
    clarity: analysisMetrics.clarity ?? parsedResultMetrics.clarity,
    engagement: analysisMetrics.engagement ?? parsedResultMetrics.engagement,
    assessment: analysisMetrics.assessment ?? parsedResultMetrics.assessment,
    gaps: analysisMetrics.gaps ?? parsedResultMetrics.gaps,
  };
  const feedbackSections = parseFeedbackSections(result);
  const standardsRecommendationSections = feedbackSections.teks.filter(
    (section) =>
      section.title === "Recommendations for Standards Integration" ||
      section.title === "Recommended Standards Follow-Up" ||
      section.title === "STAAR Readiness Recommendation"
  );
  const standardsAlignmentSections = feedbackSections.teks.filter(
    (section) =>
      section.title !== "Recommendations for Standards Integration" &&
      section.title !== "Recommended Standards Follow-Up" &&
      section.title !== "STAAR Readiness Recommendation"
  );
  const standardsMasterySection = standardsAlignmentSections.find(
    (section) => section.title === "Standards Mastery Notes"
  );
  const allHigherEdAlignmentSections = feedbackSections.higherEdAlignment ?? [];
  const higherEdAlignmentSections = allHigherEdAlignmentSections.filter(
    (section) => !["Textbook Alignment", "Summary"].includes(section.title)
  );
  const hasHigherEdAlignment = allHigherEdAlignmentSections.length > 0;
  const readinessSummarySection = feedbackSections.staar.find(
    (section) => section.title === "Readiness Summary"
  );
  const standardsSummary =
    standardsMasterySection?.content ||
    readinessSummarySection?.content ||
    allHigherEdAlignmentSections.find((section) =>
      ["Textbook Alignment", "Summary"].includes(section.title)
    )?.content ||
    "";
  const coveredStandardsSections = standardsAlignmentSections.filter((section) =>
    ["Standards Reinforced", "Standards Addressed", "Covered in the Lesson"].includes(section.title)
  );
  const reinforcementStandardsSections = standardsAlignmentSections.filter((section) =>
    ["Standards That Need Stronger Assessment Evidence", "Standards To Revisit", "Needs Reinforcement"].includes(section.title)
  );
  const notCoveredStandardsSections = standardsAlignmentSections.filter((section) =>
    ["Standards Not Observed", "Not Covered in the Lesson"].includes(section.title)
  );
  const standardsSectionHeading = "Standards Alignment";
  const standardsSummaryTitle = hasHigherEdAlignment ? "Textbook Alignment" : "Standards Summary";
  const findCoachingSection = (...titles: string[]) =>
    feedbackSections.coaching.find((section) => titles.includes(section.title));
  const suggestedNextStepsSection = findCoachingSection("Suggested Next Steps");
  const reportStrengths = feedbackSections.whatWentWell;
  const reportImprovements = feedbackSections.whatCanImprove;
  const contentGapItems = feedbackSections.contentGaps.flatMap((section) => {
    if (section.bullets.length > 0) return section.bullets;
    return section.content
      ? section.content
          .split(/\n+/)
          .map((line) => line.replace(/^[0-9]+\.\s*/, '').trim())
          .filter(Boolean)
      : [];
  });
  const recommendedNextStepText =
    suggestedNextStepsSection?.content ||
    (suggestedNextStepsSection?.bullets.length ? suggestedNextStepsSection.bullets.join(' ') : '') ||
    feedbackSections.recommendedNextStep ||
    "";
  const submissionContextText = feedbackSections.submissionContext
    .map((section) => {
      if (section.bullets.length > 0) {
        return section.bullets.join(' · ');
      }
      if (section.title && section.title !== 'Summary' && section.content) {
        return `${section.title}: ${section.content}`;
      }
      return section.content;
    })
    .filter(Boolean)
    .join(' · ');
  const scoreBand = getScoreBand(resultMetrics.score);
  const executiveSummary =
    feedbackSections.executiveSummary ||
    feedbackSections.coaching[0]?.content ||
    resultSections.find((section) => section.content)?.content ||
    "";
  const renderedSectionFingerprints = new Set<string>();
  const registerRenderedText = (value: string) => {
    const cleaned = cleanDisplayText(value).toLowerCase().trim();
    if (cleaned) {
      renderedSectionFingerprints.add(cleaned);
    }
  };

  registerRenderedText(executiveSummary);
  registerRenderedText(recommendedNextStepText);
  feedbackSections.whatWentWell.forEach(registerRenderedText);
  feedbackSections.whatCanImprove.forEach(registerRenderedText);
  contentGapItems.forEach(registerRenderedText);

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

  const openAudioPicker = () => {
    if (!uploadInputRef.current) return;
    // Reset the value so re-selecting the same recording still triggers onChange.
    uploadInputRef.current.value = '';
    uploadInputRef.current.click();
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
        setError('');
        const { response, data } = await fetchJsonWithTimeout<{
          success: boolean;
          error?: string;
          teachers?: Array<{ id: string; name: string }>;
        }>('/api/admin/observe/teachers', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (response.status === 401) {
          window.location.replace('/login');
          return;
        }

        if (response.status === 403) {
          window.location.replace('/dashboard');
          return;
        }

        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Unable to load teachers for observation.');
        }

        const teachers = (data.teachers || []) as Array<{ id: string; name: string }>;
        if (!teachers.length) {
          if (!isMounted) return;
          setObservedTeachers([]);
          setObservedTeacherId('');
          setObserverReady(true);
          return;
        }

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
      setAnalysisStartedAt(Date.now());
      setError("");
      setResult("");
      setAnalysisMetrics(emptyAnalysisMetrics);
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

      const transcriptText = lessonNotes.trim();
      let audioChunksForAnalysis: File[] = [];
      let nextEstimatedChunkCount = 1;

      if (audioFile) {
        if (!resolvedDuration || resolvedDuration <= 60) {
          audioChunksForAnalysis = [audioFile];
        } else {
          setProcessingStep("Splitting audio into chunks...");
          audioChunksForAnalysis = await splitAudioIntoChunks(audioFile, resolvedDuration);
        }
        nextEstimatedChunkCount = audioChunksForAnalysis.length || 1;
      }

      setEstimatedProcessingSeconds(
        estimateAnalysisProcessingSeconds(
          resolvedDuration ?? audioDuration ?? null,
          audioFile ? nextEstimatedChunkCount : 1
        )
      );

      let combinedTranscriptText = transcriptText;
      let waitTimeEvidence = "";

      if (audioChunksForAnalysis.length > 0) {
        const transcriptionResult = await transcribeAudioChunks(audioChunksForAnalysis);
        if (transcriptionResult.transcript) {
          combinedTranscriptText = combinedTranscriptText
            ? `${combinedTranscriptText}\n\nAudio Transcript:\n${transcriptionResult.transcript}`
            : transcriptionResult.transcript;
        }
        waitTimeEvidence = transcriptionResult.waitTimeEvidence;
      }

      if (!combinedTranscriptText) {
        setError("Please provide lesson notes or upload an audio file for transcription.");
        setLoading(false);
        return;
      }

      const analysisForm = new FormData();
      analysisForm.append("grade", grade);
      analysisForm.append("subject", subject);
      analysisForm.append("book", book.trim());
      analysisForm.append("chapter", chapter.trim());
      if (combinedTranscriptText) {
        analysisForm.append("lecture", combinedTranscriptText);
      }
      if (typeof resolvedDuration === "number" && Number.isFinite(resolvedDuration)) {
        analysisForm.append("audioDuration", String(Math.round(resolvedDuration)));
      }
      if (waitTimeEvidence) {
        analysisForm.append("waitTimeEvidence", waitTimeEvidence);
      }
      if (isAdminObservationMode) {
        analysisForm.append("observedTeacherId", observedTeacherId);
      }

      setProcessingStep("Sending transcript for analysis...");

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

      if (data?.result) {
        const returnedResult = data.result || "No result returned";
        const returnedMetrics = parseAnalysisMetrics(returnedResult);
        setResult(returnedResult);
        setAnalysisMetrics({
          score:
            typeof data?.metrics?.score === 'number'
              ? data.metrics.score
              : typeof data?.score === 'number'
                ? data.score
                : returnedMetrics.score,
          coverage: typeof data?.metrics?.coverage === 'number' ? data.metrics.coverage : returnedMetrics.coverage,
          clarity: typeof data?.metrics?.clarity === 'number' ? data.metrics.clarity : returnedMetrics.clarity,
          engagement: typeof data?.metrics?.engagement === 'number' ? data.metrics.engagement : returnedMetrics.engagement,
          assessment: typeof data?.metrics?.assessment === 'number' ? data.metrics.assessment : returnedMetrics.assessment,
          gaps: typeof data?.metrics?.gaps === 'number' ? data.metrics.gaps : returnedMetrics.gaps,
        });
        if (data?.saved) {
          setSaveNotice(
            isAdminObservationMode
              ? "Observation saved. Review the report below and return to the admin dashboard when you are ready."
              : "Analysis saved. Review the report below and return to your dashboard when you are ready."
          );
        }
        return;
      }

      if (!data?.jobId) {
        throw new Error("Analysis job was created without an id.");
      }

      setProcessingStep(data?.progressStep || "Queued for analysis...");
      await pollAnalysisJobUntilComplete(String(data.jobId));

    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setProcessingStep("");
      setAnalysisStartedAt(null);
      setElapsedAnalysisSeconds(0);
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
                  Record live in the app or upload an audio recording, including a phone voice memo, to generate a concise instructional report built for teachers, campus leaders, and district teams.
                </p>
              </div>

              <div className="analysis-field-group">
                <label className="analysis-label">Grade</label>
                <select
                  value={grade}
                  onChange={(e) => {
                    const nextGrade = e.target.value;
                    setGrade(nextGrade);
                    if (nextGrade !== 'Higher Ed') {
                      setBook('');
                      setChapter('');
                    }
                  }}
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
                  onChange={(e) => {
                    const nextSubject = e.target.value;
                    setSubject(nextSubject);
                    if (grade !== 'Higher Ed') return;
                    if (nextSubject === 'Biology') {
                      setBook('');
                      return;
                    }
                    setChapter('');
                  }}
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {isHigherEd && (
                <>
                  <div className="analysis-context-grid">
                  {isHigherEdCustomText && (
                    <div className="analysis-field-group">
                      <label className="analysis-label">Book</label>
                      <input
                        type="text"
                        value={book}
                        onChange={(e) => setBook(e.target.value)}
                        placeholder="Type the textbook being used"
                      />
                    </div>
                  )}

                  <div className="analysis-field-group">
                    <label className="analysis-label">
                      {isHigherEdBiology ? 'Campbell Biology Chapter' : 'Chapter'}
                    </label>
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                    >
                      <option value="">Select chapter</option>
                      {(isHigherEdBiology ? higherEdBiologyChapterOptions : higherEdChapterOptions).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  </div>

                  <p className="analysis-context-note">
                    {isHigherEdBiology
                      ? 'Compared against your Campbell Biology reference, with course objectives inferred from the selected chapter.'
                      : 'Compared against the selected textbook and chapter.'}
                  </p>
                  {isHigherEdBiology && matchedBiologyObjectives.length > 0 && (
                    <div className="analysis-context-note" style={{ marginTop: 10 }}>
                      <strong>Matched objectives:</strong> {matchedBiologyObjectives.join(' ')}
                    </div>
                  )}
                </>
              )}

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
                <div
                  className="upload-zone"
                  role="button"
                  tabIndex={0}
                  onClick={openAudioPicker}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openAudioPicker();
                    }
                  }}
                >
                  <input
                    ref={uploadInputRef}
                    className="upload-input"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioChange(e.target.files?.[0] || null)}
                  />
                  <div className="upload-zone-content">
                    <div className="upload-icon">🎙️</div>
                    <p>Upload an audio recording, including a phone voice memo.</p>
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>
                      Max 90 minutes. Longer files are split automatically.
                    </p>
                  </div>
                </div>
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
                <div style={actionClusterStyle}>
                  <button
                    className="analyze-btn"
                    onClick={handleSubmit}
                    disabled={loading || (isAdminObservationMode && (!observerReady || !observedTeacherId || !subject.trim()))}
                    style={loading ? analyzeButtonLoadingStyle : analyzeButtonIdleStyle}
                  >
                    {loading ? (
                      <span style={buttonStatusStackStyle}>
                        <span style={buttonStatusRowStyle}>
                          <span style={buttonPulseStyle} />
                          <span style={buttonStatusTextStyle}>
                            {processingStep || "Analyzing lesson..."}
                          </span>
                        </span>
                        <span style={buttonProgressTrackStyle}>
                          <span
                            style={{
                              ...buttonProgressFillStyle,
                              display: 'block',
                              width: `${analysisProgress?.percent ?? 12}%`,
                            }}
                          />
                        </span>
                        <span style={buttonMetaTextStyle}>
                          {analysisProgress
                            ? analysisProgress.isPastEstimate
                              ? 'Wrapping up...'
                              : `${formatDurationLabel(analysisProgress.remainingSeconds)} left`
                            : `Elapsed ${formatDurationLabel(elapsedAnalysisSeconds)}`}
                        </span>
                      </span>
                    ) : (
                      "Analyze Lesson"
                    )}
                  </button>
                  {loading && activeJobId && (
                    <div style={analysisStatusHintStyle}>
                      Saved progress is being tracked in the background.
                    </div>
                  )}
                </div>
              </div>

              {error && <div className="analysis-error">{error}</div>}
            </section>

            {!result && (
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
            )}
          </div>

          {result && (
            <section style={resultCardStyle}>
              <div style={reportBannerStyle}>
                <div style={reportIntroStyle}>
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

              <div
                style={{
                  ...summaryBarStyle,
                  gridTemplateColumns: isNarrowScreen ? 'repeat(2, minmax(0, 1fr))' : summaryBarStyle.gridTemplateColumns,
                  gap: isNarrowScreen ? 12 : summaryBarStyle.gap,
                }}
              >
                <div
                  style={{
                    ...metricCardStyle,
                    ...featuredMetricCardStyle,
                    gridColumn: isNarrowScreen ? '1 / -1' : 'span 2',
                    minHeight: isNarrowScreen ? 156 : featuredMetricCardStyle.minHeight,
                    padding: isNarrowScreen ? '18px 18px 16px' : featuredMetricCardStyle.padding,
                  }}
                >
                  <div style={metricLabelStyle}>Instructional Score</div>
                  <div style={{ ...metricValueStyle, ...featuredMetricValueStyle, fontSize: isNarrowScreen ? 44 : featuredMetricValueStyle.fontSize }}>
                    {resultMetrics.score ?? '—'}
                  </div>
                  <div style={{ ...metricSubtextStyle, ...featuredMetricSubtextStyle }}>Overall teaching quality</div>
                </div>
                <div style={{ ...metricCardStyle, minHeight: isNarrowScreen ? 122 : metricCardStyle.minHeight, padding: isNarrowScreen ? '14px 12px' : metricCardStyle.padding }}>
                  <div style={metricLabelStyle}>Coverage</div>
                  <div style={metricValueStyle}>{resultMetrics.coverage ?? '—'}</div>
                  <div style={metricSubtextStyle}>Standards & content scope</div>
                </div>
                <div style={{ ...metricCardStyle, minHeight: isNarrowScreen ? 122 : metricCardStyle.minHeight, padding: isNarrowScreen ? '14px 12px' : metricCardStyle.padding }}>
                  <div style={metricLabelStyle}>Clarity</div>
                  <div style={metricValueStyle}>{resultMetrics.clarity ?? '—'}</div>
                  <div style={metricSubtextStyle}>Instructional clarity</div>
                </div>
                <div style={{ ...metricCardStyle, minHeight: isNarrowScreen ? 122 : metricCardStyle.minHeight, padding: isNarrowScreen ? '14px 12px' : metricCardStyle.padding }}>
                  <div style={metricLabelStyle}>Engagement</div>
                  <div style={metricValueStyle}>{resultMetrics.engagement ?? '—'}</div>
                  <div style={metricSubtextStyle}>Student participation</div>
                </div>
                <div style={{ ...metricCardStyle, minHeight: isNarrowScreen ? 122 : metricCardStyle.minHeight, padding: isNarrowScreen ? '14px 12px' : metricCardStyle.padding }}>
                  <div style={metricLabelStyle}>Assessment</div>
                  <div style={metricValueStyle}>{resultMetrics.assessment ?? '—'}</div>
                  <div style={metricSubtextStyle}>Checks for understanding</div>
                </div>
                <div style={{ ...metricCardStyle, minHeight: isNarrowScreen ? 122 : metricCardStyle.minHeight, padding: isNarrowScreen ? '14px 12px' : metricCardStyle.padding }}>
                  <div style={metricLabelStyle}>Gaps</div>
                  <div style={metricValueStyle}>{resultMetrics.gaps ?? '—'}</div>
                  <div style={metricSubtextStyle}>Priority issues to address</div>
                </div>
              </div>

              {saveNotice && (
                <div style={reportNoticeStyle}>{saveNotice}</div>
              )}

              {submissionContextText && (
                <div style={{ ...reportNoticeStyle, marginTop: 12 }}>
                  {submissionContextText}
                </div>
              )}

              {resultSections.length === 0 && feedbackSections.coaching.length === 0 && feedbackSections.teks.length === 0 && feedbackSections.staar.length === 0 && !feedbackSections.whatWentWell.length && !feedbackSections.whatCanImprove.length && !feedbackSections.recommendedNextStep ? (
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

                  {(reportStrengths.length > 0 || reportImprovements.length > 0) && (
                    <>
                      <div style={reportSectionHeadingStyle}>Instructional Review</div>
                      <div style={reportGridStyle}>
                        {reportStrengths.length > 0 && (
                          <div style={reportPanelStyle}>
                            <div style={reportMajorCardTitleStyle}>What Went Well</div>
                            <ul style={reportPanelListStyle}>
                              {reportStrengths.map((item, index) => (
                                <li key={`strength-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {reportImprovements.length > 0 && (
                          <div style={reportPanelStyle}>
                            <div style={reportMajorCardTitleStyle}>What Can Improve</div>
                            <ul style={reportPanelListStyle}>
                              {reportImprovements.map((item, index) => (
                                <li key={`improvement-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {(standardsSummary ||
                    coveredStandardsSections.length > 0 ||
                    reinforcementStandardsSections.length > 0 ||
                    notCoveredStandardsSections.length > 0 ||
                    higherEdAlignmentSections.length > 0) && (
                    <>
                      <div style={reportSectionHeadingStyle}>{standardsSectionHeading}</div>
                      <div style={reportSectionPanelStyle}>
                        <div style={reportStackStyle}>
                          {standardsSummary && (
                            <div style={reportSectionRowStyle}>
                              <div style={reportPanelTitleStyle}>{standardsSummaryTitle}</div>
                              <div style={reportPanelTextStyle}>{standardsSummary}</div>
                            </div>
                          )}

                          {coveredStandardsSections.map((section, index) => (
                            <div key={`covered-${index}`} style={reportSectionRowStyle}>
                              <div style={reportPanelTitleStyle}>Standards Covered</div>
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

                          {reinforcementStandardsSections.map((section, index) => (
                            <div key={`reinforcement-${index}`} style={reportSectionRowStyle}>
                              <div style={reportPanelTitleStyle}>Standards To Revisit</div>
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

                          {notCoveredStandardsSections.map((section, index) => (
                            <div key={`not-covered-${index}`} style={reportSectionRowStyle}>
                              <div style={reportPanelTitleStyle}>Standards Not Observed</div>
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

                          {higherEdAlignmentSections.map((section, index) => (
                            <div key={`higher-ed-alignment-${index}`} style={reportSectionRowStyle}>
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

                          {standardsRecommendationSections.map((section, index) => (
                            <div
                              key={`standards-recommendation-${index}`}
                              style={{
                                ...reportSectionRowStyle,
                                borderBottom:
                                  index === standardsRecommendationSections.length - 1
                                    ? 'none'
                                    : reportSectionRowStyle.borderBottom,
                              }}
                            >
                              <div style={reportPanelTitleStyle}>Recommended Standards Follow-Up</div>
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
                      </div>
                    </>
                  )}

                  {contentGapItems.length > 0 && (
                    <>
                      <div style={reportSectionHeadingStyle}>Content Gaps To Reinforce</div>
                      <div style={reportPanelStyle}>
                        <ul style={reportPanelListStyle}>
                          {contentGapItems.map((item, index) => (
                            <li key={`content-gap-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {recommendedNextStepText && (
                    <>
                      <div style={reportSectionHeadingStyle}>Recommended Next Step</div>
                      <div style={reportSummaryStyle}>
                        <div style={reportPanelTextStyle}>{recommendedNextStepText}</div>
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
