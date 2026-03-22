"use client";

import { useEffect } from "react";

const shouldEnablePwa =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === "true";
const INSTALL_PROMPT_EVENT_NAME = "bella-voce-install-prompt-available";
const APP_INSTALLED_EVENT_NAME = "bella-voce-app-installed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __bellaVoceDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function PwaRegistrar() {
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__bellaVoceDeferredInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT_NAME));
    };

    const handleInstalled = () => {
      window.__bellaVoceDeferredInstallPrompt = null;
      window.dispatchEvent(new Event(APP_INSTALLED_EVENT_NAME));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if (!("serviceWorker" in navigator)) {
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleInstalled);
      };
    }

    if (!shouldEnablePwa) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleInstalled);
      };
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Fail quietly so the app keeps working normally even if SW registration fails.
      }
    };

    if (document.readyState === "complete") {
      void register();
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleInstalled);
      };
    }

    window.addEventListener("load", register, { once: true });
    return () => {
      window.removeEventListener("load", register);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return null;
}
