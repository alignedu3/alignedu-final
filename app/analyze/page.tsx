'use client';
import { useState, useRef } from 'react';

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const MAX_SECONDS = 900;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    if (!mediaRecorderRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } else {
      mediaRecorderRef.current.resume();
    }

    setIsRecording(true);
    setIsPaused(false);

    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev >= MAX_SECONDS) {
          stopRecording(true);
          return MAX_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    setIsPaused(true);
    clearInterval(timerRef.current ?? undefined); timerRef.current = null;
  };

  const stopRecording = (auto = false) => {
    mediaRecorderRef.current?.stop();

    mediaRecorderRef.current!.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'recording.webm');
      setFile(audioFile);
    };

    clearInterval(timerRef.current ?? undefined); timerRef.current = null;

    setIsRecording(false);
    setIsPaused(false);

    if (auto) {
      alert('15 minute limit reached. Recording stopped.');
    }
  };

  const resetRecording = () => {
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setFile(null);
    setSeconds(0);
    clearInterval(timerRef.current ?? undefined); timerRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
  };

  const formatTime = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return min.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setFeedback('');

      const formData = new FormData();
      if (file) formData.append('file', file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setFeedback(data.result);
    } catch (err) {
      console.error(err);
      setFeedback('Error analyzing lesson.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '800px', width: '100%', padding: '30px' }}>

        <h1 style={{ textAlign: 'center' }}>Analyze Lesson</h1>

        <p style={{ textAlign: 'center', fontWeight: 'bold' }}>
          {formatTime(seconds)} / 15:00
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          {!isRecording && <button onClick={startRecording} style={btn}>🎙 Start</button>}
          {isRecording && !isPaused && <button onClick={pauseRecording} style={btn}>⏸ Pause</button>}
          {isPaused && <button onClick={startRecording} style={btn}>▶️ Resume</button>}
          {isRecording && <button onClick={() => stopRecording(false)} style={btn}>⏹ Finish</button>}
          <button onClick={resetRecording} style={btn}>🔁 Reset</button>
        </div>

        {file && <p style={{ textAlign: 'center' }}>Recording ready</p>}

        <button onClick={handleAnalyze} style={{ ...btn, width: '100%', marginTop: '20px' }}>
          Analyze Lesson
        </button>

        {loading && <p style={{ textAlign: 'center' }}>Analyzing...</p>}

        {feedback && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6' }}>
            <h3>Feedback</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{feedback}</p>
          </div>
        )}

      </div>
    </main>
  );
}

const btn = {
  padding: '10px 15px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#16a34a',
  color: 'white',
  fontWeight: 'bold'
};
