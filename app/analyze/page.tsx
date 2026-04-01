"use client";

import { useState } from "react";

export default function Analyze() {
  const [lecture, setLecture] = useState("");
  const [response, setResponse] = useState("");

  const analyzeLecture = async () => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ lecture }),
    });

    const data = await res.json();
    setResponse(data.result);
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl w-full p-6">

        <h1 className="text-2xl font-bold mb-4">
          AlignEDU Analyzer
        </h1>

        <textarea
          className="w-full border p-2 mb-4"
          value={lecture}
          onChange={(e) => setLecture(e.target.value)}
        />

        <button
          onClick={analyzeLecture}
          className="bg-black text-white px-4 py-2"
        >
          Analyze
        </button>

        <div className="mt-4">
          {response}
        </div>

      </div>
    </main>
  );
}

