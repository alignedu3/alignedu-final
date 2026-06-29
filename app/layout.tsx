import './globals.css';
import { ThemeProvider } from './context/ThemeContext';
import Header from '@/components/Header';
import PWARegistration from '@/components/PWARegistration';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';

const ICON_VERSION = "2026-06-28-c";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.alignedu.net'),
  title: "AlignEDU",
  description: "AI-powered lesson analysis for teachers",
  manifest: `/manifest.webmanifest?v=${ICON_VERSION}`,
  applicationName: "AlignEDU",
  icons: {
    apple: `/apple-touch-icon.png?v=${ICON_VERSION}`,
    icon: [
      { url: `/pwa-icon-192.png?v=${ICON_VERSION}`, type: "image/png", sizes: "192x192" },
      { url: `/pwa-icon-512.png?v=${ICON_VERSION}`, type: "image/png", sizes: "512x512" },
    ],
    shortcut: [`/pwa-icon-192.png?v=${ICON_VERSION}`],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AlignEDU",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "AlignEDU",
    description: "AI-powered lesson analysis for teachers",
    url: "https://alignedu.net", // <-- replace this
    siteName: "AlignEDU",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <ThemeProvider>
          <PWARegistration />
          <Header />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
