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
