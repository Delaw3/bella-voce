"use client";

import { useEffect } from "react";

const shouldEnablePwa =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === "true";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (!shouldEnablePwa) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return;
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
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
