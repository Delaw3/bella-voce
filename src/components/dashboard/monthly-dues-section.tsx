import { formatNaira } from "@/lib/naira";
import { MonthlyDueItem } from "@/types/dashboard";

type MonthlyDuesSectionProps = {
  months: MonthlyDueItem[];
  year: number;
};

const statusClasses: Record<MonthlyDueItem["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_PAID: "bg-slate-100 text-slate-600 border-slate-200",
};

export function MonthlyDuesSection({ months, year }: MonthlyDuesSectionProps) {
  return (
    <section className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)] sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-[#1F2937]">Monthly Dues</h3>
        <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">{year}</span>
      </div>

      <ul className="mt-4 space-y-2">
        {months.map((item) => (
          <li key={item.month} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-[#1F2937]">{item.month}</p>
              <p className="text-xs text-slate-600">{formatNaira(item.amount)}</p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClasses[item.status]}`}>
              {item.status === "PAID" ? "Paid" : "Not Paid"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
