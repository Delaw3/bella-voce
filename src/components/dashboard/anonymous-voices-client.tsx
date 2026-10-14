"use client";

import { MAX_ANONYMOUS_MESSAGE_LENGTH, MIN_ANONYMOUS_MESSAGE_LENGTH, type AnonymousVoicesPublicStatus } from "@/lib/anonymous-voices/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function AnonymousVoicesClient() {
  const router = useRouter();
  const [statusData, setStatusData] = useState<AnonymousVoicesPublicStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const loadStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch("/api/anonymous-voices/status");
      const data = (await response.json()) as AnonymousVoicesPublicStatus & { message?: string };
      if (response.ok) {
        setStatusData(data);
      } else {
        setError(data.message ?? "Unable to load feature status.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!isPrivacyOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsPrivacyOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPrivacyOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmed = message.trim();
    if (trimmed.length < MIN_ANONYMOUS_MESSAGE_LENGTH) {
      setError(`Please enter at least ${MIN_ANONYMOUS_MESSAGE_LENGTH} characters before submitting.`);
      return;
    }

    if (trimmed.length > MAX_ANONYMOUS_MESSAGE_LENGTH) {
      setError(`Your message cannot exceed ${MAX_ANONYMOUS_MESSAGE_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/anonymous-voices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Unable to submit your message.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setMessage("");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setIsSubmitted(false);
    setMessage("");
    setError(null);
    void loadStatus();
  }

  return (
    <div className="space-y-5 pb-24 sm:pb-12">
      {/* Top Header with Close Button */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9FD6D5] bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            100% Confidential
          </div>
          <h1 className="mt-2 font-display text-3xl text-[#1F2937]">Anonymous Voices</h1>
          <p className="mt-1 text-sm text-slate-600">
            A safe, private channel to share thoughts, suggestions, and feedback with Bella Voce leadership.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#9FD6D5] bg-white px-4 py-2 text-sm font-semibold text-[#1E8C8A] shadow-sm transition hover:bg-[#EAF9F8] active:scale-95"
          aria-label="Return to Dashboard"
        >
          <span>Close</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Feature Explanation & Privacy Guarantee — compact trigger, opens popup modal */}
      <button
        type="button"
        onClick={() => setIsPrivacyOpen(true)}
        aria-haspopup="dialog"
        aria-label="How Genuine Anonymity Works — learn more"
        className="flex w-full items-center gap-3 rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 text-left shadow-[0_8px_24px_rgba(31,41,55,0.05)] transition hover:border-[#9FD6D5] hover:bg-[#F8FAFA] active:scale-[0.995] sm:p-5"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9F8] text-[#1E8C8A]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 12h.01M12 12h.01M16 12h.01" />
          </svg>
        </div>
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-[#1F2937]">How Genuine Anonymity Works</h2>
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5 shrink-0 text-[#1E8C8A]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </button>

      {/* Status Card */}
      {isLoadingStatus ? (
        <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-[#1E8C8A]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#9FD6D5] border-t-[#1E8C8A]" />
            Checking submission window status...
          </div>
        </div>
      ) : statusData?.isOpen ? (
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2.5 text-emerald-800">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <p className="text-sm font-semibold">Submissions are currently OPEN</p>
          </div>
          {statusData.closesAtFormatted ? (
            <p className="mt-1 text-xs text-emerald-700">
              Window closes on <span className="font-semibold">{statusData.closesAtFormatted}</span>.
            </p>
          ) : (
            <p className="mt-1 text-xs text-emerald-700">The feedback window is currently active.</p>
          )}
        </div>
      ) : statusData?.status === "SCHEDULED" ? (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50/80 p-4">
          <div className="flex items-center gap-2.5 text-amber-900">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm font-semibold">Submissions are opening soon</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-800">
            {statusData.reason}
          </p>
        </div>
      ) : (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2.5 text-slate-800">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <p className="text-sm font-semibold">Submissions are currently closed</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            The leadership team has not opened a submission window at this time.
            Please check back periodically for scheduled submission windows.
          </p>
        </div>
      )}

      {/* Error feedback banner */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {/* Success Confirmation View */}
      {isSubmitted ? (
        <div className="rounded-[28px] border border-[#9FD6D5] bg-white p-6 text-center shadow-[0_12px_32px_rgba(31,41,55,0.08)] sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF9F8] text-[#1E8C8A]">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mt-4 font-display text-2xl text-[#1F2937]">Thank You! Your Voice Was Heard</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Your message has been submitted securely and anonymously. It will be reviewed by the administration without any reference to your account.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-[#9FD6D5] bg-white px-5 py-2.5 text-sm font-semibold text-[#1E8C8A] transition hover:bg-[#EAF9F8]"
            >
              Submit Another Thought
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl bg-[#2CA6A4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E8C8A]"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      ) : statusData?.isOpen ? (
        /* Submission Form */
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_12px_28px_rgba(31,41,55,0.06)] sm:p-6"
        >
          <div>
            <label htmlFor="anonymous-message" className="block text-sm font-semibold text-[#1F2937]">
              Your Message
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Share constructive comments, music selections, welfare suggestions, or questions.
            </p>
            <textarea
              id="anonymous-message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              placeholder="Type your anonymous thoughts here... (at least 5 characters)"
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-[#F8FAFA] p-4 text-sm text-[#1F2937] placeholder-slate-400 transition focus:border-[#2CA6A4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9FD6D5]/40"
              maxLength={MAX_ANONYMOUS_MESSAGE_LENGTH}
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {message.trim().length < MIN_ANONYMOUS_MESSAGE_LENGTH ? (
                <span className="text-amber-600">
                  Minimum {MIN_ANONYMOUS_MESSAGE_LENGTH} characters required ({MIN_ANONYMOUS_MESSAGE_LENGTH - message.trim().length} more)
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">Valid length</span>
              )}
            </span>
            <span>
              {message.length} / {MAX_ANONYMOUS_MESSAGE_LENGTH} characters
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || message.trim().length < MIN_ANONYMOUS_MESSAGE_LENGTH}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2CA6A4] py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(44,166,164,0.25)] transition hover:bg-[#1E8C8A] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Submitting securely...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Submit Anonymously
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Closed state action */
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Need to return to your choir dashboard?</p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2CA6A4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E8C8A]"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* How Genuine Anonymity Works — popup modal */}
      {isPrivacyOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-modal-title"
          onClick={() => setIsPrivacyOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_28px_60px_rgba(31,41,55,0.22)] sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EAF9F8] text-[#1E8C8A]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="privacy-modal-title" className="font-display text-xl text-[#1F2937]">
                  How Genuine Anonymity Works
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                aria-label="Close"
                className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-[#EAF9F8] hover:text-[#1E8C8A] active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Your member identity — name, email, member ID, and profile picture — is never recorded or linked to this
              message. Choir administrators can only review the text and the submission time.
            </p>

            <ul className="mt-4 space-y-2.5">
              {[
                "No account details, images, or device identifiers are stored with your message.",
                "Only the message text and the time it was sent are visible to administrators.",
                "Use this space freely for constructive ideas, rehearsal feedback, welfare notes, or any concerns.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EAF9F8] text-[#1E8C8A]">
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(false)}
                className="w-full rounded-2xl bg-[#2CA6A4] py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(44,166,164,0.25)] transition hover:bg-[#1E8C8A] active:scale-[0.99]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
