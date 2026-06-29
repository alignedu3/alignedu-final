"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallAppButtonProps = {
  className?: string;
  label?: string;
  context?: "hero" | "header" | "mobile";
};

function isIosDevice() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
  return isIosDevice() && isSafari;
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || standaloneNavigator.standalone === true;
}

export default function InstallAppButton({
  className = "",
  label = "Install App",
  context = "hero",
}: InstallAppButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallReady, setIsInstallReady] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIos(isIosDevice());
    setIosSafari(isIosSafari());

    const syncInstalledState = () => {
      setIsInstalled(isStandaloneDisplayMode());
    };

    syncInstalledState();

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      setIsInstallReady(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallReady(false);
      setIsInstalled(true);
      setShowIosSheet(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayChange = () => syncInstalledState();
    mediaQuery.addEventListener?.("change", handleDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener?.("change", handleDisplayChange);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const canShowButton = !isInstalled && (isInstallReady || ios);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsInstallReady(false);
      return;
    }

    if (ios) {
      setShowIosSheet(true);
    }
  };

  if (!canShowButton) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className={`install-app-btn install-app-btn-${context} ${className}`.trim()}
      >
        <span className="install-app-btn-icon" aria-hidden="true">
          ↓
        </span>
        <span>{label}</span>
      </button>

      {showIosSheet && (
        <div className="install-sheet-overlay" onClick={() => setShowIosSheet(false)}>
          <div
            className="install-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Install AlignEDU"
          >
            <div className="install-sheet-badge">Install AlignEDU</div>
            <h3 className="install-sheet-title">Add AlignEDU to your home screen</h3>
            <p className="install-sheet-copy">
              Save AlignEDU like a premium app for faster launch, full-screen use, and a cleaner classroom workflow.
            </p>
            <div className="install-sheet-steps">
              <div className="install-sheet-step">
                <span className="install-sheet-step-number">1</span>
                <span>
                  Tap the <strong>Share</strong> button in {iosSafari ? "Safari" : "your browser"}.
                </span>
              </div>
              <div className="install-sheet-step">
                <span className="install-sheet-step-number">2</span>
                <span>
                  Choose <strong>Add to Home Screen</strong>.
                </span>
              </div>
              {!iosSafari && (
                <div className="install-sheet-step">
                  <span className="install-sheet-step-number">3</span>
                  <span>
                    If you do not see that option, open this page in <strong>Safari</strong> and try again.
                  </span>
                </div>
              )}
            </div>
            <button type="button" className="install-sheet-close" onClick={() => setShowIosSheet(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
