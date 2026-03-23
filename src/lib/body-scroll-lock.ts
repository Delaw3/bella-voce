"use client";

let activeLockCount = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

export function lockBodyScroll() {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  if (activeLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  activeLockCount += 1;

  let released = false;

  return () => {
    if (released || typeof document === "undefined") {
      return;
    }

    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);

    if (activeLockCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }
  };
}
