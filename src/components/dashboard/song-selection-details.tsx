"use client";

import { SongSelectionDetail } from "@/types/dashboard";
import { capitalizeWords, formatAppDate } from "@/lib/utils";
import { useEffect, useState } from "react";

type SongSelectionDetailsProps = {
  id: string;
};

type SongSelectionDetailPayload = {
  selection?: SongSelectionDetail;
  message?: string;
};

export function SongSelectionDetails({ id }: SongSelectionDetailsProps) {
  const [selection, setSelection] = useState<SongSelectionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSelection() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/song-selections/${id}`);
        const payload = (await response.json()) as SongSelectionDetailPayload;

        if (!response.ok || !payload.selection) {
          throw new Error(payload.message ?? "Unable to fetch song selection details.");
        }

        if (!cancelled) {
          setSelection(payload.selection);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to fetch song selection details.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSelection();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <p className="text-sm text-slate-600">Loading selection details...</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  }

  if (!selection) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
        No details available.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)]">
        <h1 className="font-display text-3xl text-[#1F2937]">{selection.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{formatAppDate(selection.selectionDate)}</p>
      </div>

      <div className="space-y-1.5">
        {selection.songs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
            No songs listed for this selection.
          </p>
        ) : (
          selection.songs.map((songItem, index) => (
            <article
              key={`${songItem.part}-${songItem.song}-${index}`}
              className="rounded-2xl bg-[#F8FAFA] p-4"
            >
              {songItem.part ? (
                <p className="text-[11px] font-semibold tracking-[0.08em] text-[#2CA6A4] uppercase">
                  {capitalizeWords(songItem.part)}
                </p>
              ) : null}
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 text-sm font-semibold text-[#1F2937]">{songItem.song}</p>
                {songItem.key ? (
                  <span className="inline-flex shrink-0 rounded-full bg-[#EAF9F8] px-2 py-0.5 text-[11px] font-semibold text-[#1E8C8A]">
                    Key: {songItem.key}
                  </span>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
