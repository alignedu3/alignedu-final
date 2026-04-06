"use client";  // Ensure this is at the very top to use hooks like `useState` and `useEffect`

import React, { useState, useRef } from 'react';

export default function AnalysisPage() {
  const [lessonNotes, setLessonNotes] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [grade, setGrade] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrlRef = useRef<string>('');

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
    }
  };

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLessonNotes(e.target.value);
  };

  // Handle grade change
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGrade(e.target.value);
  };

  // Handle subject change
  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubject(e.target.value);
  };

  // Handle start recording
  const handleStartRecording = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.ondataavailable = (e) => {
            setRecordedBlob(e.data);
            audioUrlRef.current = URL.createObjectURL(e.data);
          };
          mediaRecorderRef.current.start();
          setIsRecording(true);
        })
        .catch((error) => {
          console.error("Error accessing the microphone:", error);
        });
    }
  };

  // Handle stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!lessonNotes && !audioFile && !recordedBlob) {
      alert("Please provide lesson notes or upload an audio file.");
      return;
    }

    if (!grade || !subject) {
      alert("Please select a grade and subject.");
      return;
    }

    // Prepare form data to send
    const formData = new FormData();
    formData.append("lessonNotes", lessonNotes);
    formData.append("grade", grade);
    formData.append("subject", subject);

    if (audioFile) {
      formData.append("audioFile", audioFile);
    } else if (recordedBlob) {
      const audioBlob = new Blob([recordedBlob], { type: "audio/wav" });
      formData.append("audioFile", audioBlob);
    }

    // Send the form data to the server for analysis
    fetch("/api/analyze", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Analysis result:", data);
        alert("Analysis complete!");
      })
      .catch((error) => {
        console.error("Error during analysis:", error);
        alert("An error occurred.");
      });
  };

  return (
    <div className="container">
      <h1>Lesson Plan & Audio Analysis</h1>

      {/* Grade Selection */}
      <label htmlFor="grade">Grade</label>
      <select value={grade} onChange={handleGradeChange} id="grade">
        <option value="">Select Grade</option>
        {Array.from({ length: 12 }, (_, index) => (
          <option key={index} value={index + 1}>
            Grade {index + 1}
          </option>
        ))}
      </select>

      {/* Subject Selection */}
      <label htmlFor="subject">Subject</label>
      <select value={subject} onChange={handleSubjectChange} id="subject">
        <option value="">Select Subject</option>
        <option value="math">Math</option>
        <option value="science">Science</option>
        <option value="history">History</option>
        {/* Add more subjects as needed */}
      </select>

      {/* File Upload Section */}
      <input type="file" onChange={handleFileUpload} />

      {/* Text Input for Lesson Notes */}
      <input
        type="text"
        value={lessonNotes}
        onChange={handleTextChange}
        placeholder="Enter lesson notes"
      />

      {/* Audio Recording Section */}
      <div>
        {isRecording ? (
          <button onClick={handleStopRecording}>Stop Recording</button>
        ) : (
          <button onClick={handleStartRecording}>Start Recording</button>
        )}
      </div>

      {/* Submit Button */}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
