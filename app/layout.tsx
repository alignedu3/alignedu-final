import './globals.css';
import { ThemeProvider } from './context/ThemeContext';
import Header from '@/components/Header';
import PWARegistration from '@/components/PWARegistration';
import HomepagePlansTeaser from '@/components/HomepagePlansTeaser';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';

const BRAND_VERSION = "2026-09-21-current-icon";
const SOCIAL_IMAGE = `https://alignedu.net/og-image.png?v=${BRAND_VERSION}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://alignedu.net'),
  title: "AlignEDU — AI Classroom Intelligence",
  description: "AI-powered classroom intelligence that helps educators understand lesson coverage, clarity, engagement, assessment, and learning gaps.",
  manifest: `/manifest.webmanifest?v=${BRAND_VERSION}`,
  applicationName: "AlignEDU",
  icons: {
    apple: `/apple-touch-icon.png?v=${BRAND_VERSION}`,
    icon: [
      { url: `/pwa-icon-192.png?v=${BRAND_VERSION}`, type: "image/png", sizes: "192x192" },
      { url: `/pwa-icon-512.png?v=${BRAND_VERSION}`, type: "image/png", sizes: "512x512" },
    ],
    shortcut: [`/pwa-icon-192.png?v=${BRAND_VERSION}`],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "AlignEDU" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "AlignEDU — AI Classroom Intelligence",
    description: "See what happened in the classroom with AI-powered insight into coverage, clarity, engagement, assessment, and learning gaps.",
    url: "https://alignedu.net",
    siteName: "AlignEDU",
    images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "AlignEDU — AI Classroom Intelligence" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AlignEDU — AI Classroom Intelligence",
    description: "AI-powered insight into lesson coverage, clarity, engagement, assessment, and learning gaps.",
    images: [SOCIAL_IMAGE],
  },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <style>{`
          .legal-links-row { display:flex!important;align-items:center!important;justify-content:center!important;flex-wrap:wrap!important;gap:8px 0!important;max-width:760px!important;margin:0 auto!important; }
          .legal-link { position:relative!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:4px 16px!important;font-size:13px!important;font-weight:600!important;line-height:1.5!important;letter-spacing:.01em!important;border-bottom:none!important;text-decoration:none!important; }
          .legal-link + .legal-link::before { content:'';position:absolute;left:0;top:50%;width:1px;height:14px;background:var(--border);transform:translateY(-50%); }
          @media (max-width:560px){.legal-links-row{max-width:350px!important;gap:6px 0!important}.legal-link{padding:5px 12px!important;font-size:12.5px!important}}
        `}</style>
        <ThemeProvider>
          <PWARegistration />
          <Header />
          <HomepagePlansTeaser />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
