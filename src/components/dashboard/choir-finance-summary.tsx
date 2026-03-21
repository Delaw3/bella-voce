import { formatNaira } from "@/lib/naira";
import { ChoirFinanceSummary } from "@/types/dashboard";

type ChoirFinanceSummaryProps = {
  summary: ChoirFinanceSummary;
};

export function ChoirFinanceSummaryCards({ summary }: ChoirFinanceSummaryProps) {
  const cards = [
    { label: "Total Income", value: summary.totalIncome, tone: "text-emerald-700 bg-emerald-50 border-emerald-100" },
    {
      label: "Total Expenses",
      value: summary.totalExpenses,
      tone: "text-red-700 bg-red-50 border-red-100",
    },
    { label: "Balance", value: summary.balance, tone: "text-[#1E8C8A] bg-[#EAF9F8] border-[#9FD6D5]" },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <article key={card.label} className={`rounded-2xl border p-4 ${card.tone}`}>
          <p className="text-xs font-semibold tracking-[0.08em] uppercase">{card.label}</p>
          <p className="mt-2 text-xl font-semibold">{formatNaira(card.value)}</p>
        </article>
      ))}
    </section>
  );
}
