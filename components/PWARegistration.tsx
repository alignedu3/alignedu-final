"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    if (document.readyState === "complete") {
      void registerWorker();
      return;
    }

    window.addEventListener("load", registerWorker, { once: true });

    return () => {
      window.removeEventListener("load", registerWorker);
    };
  }, []);

  return null;
}
