import { ChoirFinanceEntry } from "@/types/dashboard";
import { ChoirFinanceEntryCard } from "@/components/dashboard/choir-finance-entry-card";

type ChoirFinanceListProps = {
  entries: ChoirFinanceEntry[];
};

export function ChoirFinanceList({ entries }: ChoirFinanceListProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No choir finance records yet.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      {entries.map((entry) => (
        <ChoirFinanceEntryCard key={entry.id} entry={entry} />
      ))}
    </section>
  );
}
