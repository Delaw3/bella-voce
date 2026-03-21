"use client";

import { SongSelectionListItem } from "@/types/dashboard";
import { formatAppDate } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

type SongSelectionsPayload = {
  selections?: SongSelectionListItem[];
  message?: string;
};

export function SongSelectionsList() {
  const [selections, setSelections] = useState<SongSelectionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSelections() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/song-selections");
        const payload = (await response.json()) as SongSelectionsPayload;

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to fetch song selections.");
        }

        if (!cancelled) {
          setSelections(payload.selections ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to fetch song selections.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSelections();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading song selections...</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }

  if (selections.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        No song selections available yet.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      {selections.map((selection) => (
        <Link
          key={selection.id}
          href={`/dashboard/song-selections/${selection.id}`}
          className="block rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)] transition hover:border-[#2CA6A4]"
        >
          <p className="text-base font-semibold text-[#1F2937]">{selection.title}</p>
          <p className="mt-1 text-sm text-slate-600">{formatAppDate(selection.selectionDate)}</p>
        </Link>
      ))}
    </section>
  );
}
