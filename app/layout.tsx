import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'AlignEDU',
  description: 'AI-powered lesson analysis for teachers, administrators, and districts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">
            AlignEDU
          </Link>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Link href="/analyze" className="login-button-top">
              Try It Now
            </Link>

            <a
              href="mailto:support@alignedu.net?subject=AlignEDU Demo Request&body=I would like to schedule a demo."
              className="login-button-top"
              style={{
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
              }}
            >
              Book Demo
            </a>

            <Link href="/login" className="login-button-top">
              Login
            </Link>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
