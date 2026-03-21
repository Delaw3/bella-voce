import { TotalOwedCard } from "@/components/dashboard/total-owed-card";
import { formatNaira } from "@/lib/naira";
import { DebtBreakdown, DebtDetailBreakdown, MonthlyDueItem } from "@/types/dashboard";

type MonthlyDuesPanelProps = {
  debt: DebtBreakdown;
  details: DebtDetailBreakdown;
  months: MonthlyDueItem[];
  year: number;
  availableYears: number[];
  onYearChange: (year: number) => void | Promise<void>;
};

const statusClasses: Record<MonthlyDueItem["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NOT_PAID: "bg-slate-100 text-slate-600 border-slate-200",
};

export function MonthlyDuesPanel({ debt, details, months, year, availableYears, onYearChange }: MonthlyDuesPanelProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Dues Breakdown</p>
          <p className="dashboard-feature-copy mt-1 text-sm text-slate-600">Tap any row to open the full list behind that total.</p>
        </div>
        <TotalOwedCard debt={debt} details={details} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">Monthly Dues Years</p>
            <p className="dashboard-feature-copy mt-1 text-sm text-slate-600">View only the years and months available for your dues record.</p>
          </div>
          <select
            value={year}
            onChange={(event) => void onYearChange(Number(event.target.value))}
            className="dashboard-feature-select rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            {availableYears.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </div>

        {months.length === 0 ? (
          <p className="dashboard-feature-empty rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No monthly dues apply for {year}.
          </p>
        ) : (
          <ul className="space-y-2">
            {months.map((item) => (
              <li
                key={item.month}
                className="dashboard-feature-subtle flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
              >
                <div>
                  <p className="dashboard-feature-title text-sm font-semibold text-[#1F2937]">{item.month}</p>
                  <p className="dashboard-feature-copy text-xs text-slate-600">{formatNaira(item.amount)}</p>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClasses[item.status]}`}>
                  {item.status === "PAID" ? "Paid" : "Not Paid"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
