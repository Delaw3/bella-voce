"use client";

import { ActionModal } from "@/components/ui/action-modal";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_STATE_KEY = "bella-voce.pwa-installed";

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
  return isIos && isSafari;
}

function hasInstalledApp() {
  if (typeof window === "undefined") {
    return false;
  }

  const installed = window.localStorage.getItem(INSTALL_STATE_KEY) === "true";
  const standalone = isStandaloneMode();

  if (standalone && !installed) {
    window.localStorage.setItem(INSTALL_STATE_KEY, "true");
  }

  return installed || standalone;
}

export function PwaInstallCta() {
  const [isVisible, setIsVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const ios = useMemo(() => isIosSafari(), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (hasInstalledApp()) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      window.localStorage.setItem(INSTALL_STATE_KEY, "true");
      setDeferredPrompt(null);
      setShowIosHelp(false);
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [ios]);

  async function handleInstallClick() {
    if (deferredPrompt) {
      setIsProcessing(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === "accepted" && typeof window !== "undefined") {
          window.localStorage.setItem(INSTALL_STATE_KEY, "true");
          setIsVisible(false);
        }

        setDeferredPrompt(null);
      } finally {
        setIsProcessing(false);
      }

      return;
    }

    if (ios) {
      setShowIosHelp(true);
      return;
    }

    setShowIosHelp(true);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="mt-4 rounded-2xl border border-[#9FD6D5]/70 bg-[#F4FBFB] px-4 py-3 text-center">
        <p className="text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Install App</p>
        <p className="mt-1 text-sm text-slate-600">
          Add Bella Voce to your home screen for a faster mobile app experience.
        </p>
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          disabled={isProcessing}
          className="mt-3 inline-flex items-center justify-center rounded-xl border border-[#9FD6D5] bg-white px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] transition hover:border-[#2CA6A4] hover:text-[#2CA6A4] disabled:opacity-60"
        >
          {isProcessing ? "Please wait..." : ios ? "How to Install" : "Install App"}
        </button>
      </div>

      <ActionModal
        open={showIosHelp}
        title="Install Bella Voce"
        message={
          ios
            ? "On iPhone or iPad, tap Share, scroll to Add to Home Screen, then tap Add."
            : "If the install prompt does not appear, open your browser menu and choose Install App or Add to Home Screen."
        }
        onClose={() => setShowIosHelp(false)}
      />
    </>
  );
}
