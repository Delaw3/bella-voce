"use client";

import { useCallback, useEffect, useState } from "react";

type LinkStatus = {
  isActive: boolean;
  label: string | null;
  createdAt: string | null;
  updatedAt: string | null;
} | null;

export function AnonymousVoicesLinkManager() {
  const [link, setLink] = useState<LinkStatus>(null);
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLink = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/anonymous-voices/link");
      const data = (await response.json()) as { link?: LinkStatus; message?: string };
      if (response.ok) {
        setLink(data.link ?? null);
      } else {
        setError(data.message ?? "Unable to load public link status.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLink();
  }, [loadLink]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function buildUrl(token: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/voices/${token}`;
  }

  async function handleGenerate() {
    setIsWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/anonymous-voices/link", { method: "POST" });
      const data = (await response.json()) as { token?: string; link?: LinkStatus; message?: string };
      if (!response.ok || !data.token) {
        setError(data.message ?? "Unable to generate public link.");
        return;
      }
      setLastToken(data.token);
      setLink(data.link ?? null);
      setConfirmRegen(false);
      try {
        await navigator.clipboard.writeText(buildUrl(data.token));
        setCopied(true);
      } catch {
        // Clipboard may be unavailable; admin can copy manually.
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCopy() {
    if (!lastToken) return;
    try {
      await navigator.clipboard.writeText(buildUrl(lastToken));
      setCopied(true);
    } catch {
      setError("Copy failed. Please copy the link manually.");
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#9FD6D5]/60 bg-[#F8FAFA] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#1F2937]">Public Link</h3>
        {link ? <ActivePill /> : <EmptyPill />}
      </div>
      <p className="mt-1.5 text-xs leading-5 text-slate-600">
        Share one link for anyone to submit in their browser — no app, no login. It follows the same open/close
        switch above: when closed, the link stops accepting. The same link keeps working until you generate a new
        one.
      </p>
      {isLoading ? (
        <p className="mt-3 text-xs text-slate-500">Checking link status…</p>
      ) : lastToken ? (
        <LinkActions
          url={buildUrl(lastToken)}
          copied={copied}
          isWorking={isWorking}
          confirmRegen={confirmRegen}
          onCopy={() => void handleCopy()}
          onAskRegen={() => setConfirmRegen(true)}
          onCancelRegen={() => setConfirmRegen(false)}
          onConfirmRegen={() => void handleGenerate()}
        />
      ) : (
        <div className="mt-3">
          <button
            type="button"
            disabled={isWorking}
            onClick={() => void handleGenerate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2CA6A4] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1E8C8A] active:scale-[0.99] disabled:opacity-60"
          >
            {isWorking ? "Generating…" : link ? "Show New Link" : "Generate Public Link"}
          </button>
          {link ? (
            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              A link was created before. For security the token is never stored — generate a new one to get a fresh
              shareable URL.
            </p>
          ) : null}
        </div>
      )}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function ActivePill() {
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">Active</span>
  );
}

function EmptyPill() {
  return (
    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">No link yet</span>
  );
}

function LinkActions(props: {
  url: string;
  copied: boolean;
  isWorking: boolean;
  confirmRegen: boolean;
  onCopy: () => void;
  onAskRegen: () => void;
  onCancelRegen: () => void;
  onConfirmRegen: () => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-[#9FD6D5] bg-white px-3 py-2">
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-[#1E8C8A]">{props.url}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={props.onCopy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2CA6A4] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1E8C8A] active:scale-[0.99]"
        >
          {props.copied ? "Copied!" : "Copy Link"}
        </button>
        {props.confirmRegen ? (
          <button
            type="button"
            disabled={props.isWorking}
            onClick={props.onConfirmRegen}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 active:scale-[0.99] disabled:opacity-60"
          >
            {props.isWorking ? "Generating…" : "Confirm — replace link"}
          </button>
        ) : (
          <button
            type="button"
            onClick={props.onAskRegen}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.99]"
          >
            Generate New Link
          </button>
        )}
      </div>
      {props.confirmRegen ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-red-600">The old link stops working immediately.</p>
          <button
            type="button"
            onClick={props.onCancelRegen}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}