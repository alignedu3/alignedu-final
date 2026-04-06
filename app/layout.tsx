"use client";
import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>

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

          {/* BOOK DEMO BUTTON */}
          <button
            onClick={() =>
              window.location.href =
                'mailto:ryan@alignedu.net?subject=AlignEDU Demo Request&body=Hello,%0A%0AI would like to request a demo of AlignEDU.%0A%0ASchool/District:%0ARole:%0A%0AAdditional Details:%0A'
            }
            style={{
              backgroundColor: '#facc15',
              color: '#1e293b',
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 'bold'
            }}
          >
            Book Demo
          </button>

        </header>

        {children}

      </body>
    </html>
  );
}
