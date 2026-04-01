"use client";

import { useState } from "react";

export default function Analyze() {
  const [lecture, setLecture] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  const analyzeLecture = async () => {
    if (!lecture) return;

    const userMessage = { role: "user", content: lecture };
    setMessages((prev) => [...prev, userMessage]);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lecture }),
    });

    const data = await res.json();

    const aiMessage = { role: "ai", content: data.result };
    setMessages((prev) => [...prev, aiMessage]);

    setLecture("");
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col">

      <div className="p-4 border-b border-gray-700 text-lg font-semibold">
        AlignEDU AI
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl w-full mx-auto">

        {messages.length === 0 && (
          <div className="text-gray-400 text-center mt-20">
            Paste your lecture and start learning smarter.
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-4 rounded-2xl max-w-xl ${
              msg.role === "user"
                ? "bg-blue-600 ml-auto"
                : "bg-gray-800"
            }`}
          >
            {msg.content}
          </div>
        ))}

      </div>

      <div className="p-4 border-t border-gray-700 flex gap-2 max-w-3xl w-full mx-auto">

        <textarea
          className="flex-1 p-4 rounded-xl bg-gray-800 border border-gray-700"
          placeholder="Paste lecture..."
          value={lecture}
          onChange={(e) => setLecture(e.target.value)}
        />

        <button
          onClick={analyzeLecture}
          className="bg-white text-black px-6 rounded-xl"
        >
          Send
        </button>

      </div>

    </main>
  );
}
