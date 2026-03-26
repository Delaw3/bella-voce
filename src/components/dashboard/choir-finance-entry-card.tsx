import { formatNaira } from "@/lib/naira";
import { capitalizeWords, formatAppDate, formatNameString } from "@/lib/utils";
import { ChoirFinanceEntry } from "@/types/dashboard";

type ChoirFinanceEntryCardProps = {
  entry: ChoirFinanceEntry;
};

export function ChoirFinanceEntryCard({ entry }: ChoirFinanceEntryCardProps) {
  const badgeClass =
    entry.type === "INCOME"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1F2937]">{entry.description}</p>
          <p className="mt-1 text-xs text-slate-500">{formatAppDate(entry.financeDate)}</p>
          {entry.postedBy ? <p className="mt-1 text-xs text-slate-500">Posted by {formatNameString(entry.postedBy)}</p> : null}
          {entry.editedBy ? <p className="mt-1 text-xs text-slate-500">Edited by {formatNameString(entry.editedBy)}</p> : null}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeClass}`}>
          {capitalizeWords(entry.type)}
        </span>
      </div>
      <p className="mt-3 text-base font-semibold text-[#1F2937]">{formatNaira(entry.amount)}</p>
    </article>
  );
}
