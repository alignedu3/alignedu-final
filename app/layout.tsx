import './globals.css';
import { ThemeProvider } from './context/ThemeContext';
import Header from '@/components/Header';

export const metadata = {
  metadataBase: new URL('https://www.alignedu.net'),
  title: "AlignEDU",
  description: "AI-powered lesson analysis for teachers",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
