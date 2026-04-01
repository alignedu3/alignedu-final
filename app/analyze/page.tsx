"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-6xl mx-auto">
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

        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl leading-tight mb-6">
          Learn Faster with AI
        </h1>

        <p className="text-lg text-gray-600 max-w-xl mb-10">
          AlignEDU helps you break down lectures, understand concepts,
          and study smarter using AI.
        </p>

        <a
          href="/analyze"
          className="bg-black text-white px-8 py-4 rounded-xl text-lg hover:bg-gray-800 transition"
        >
          Get Started
        </a>

      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-8 mt-32 px-8 max-w-6xl mx-auto">

        <div className="p-6 border rounded-2xl hover:shadow-md transition">
          <h3 className="font-semibold mb-2">Instant Summaries</h3>
          <p className="text-gray-600 text-sm">
            Turn long lectures into simple explanations instantly.
          </p>
        </div>

        <div className="p-6 border rounded-2xl hover:shadow-md transition">
          <h3 className="font-semibold mb-2">Better Understanding</h3>
          <p className="text-gray-600 text-sm">
            Break down complex topics into clear insights.
          </p>
        </div>

        <div className="p-6 border rounded-2xl hover:shadow-md transition">
          <h3 className="font-semibold mb-2">Learn Faster</h3>
          <p className="text-gray-600 text-sm">
            Save time and study more efficiently.
          </p>
        </div>

      </section>

      {/* CTA */}
      <section className="flex flex-col items-center text-center mt-32 px-6">

        <h2 className="text-3xl font-bold mb-6">
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