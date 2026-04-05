/* layout.tsx */
import "./globals.css";  // ✅ FIXED path

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
      <body>

        {/* TOP BAR with logo and login button */}
        <div className="topbar">
          <img src="/logo.png" alt="AlignEDU Logo" className="logo" />
          <a href="/login" className="login-btn">Login</a>
        </div>

        {/* Main content of the page */}
        {children}

      </body>
    </html>
  );
}