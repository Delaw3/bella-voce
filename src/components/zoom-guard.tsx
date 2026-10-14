"use client";

import { useEffect } from "react";

/**
 * Guards against page zoom without hijacking touch scrolling.
 *
 * The viewport meta already sets `userScalable: false` / `maximumScale: 1`,
 * which handles pinch zoom on most mobile browsers. This component only adds
 * the extra guards that some desktop browsers and older iOS versions still
 * honour. Crucially it does NOT attach non-passive `touchmove`/`touchend`
 * listeners with `preventDefault`, which previously forced the browser to wait
 * for JS on every touch and caused scroll jank/hangs on mobile.
 */
export function ZoomGuard() {
  useEffect(() => {
    function preventZoomShortcut(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key === "+" || event.key === "-" || event.key === "=" || event.key === "0") {
        event.preventDefault();
      }
    }

    // Ctrl/Cmd + wheel zoom (desktop trackpad). Passive so normal scrolling is untouched.
    function preventWheelZoom(event: WheelEvent) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    }

    // iOS Safari gesture events. These never fire for single-finger scrolling,
    // so blocking them is safe and does not affect scroll performance.
    function preventGestureZoom(event: Event) {
      event.preventDefault();
    }

    document.addEventListener("keydown", preventZoomShortcut, { passive: false });
    // `wheel` is only prevented while a modifier key is held, so we can keep it
    // non-passive without affecting ordinary scrolling.
    document.addEventListener("wheel", preventWheelZoom, { passive: false });
    document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
    document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
    document.addEventListener("gestureend", preventGestureZoom, { passive: false });

    return () => {
      document.removeEventListener("keydown", preventZoomShortcut);
      document.removeEventListener("wheel", preventWheelZoom);
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
    };
  }, []);

  return null;
}
