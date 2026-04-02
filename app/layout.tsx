import './globals.css';  // Import global CSS file
import React from 'react';

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
          <img src="/logo.png" alt="AlignEDU Logo" className="logo" />
        </div>

        {/* Add children here for each page */}
        {children}
      </body>
    </html>
  );
}import Image from 'next/image';

export default function Layout({ children }) {
  return (
    <div>
      <header>
        <Image src="/logo.png" alt="AlignEDU Logo" width={100} height={60} />
        <nav>
          <button>Login</button>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
