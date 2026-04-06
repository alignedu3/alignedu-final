"use client";  // Ensure this is at the very top to use hooks like `useState` and `useEffect`

import React, { useState, useRef } from "react";

export default function AnalysisPage() {
  const [lessonNotes, setLessonNotes] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [grade, setGrade] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrlRef = useRef<string>("");

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
      alert("Notes");
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
    <div className="analysis-container">
      <h1>Lesson Plan & Audio Analysis</h1>

      {/* Grade Selection */}
      <label htmlFor="grade">Grade</label>
      <select value={grade} onChange={handleGradeChange} id="grade">
        <option value="">Select Grade</option>
        <option value="1">Grade 1</option>
        <option value="2">Grade 2</option>
        <option value="3">Grade 3</option>
         <option value="4">Grade 4</option>
          <option value="5">Grade 5</option>
          <option value="6">Grade 6</option>
          <option value="7">Grade 7</option>
          <option value="8">Grade 8</option>
          <option value="9">Grade 9</option>
          <option value="10">Grade 10</option>
          <option value="11">Grade 11</option>
          <option value="12">Grade 12</option>
        {/* Add more grades as needed */}
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
      <label htmlFor="audioUpload">Upload Audio</label>
      <input type="file" onChange={handleFileUpload} id="audioUpload" accept="audio/*" />

      {/* Text Input for Lesson Notes */}
      <label htmlFor="lessonNotes">Lesson Notes</label>
      <input
        type="text"
        id="lessonNotes"
        value={lessonNotes}
        onChange={handleTextChange}
        placeholder="Enter lesson notes"
      />

      {/* Audio Recording Section */}
      <div className="recording-section">
        {isRecording ? (
          <button onClick={handleStopRecording} className="stop-btn">
            Stop Recording
          </button>
        ) : (
          <button onClick={handleStartRecording} className="start-btn">
            Start Recording
          </button>
        )}

        {/* Display recorded audio */}
        {recordedBlob && (
          <div className="audio-preview">
            <audio controls>
              <source src={audioUrlRef.current} type="audio/wav" />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button onClick={handleSubmit} className="submit-btn">
        Submit for Analysis
      </button>
    </div>
  );
}
