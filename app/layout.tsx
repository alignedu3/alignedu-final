"use client";
import './globals.css'; // Import global CSS here
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* HEADER */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '20px 40px',
          alignItems: 'center'
        }}>
          {/* LOGO */}
          <Link href="/" style={{ textDecoration: 'none', color: 'black' }}>
            <h2 style={{ cursor: 'pointer' }}>AlignEDU</h2>
          </Link>

          {/* LOGIN BUTTON */}
          <button
            onClick={() => { window.location.href = '/login'; }}
            style={{
              backgroundColor: '#facc15',
              color: '#1e293b',
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </header>

        {/* Render children (main content of each page) */}
        {children}
      </body>
    </html>
  );
}
