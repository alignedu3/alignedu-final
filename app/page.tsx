"use client";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      <nav className="flex justify-between items-center px-8 py-6 border-b">
        <h1 className="text-xl font-bold">AlignEDU</h1>
        <a
          href="/analyze"
          className="bg-black text-white px-5 py-2 rounded-lg text-sm"
        >
          Try It Free
        </a>
      </nav>

      <section className="flex flex-col items-center text-center px-6 mt-24">

        <h1 className="text-5xl font-bold max-w-3xl mb-6">
          Turn Lectures Into Clear Understanding
        </h1>

        <p className="text-lg text-gray-600 max-w-xl mb-8">
          AlignEDU uses AI to break down lectures and help you learn faster.
        </p>

        <a
          href="/analyze"
          className="bg-black text-white px-8 py-4 rounded-xl text-lg"
        >
          Get Started
        </a>

      </section>

    </main>
  );
}
