"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex flex-col">

      <nav className="w-full flex justify-between items-center px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">AlignEDU</h1>
      </nav>

      <section className="flex flex-1 items-center justify-center px-6">
        <div className="text-center max-w-2xl">

          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Learn Faster with AI
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            AlignEDU helps you break down lectures and learn smarter.
          </p>

          <a
            href="/analyze"
            className="inline-block bg-black text-white px-8 py-4 rounded-xl text-lg"
          >
            Get Started
          </a>

        </div>
      </section>

    </main>
  );
}
"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-6 border-b">
        <h1 className="text-xl font-bold">AlignEDU</h1>
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
          Turn Lectures Into{" "}
          <span className="text-gray-500">Clear Understanding</span>
        </h1>

        <p className="text-lg text-gray-600 max-w-xl mb-8">
          AlignEDU uses AI to break down lectures, summarize key ideas,
          and help you actually understand what you’re learning.
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
            className="border px-8 py-4 rounded-xl text-lg hover:bg-gray-100 transition"
          >
            See Demo
          </a>
        </div>

        <p className="text-sm text-gray-400 mt-4">
          No signup required • Free to use
        </p>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-6 px-8 mt-32 max-w-6xl mx-auto">

        <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">Instant Summaries</h3>
          <p className="text-gray-600">
            Break down long lectures into clear, concise explanations instantly.
          </p>
        </div>

        <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">Better Understanding</h3>
          <p className="text-gray-600">
            Turn complex topics into simple, easy-to-follow insights.
          </p>
        </div>

        <div className="p-6 border rounded-2xl shadow-sm hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">Learn Faster</h3>
          <p className="text-gray-600">
            Save hours of studying with AI-powered analysis.
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
        © {new Date().getFullYear()} AlignEDU. All rights reserved.
      </footer>

    </main>
  );
}