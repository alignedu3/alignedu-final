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
  const platform = window.navigator.platform || "";
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) || (platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
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
  const [showInstallSheet, setShowInstallSheet] = useState(false);

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
      setShowInstallSheet(false);
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

  const canShowButton = !isInstalled;

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

    setShowInstallSheet(true);
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

      {showInstallSheet && (
        <div className="install-sheet-overlay" onClick={() => setShowInstallSheet(false)}>
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
              {isInstallReady && !ios && (
                <>
                  <div className="install-sheet-step">
                    <span className="install-sheet-step-number">1</span>
                    <span>
                      Tap <strong>Continue</strong> below to open the install prompt.
                    </span>
                  </div>
                  <div className="install-sheet-step">
                    <span className="install-sheet-step-number">2</span>
                    <span>
                      Approve <strong>Install</strong> in your browser.
                    </span>
                  </div>
                </>
              )}
              {!isInstallReady && ios && (
                <>
                  <div className="install-sheet-step">
                    <span className="install-sheet-step-number">1</span>
                    <span>
                      {iosSafari ? (
                        <>
                          Tap the <strong>Share</strong> button in Safari.
                        </>
                      ) : (
                        <>
                          Open this page in <strong>Safari</strong>.
                        </>
                      )}
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
                        After it opens in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
                      </span>
                    </div>
                  )}
                </>
              )}
              {!isInstallReady && !ios && (
                <>
                  <div className="install-sheet-step">
                    <span className="install-sheet-step-number">1</span>
                    <span>
                      Open your browser menu.
                    </span>
                  </div>
                  <div className="install-sheet-step">
                    <span className="install-sheet-step-number">2</span>
                    <span>
                      Look for <strong>Install App</strong>, <strong>Add to Home Screen</strong>, or <strong>Install AlignEDU</strong>.
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="install-sheet-actions">
              {isInstallReady && !ios && (
                <button
                  type="button"
                  className="install-sheet-close"
                  onClick={async () => {
                    setShowInstallSheet(false);
                    await handleInstall();
                  }}
                >
                  Continue
                </button>
              )}
              <button type="button" className="install-sheet-secondary" onClick={() => setShowInstallSheet(false)}>
                {isInstallReady && !ios ? "Not now" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
