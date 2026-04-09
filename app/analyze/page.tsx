"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ ADDED

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
  const router = useRouter(); // ✅ ADDED

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setAudioFile(e.target.files[0]);
      setError("");
      setRecordedBlob(null);
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
    setProcessingStep('Preparing lesson for analysis...');
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
      setProcessingStep('Uploading and transcribing lecture...');

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setProcessingStep('Generating instructional insights...');

      if (!res.ok) {
        throw new Error(data?.result || "Error analyzing lesson.");
      }

      setProcessingStep('Saving analysis...');
      setResult(data?.result || "Analysis completed, but no result was returned.");

      // 🔥 THIS IS THE KEY ADDITION
      setTimeout(() => {
        router.push("/dashboard");  // redirect
        router.refresh();           // force dashboard reload
      }, 1200);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error analyzing lesson.");
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const { metrics, sections } = parsedAnalysis;

  return (
    <main className="analysis-wrapper">
      {/* 🔥 EVERYTHING BELOW IS UNCHANGED */}