"use client";

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
};

export function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#2CA6A4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </p>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#2CA6A4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
