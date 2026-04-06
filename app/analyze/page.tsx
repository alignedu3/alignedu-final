'use client';
import { useState, useRef } from 'react';

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } else {
      mediaRecorderRef.current.resume();
    }
    setIsRecording(true);
    setIsPaused(false);
    setIsStopped(false);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev >= MAX_SECONDS) { stopRecording(true); return MAX_SECONDS; }
        return prev + 1;
      });
    }, 1000);
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    setIsPaused(true);
    clearInterval(timerRef.current ?? undefined);
    timerRef.current = null;
  };

  const stopRecording = (auto = false) => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current!.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      setFile(new File([audioBlob], 'recording.webm'));
    };
    clearInterval(timerRef.current ?? undefined);
    timerRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setIsStopped(true);
    if (auto) alert('15 minute limit reached. Recording stopped.');
  };

  const resetRecording = () => {
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setFile(null);
    setSeconds(0);
    clearInterval(timerRef.current ?? undefined);
    timerRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setIsStopped(false);
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
      const activeFile = inputMode === 'upload' ? uploadedFile : file;
      if (activeFile) formData.append('file', activeFile);
      const res = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      setFeedback(data.result);
    } catch (err) {
      console.error(err);
      setFeedback('Error analyzing lesson.');
    } finally {
      setLoading(false);
    }
  };

  const activeFile = inputMode === 'upload' ? uploadedFile : file;

  return (
    <main style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '800px', width: '100%', padding: '30px' }}>

        <h1 style={{ textAlign: 'center' }}>Analyze Lesson</h1>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
          <button onClick={() => setInputMode('record')} style={{ ...btn, opacity: inputMode === 'record' ? 1 : 0.5 }}>🎙 Record</button>
          <button onClick={() => setInputMode('upload')} style={{ ...btn, opacity: inputMode === 'upload' ? 1 : 0.5 }}>📁 Upload File</button>
        </div>

        {/* Record Mode */}
        {inputMode === 'record' && (
          <>
            <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '20px' }}>
              {formatTime(seconds)} / 15:00
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
              {!isRecording && !isStopped && (
                <button onClick={startRecording} style={btn}>🎙 Start</button>
              )}
              {isRecording && !isPaused && (
                <button onClick={pauseRecording} style={btn}>⏸ Pause</button>
              )}
              {isPaused && (
                <button onClick={startRecording} style={btn}>▶️ Resume</button>
              )}
              {(isRecording || isPaused) && (
                <button onClick={() => stopRecording(false)} style={{ ...btn, backgroundColor: '#dc2626' }}>⏹ Stop</button>
              )}
              {isStopped && (
                <button onClick={startRecording} style={btn}>▶️ Resume Recording</button>
              )}
              {(isRecording || isPaused || isStopped) && (
                <button onClick={resetRecording} style={{ ...btn, backgroundColor: '#6b7280' }}>🔁 Reset</button>
              )}
            </div>

            {isStopped && file && (
              <p style={{ textAlign: 'center', marginTop: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                ✅ Recording finalized and ready for analysis
              </p>
            )}
            {isRecording && (
              <p style={{ textAlign: 'center', marginTop: '12px', color: '#dc2626' }}>🔴 Recording...</p>
            )}
            {isPaused && (
              <p style={{ textAlign: 'center', marginTop: '12px', color: '#f59e0b' }}>⏸ Paused</p>
            )}
          </>
        )}

        {/* Upload Mode */}
        {inputMode === 'upload' && (
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <p style={{ marginBottom: '10px', color: '#555' }}>
              Upload an audio or video file (mp3, mp4, wav, webm, m4a)
            </p>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
              style={{ marginBottom: '10px' }}
            />
            {uploadedFile && (
              <p style={{ marginTop: '8px', color: '#16a34a', fontWeight: 'bold' }}>
                ✅ {uploadedFile.name} ready
              </p>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!activeFile || loading}
          style={{ ...btn, width: '100%', marginTop: '30px', opacity: activeFile && !loading ? 1 : 0.5, cursor: activeFile && !loading ? 'pointer' : 'not-allowed' }}
        >
          {loading ? 'Analyzing...' : 'Analyze Lesson'}
        </button>

        {feedback && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '8px' }}>
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
  fontWeight: 'bold',
  cursor: 'pointer'
};
