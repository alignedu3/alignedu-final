"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 text-gray-900">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/logo.png" className="w-8 h-8" />
          <span className="font-bold text-lg">AlignEDU</span>
        </div>

        <a
          href="/analyze"
          className="bg-black text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
        >
          Try It Free
        </a>
      </nav>

      {/* HERO */}
      <section className="flex flex-col items-center text-center px-6 mt-24">

        <h1 className="text-6xl font-bold max-w-4xl leading-tight mb-6">
          AI That Turns Lectures Into
          <span className="block text-gray-500">Clear Understanding</span>
        </h1>

        <p className="text-lg text-gray-600 max-w-xl mb-10">
          AlignEDU analyzes lectures in real time, giving students and educators
          instant insights, summaries, and understanding.
        </p>

        <div className="flex gap-4">
          <a
            href="/analyze"
            className="bg-black text-white px-8 py-4 rounded-xl text-lg hover:bg-gray-800 transition"
          >
            Get Started
          </a>

          <a
            href="/analyze"
            className="border px-8 py-4 rounded-xl text-lg hover:bg-gray-200 transition"
          >
            See Demo
          </a>
        </div>

        <p className="text-sm text-gray-400 mt-4">
          No signup required • Free to use
        </p>

      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-8 mt-32 px-8 max-w-6xl mx-auto">

        <div className="p-6 bg-white rounded-2xl shadow-md">
          <h3 className="font-semibold mb-2">AI Lecture Analysis</h3>
          <p className="text-gray-600 text-sm">
            Instantly break down lectures into clear, structured insights.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-md">
          <h3 className="font-semibold mb-2">Real-Time Understanding</h3>
          <p className="text-gray-600 text-sm">
            No more waiting — get immediate feedback on content.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-md">
          <h3 className="font-semibold mb-2">Learn Faster</h3>
          <p className="text-gray-600 text-sm">
            Save time and improve comprehension with AI-powered learning.
          </p>
        </div>

      </section>

      {/* CTA */}
      <section className="flex flex-col items-center text-center mt-32 px-6">

        <h2 className="text-4xl font-bold mb-6">
          Start learning smarter today
        </h2>

        <a
          href="/analyze"
          className="bg-black text-white px-8 py-4 rounded-xl text-lg hover:bg-gray-800 transition"
        >
          Try AlignEDU Free
        </a>

      </section>

      {/* FOOTER */}
      <footer className="text-center text-gray-400 mt-24 pb-10 text-sm">
        © {new Date().getFullYear()} AlignEDU
      </footer>

    </main>
  );
}