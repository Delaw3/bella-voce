"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { formatAppDate } from "@/lib/utils";
import { AdminSongSelectionItem } from "@/types/admin";
import { useEffect, useState } from "react";

const blankSong = { part: "", song: "", key: "" };
type SongSelectionWorkflowStatus = "IN_REVIEW" | "POSTED";

type FeedbackState = null | {
  title: string;
  message: string;
  tone: "success" | "error";
};

type ConfirmState = null | {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "default" | "danger";
  onConfirm: () => Promise<void>;
};

export function SongSelectionsAdmin() {
  const canCreate = useCan("song_selections.create");
  const canEdit = useCan("song_selections.edit");
  const canDelete = useCan("song_selections.delete");
  const [selections, setSelections] = useState<AdminSongSelectionItem[]>([]);
  const [title, setTitle] = useState("");
  const [selectionDate, setSelectionDate] = useState("");
  const [songs, setSongs] = useState([{ ...blankSong }]);
  const [status, setStatus] = useState<SongSelectionWorkflowStatus>("IN_REVIEW");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackModal, setFeedbackModal] = useState<FeedbackState>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmState>(null);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);

  function showFeedback(title: string, message: string, tone: "success" | "error" = "success") {
    setFeedbackModal({ title, message, tone });
  }

  function showConfirm(config: ConfirmState) {
    setConfirmModal(config);
  }

  async function runConfirmedAction() {
    if (!confirmModal) return;
    setIsModalSubmitting(true);
    try {
      await confirmModal.onConfirm();
    } finally {
      setIsModalSubmitting(false);
      setConfirmModal(null);
    }
  }

  async function loadSelections() {
    setIsLoading(true);
    const response = await fetch("/api/admin/song-selections");
    const payload = (await response.json()) as { selections?: AdminSongSelectionItem[]; message?: string };
    if (response.ok) {
      setSelections(payload.selections ?? []);
    } else {
      showFeedback("Unable to Load", payload.message ?? "Unable to load song selections.", "error");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const response = await fetch("/api/admin/song-selections");
      const payload = (await response.json()) as { selections?: AdminSongSelectionItem[]; message?: string };

      if (cancelled) return;

      if (response.ok) {
        setSelections(payload.selections ?? []);
      } else {
        showFeedback("Unable to Load", payload.message ?? "Unable to load song selections.", "error");
      }

      setIsLoading(false);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitForm() {
    setIsSubmitting(true);
    const response = await fetch(editingId ? `/api/admin/song-selections/${editingId}` : "/api/admin/song-selections", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, selectionDate, songs, status }),
    });
    const payload = (await response.json()) as { message?: string };

    if (response.ok) {
      setEditingId(null);
      setTitle("");
      setSelectionDate("");
      setSongs([{ ...blankSong }]);
      setStatus("IN_REVIEW");
      showFeedback(
        status === "POSTED" ? "Selection Posted" : "Saved for Review",
        payload.message ?? (status === "POSTED" ? "Song selection posted successfully." : "Song selection saved for review."),
      );
      void loadSelections();
    } else {
      showFeedback("Action Failed", payload.message ?? "Unable to save song selection.", "error");
    }
    setIsSubmitting(false);
  }

  function handleSubmitClick() {
    if (status === "POSTED") {
      showConfirm({
        title: "Post Song Selection?",
        message: "Once posted, choir members will be able to see this song selection immediately.",
        confirmLabel: editingId ? "Update & Post" : "Post Selection",
        tone: "default",
        onConfirm: submitForm,
      });
      return;
    }

    void submitForm();
  }

  function startEdit(selection: AdminSongSelectionItem) {
    setEditingId(selection.id);
    setExpandedId(selection.id);
    setTitle(selection.title);
    setSelectionDate(selection.selectionDate.slice(0, 10));
    setSongs(selection.songs.length ? selection.songs : [{ ...blankSong }]);
    setStatus(selection.status);
  }

  async function deleteSelection(id: string) {
    const response = await fetch(`/api/admin/song-selections/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as { message?: string };
    if (response.ok) {
      showFeedback("Selection Deleted", payload.message ?? "Song selection deleted successfully.");
      void loadSelections();
    } else {
      showFeedback("Delete Failed", payload.message ?? "Unable to delete song selection.", "error");
    }
  }

  async function postSelection(selection: AdminSongSelectionItem) {
    if (selection.status === "POSTED") {
      return;
    }

    setPostingId(selection.id);
    const response = await fetch(`/api/admin/song-selections/${selection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "POSTED" }),
    });
    const payload = (await response.json()) as { message?: string };
    if (response.ok) {
      showFeedback("Selection Posted", payload.message ?? "Song selection posted successfully.");
      void loadSelections();
    } else {
      showFeedback("Post Failed", payload.message ?? "Unable to post song selection.", "error");
    }
    setPostingId(null);
  }

  function removeSongRow(index: number) {
    setSongs((current) => {
      if (current.length === 1) {
        return [{ ...blankSong }];
      }

      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [{ ...blankSong }];
    });
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Song Selections"
        description="Build service and rehearsal song lists with as many inline rows as you need, then update them later when plans change."
        badge="Operational Admin"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Selection title"
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <input
            type="date"
            value={selectionDate}
            onChange={(event) => setSelectionDate(event.target.value)}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as SongSelectionWorkflowStatus)}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none md:col-span-2"
          >
            <option value="IN_REVIEW">In Review</option>
            <option value="POSTED">Post Now</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {songs.map((song, index) => (
            <div key={index} className="rounded-[24px] bg-[#F8FAFA] p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  value={song.part}
                  onChange={(event) =>
                    setSongs((current) => current.map((item, i) => (i === index ? { ...item, part: event.target.value } : item)))
                  }
                  placeholder="Part"
                  className="rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                />
                <input
                  value={song.song}
                  onChange={(event) =>
                    setSongs((current) => current.map((item, i) => (i === index ? { ...item, song: event.target.value } : item)))
                  }
                  placeholder="Song"
                  className="rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                />
                <input
                  value={song.key}
                  onChange={(event) =>
                    setSongs((current) => current.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)))
                  }
                  placeholder="Key"
                  className="rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeSongRow(index)}
                  className="inline-flex items-center justify-center rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSongs((current) => [...current, { ...blankSong }])}
            className="rounded-2xl border border-[#9FD6D5] px-4 py-3 text-sm font-semibold text-[#1E8C8A]"
          >
            Add Row
          </button>
          <button
            type="button"
            disabled={editingId ? !canEdit || isSubmitting : !canCreate || isSubmitting}
            onClick={handleSubmitClick}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isSubmitting
              ? editingId
                ? status === "POSTED"
                  ? "Updating..."
                  : "Saving..."
                : status === "POSTED"
                  ? "Posting..."
                  : "Saving..."
              : editingId
                ? status === "POSTED"
                  ? "Update & Post"
                  : "Save Review"
                : status === "POSTED"
                  ? "Post Selection"
                  : "Save Review"}
          </button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading song selections...</p> : null}
      {!isLoading && selections.length === 0 ? <EmptyState message="No song selections yet." /> : null}

      <div className="grid gap-3">
        {selections.map((selection) => (
          <article key={selection.id} className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">{selection.title}</h2>
                <p className="text-sm text-slate-600">{formatAppDate(selection.selectionDate)}</p>
                <p className="mt-1 text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
                  {selection.status === "POSTED" ? "Posted" : "In Review"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => startEdit(selection)}
                    className="rounded-2xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A]"
                  >
                    Edit
                  </button>
                ) : null}
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() =>
                      showConfirm({
                        title: "Post Song Selection?",
                        message: "This will make the selection visible to choir members right away.",
                        confirmLabel: "Post Selection",
                        tone: "default",
                        onConfirm: () => postSelection(selection),
                      })
                    }
                    disabled={selection.status === "POSTED" || postingId === selection.id}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      selection.status === "POSTED"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "bg-[#2CA6A4] text-white hover:bg-[#1E8C8A]"
                    }`}
                  >
                    {selection.status === "POSTED" ? "Posted" : postingId === selection.id ? "Posting..." : "Post"}
                  </button>
                ) : null}
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() =>
                      showConfirm({
                        title: "Delete Song Selection?",
                        message: "This action will permanently remove the selection from the admin panel.",
                        confirmLabel: "Delete Selection",
                        tone: "danger",
                        onConfirm: () => deleteSelection(selection.id),
                      })
                    }
                    className="rounded-2xl border border-red-200 p-2 text-red-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 6h18M8 6V4h8v2M7 6l1 14h8l1-14M10 10v6M14 10v6" />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setExpandedId((current) => (current === selection.id ? null : selection.id))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#9FD6D5] px-4 py-2 text-sm font-semibold text-[#1E8C8A]"
                >
                  Details
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 transition ${expandedId === selection.id ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </div>
            {expandedId === selection.id ? (
              <div className="mt-4 grid gap-2">
                {selection.songs.map((song, index) => (
                  <div key={`${selection.id}-${index}`} className="rounded-2xl bg-[#F8FAFA] px-4 py-3 text-sm text-slate-700">
                    {song.part} | {song.song} | {song.key}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <ActionModal
        open={Boolean(confirmModal)}
        title={confirmModal?.title ?? ""}
        message={confirmModal?.message ?? ""}
        confirmLabel={confirmModal?.confirmLabel}
        tone={confirmModal?.tone}
        isProcessing={isModalSubmitting}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal ? () => void runConfirmedAction() : undefined}
      />

      <ActionModal
        open={Boolean(feedbackModal)}
        title={feedbackModal?.title ?? ""}
        message={feedbackModal?.message ?? ""}
        tone={feedbackModal?.tone === "success" ? "success" : "danger"}
        onClose={() => setFeedbackModal(null)}
      />
    </div>
  );
}
