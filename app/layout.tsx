// app/layout.tsx
import './globals.css';  // Import global CSS file
import React from 'react';
import Image from 'next/image';

export const metadata = {
  title: "AlignEDU",
  description: "AI-powered learning platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
      </head>
      <body>
        {/* Logo centered at 250px */}
        <div className="logo-container">
          <Image src="/logo.png" alt="AlignEDU Logo" width={250} height={auto} />
        </div>

        {/* Navigation Bar */}
        <header>
          <nav>
            <button>Login</button>
          </nav>
        </header>

        {/* Add children here for each page */}
        <main>{children}</main>
      </body>
    </html>
  );
}
