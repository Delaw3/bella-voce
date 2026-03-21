"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { MONTHLY_DUES_YEAR_OPTIONS } from "@/lib/accountability-years";
import { DUE_MONTH_NUMBERS } from "@/lib/monthly-dues";
import { getOptimizedSupabaseImageUrl } from "@/lib/supabase-image";
import { formatDisplayName } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

type MonthlyDueStatus = {
  month: string;
  monthNumber: number;
  amount: number;
  status: "PAID" | "NOT_PAID";
  paidAt?: string;
};

type MonthlyDuesAdminItem = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  isRegistered: boolean;
  monthlyDuesStartYear: number;
  removedMonths: number[];
  availableYears: number[];
  selectedYear: number;
  months: MonthlyDueStatus[];
};

type SettingsPayload = {
  monthlyDues: number;
  monthlyDuesStartYear: number;
  currentYear: number;
};

function formatMonthlyDueStatus(status: MonthlyDueStatus["status"]) {
  return status === "NOT_PAID" ? "NOT PAID" : status;
}

function getSummary(item: MonthlyDuesAdminItem) {
  const paidCount = item.months.filter((month) => month.status === "PAID").length;
  const unpaidCount = item.months.length - paidCount;
  return { paidCount, unpaidCount };
}

function getPreviewMonths(removedMonths: number[], amount: number) {
  return DUE_MONTH_NUMBERS.filter((monthNumber) => !removedMonths.includes(monthNumber)).map((monthNumber) => ({
    month: new Date(2026, monthNumber - 1, 1).toLocaleDateString("en-GB", { month: "long" }),
    monthNumber,
    amount,
    status: "NOT_PAID" as const,
  }));
}

export function MonthlyDuesAdmin() {
  const canEdit = useCan("monthly_dues.mark_paid");
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState("");
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState(0);
  const [monthlyDuesStartYear, setMonthlyDuesStartYear] = useState(MONTHLY_DUES_YEAR_OPTIONS[0]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState<MonthlyDuesAdminItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MonthlyDuesAdminItem | null>(null);
  const [selectedUserStartYear, setSelectedUserStartYear] = useState(new Date().getFullYear());
  const [selectedRemovedMonths, setSelectedRemovedMonths] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success">("default");

  const selectedYear = Math.min(Math.max(year, monthlyDuesStartYear), currentYear);
  const availableYears = MONTHLY_DUES_YEAR_OPTIONS.filter(
    (optionYear) => optionYear >= monthlyDuesStartYear && optionYear <= currentYear,
  );
  const userStartYearOptions = MONTHLY_DUES_YEAR_OPTIONS.filter((optionYear) => optionYear >= monthlyDuesStartYear);

  async function loadItems(search = query, requestedYear = selectedYear, selectedUserId?: string | null) {
    setIsLoading(true);
    const params = new URLSearchParams({ year: String(requestedYear) });
    if (search.trim()) params.set("q", search.trim());

    const response = await fetch(`/api/admin/monthly-dues?${params.toString()}`);
    const payload = (await response.json()) as {
      items?: MonthlyDuesAdminItem[];
      settings?: SettingsPayload;
      message?: string;
    };

    if (response.ok) {
      const nextItems = payload.items ?? [];
      const settings = payload.settings;

      setItems(nextItems);
      setMonthlyDuesAmount(Number(settings?.monthlyDues || 0));
      setMonthlyDuesStartYear(Number(settings?.monthlyDuesStartYear || MONTHLY_DUES_YEAR_OPTIONS[0]));
      setCurrentYear(Number(settings?.currentYear || new Date().getFullYear()));
      setSelectedItem((current) => {
        const nextSelected =
          nextItems.find((item) => item.userId === (selectedUserId ?? current?.userId ?? "")) ?? null;

        if (nextSelected) {
          setSelectedUserStartYear(nextSelected.monthlyDuesStartYear);
          setSelectedRemovedMonths(nextSelected.removedMonths);
        }

        return nextSelected;
      });
    } else {
      setMessage(payload.message ?? "Unable to load monthly dues.");
      setMessageTone("default");
    }
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      const response = await fetch(`/api/admin/monthly-dues?year=${selectedYear}`);
      const payload = (await response.json()) as {
        items?: MonthlyDuesAdminItem[];
        settings?: SettingsPayload;
        message?: string;
      };

      if (cancelled) return;

      if (response.ok) {
        setItems(payload.items ?? []);
        setMonthlyDuesAmount(Number(payload.settings?.monthlyDues || 0));
        setMonthlyDuesStartYear(Number(payload.settings?.monthlyDuesStartYear || MONTHLY_DUES_YEAR_OPTIONS[0]));
        setCurrentYear(Number(payload.settings?.currentYear || new Date().getFullYear()));
      } else {
        setMessage(payload.message ?? "Unable to load monthly dues.");
        setMessageTone("default");
      }
      setIsLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  function openItem(item: MonthlyDuesAdminItem) {
    setSelectedItem(item);
    setSelectedUserStartYear(item.monthlyDuesStartYear);
    setSelectedRemovedMonths(item.removedMonths);
  }

  async function toggleMonth(userId: string, month: MonthlyDueStatus) {
    if (!selectedItem) return;

    const nextPaid = month.status !== "PAID";
    const actionKey = `${userId}-${selectedItem.selectedYear}-${month.monthNumber}`;
    setUpdatingKey(actionKey);

    const response = await fetch("/api/admin/monthly-dues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        year: selectedItem.selectedYear,
        month: month.monthNumber,
        paid: nextPaid,
      }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setMessageTone(response.ok ? "success" : "default");

    if (response.ok) {
      await loadItems(query, selectedYear, userId);
    }

    setUpdatingKey(null);
  }

  function toggleRemovedMonth(monthNumber: number) {
    setSelectedRemovedMonths((current) =>
      current.includes(monthNumber)
        ? current.filter((item) => item !== monthNumber)
        : [...current, monthNumber].sort((left, right) => left - right),
    );
  }

  async function saveUserConfig() {
    if (!selectedItem) return;

    setIsSavingConfig(true);
    const response = await fetch("/api/admin/monthly-dues", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedItem.userId,
        register: true,
        monthlyDuesStartYear: selectedUserStartYear,
        removedMonths: selectedRemovedMonths,
      }),
    });
    const payload = (await response.json()) as { message?: string };
    setMessage(payload.message ?? null);
    setMessageTone(response.ok ? "success" : "default");

    if (response.ok) {
      const nextYear = Math.max(selectedYear, selectedUserStartYear);
      setYear(nextYear);
      await loadItems(query, nextYear, selectedItem.userId);
    }

    setIsSavingConfig(false);
  }

  const displayedMonths = selectedItem
    ? selectedItem.isRegistered
      ? selectedItem.months
      : getPreviewMonths(selectedRemovedMonths, monthlyDuesAmount)
    : [];

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Monthly Dues"
        description="View a chosen year across the choir, while each member keeps an individual monthly dues start year and removable months."
        badge="Dues Control"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-[150px_1fr_auto]">
          <select
            value={selectedYear}
            onChange={(event) => setYear(Number(event.target.value || monthlyDuesStartYear))}
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          >
            {availableYears.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member by name or email"
            className="rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] px-4 py-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void loadItems(query, selectedYear)}
            disabled={isLoading}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Load"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Global monthly dues cannot start earlier than {monthlyDuesStartYear}. Each user can start from that year upward.
        </p>
        <p className="mt-3 text-sm text-slate-600">Current monthly dues amount: ₦ {monthlyDuesAmount.toLocaleString()}</p>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading monthly dues...</p> : null}
      {!isLoading && items.length === 0 ? <EmptyState message="No monthly dues records found." /> : null}

      <div className="grid gap-3">
        {items.map((item) => {
          const summary = getSummary(item);

          return (
            <button
              key={item.userId}
              type="button"
              onClick={() => openItem(item)}
              className="rounded-[24px] border border-[#9FD6D5]/70 bg-white p-4 text-left transition hover:border-[#2CA6A4] hover:shadow-[0_14px_30px_rgba(31,41,55,0.08)]"
            >
              <div className="flex items-center gap-3">
                {item.profilePicture ? (
                  <Image
                    src={getOptimizedSupabaseImageUrl(item.profilePicture, { width: 88, height: 88, quality: 70, resize: "cover" })}
                    alt={formatDisplayName(item.firstName, item.lastName)}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EAF9F8] text-sm font-semibold text-[#1E8C8A]">
                    {item.firstName.slice(0, 1)}
                    {item.lastName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#1F2937]">{formatDisplayName(item.firstName, item.lastName)}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.isRegistered ? `Starts ${item.monthlyDuesStartYear}` : "Not registered for monthly dues"}
                    {item.removedMonths.length ? ` • Removed ${item.removedMonths.length} month(s)` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F8FAFA] px-4 py-3">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Paid {summary.paidCount}</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Unpaid {summary.unpaidCount}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {item.isRegistered ? `Viewing ${item.selectedYear}` : "Awaiting registration"}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#1E8C8A]">{item.isRegistered ? "Open dues" : "Register dues"}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#1F2937]/45 p-4 backdrop-blur-[2px] sm:items-center">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[#9FD6D5]/70 bg-white shadow-[0_28px_60px_rgba(31,41,55,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6F3F2] px-5 py-4">
              <div className="flex items-center gap-3">
                {selectedItem.profilePicture ? (
                  <Image
                    src={getOptimizedSupabaseImageUrl(selectedItem.profilePicture, { width: 104, height: 104, quality: 72, resize: "cover" })}
                    alt={formatDisplayName(selectedItem.firstName, selectedItem.lastName)}
                    width={52}
                    height={52}
                    className="h-[52px] w-[52px] rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#EAF9F8] text-base font-semibold text-[#1E8C8A]">
                    {selectedItem.firstName.slice(0, 1)}
                    {selectedItem.lastName.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-[#1F2937]">
                    {formatDisplayName(selectedItem.firstName, selectedItem.lastName)}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#1E8C8A]">Monthly dues: ₦ {monthlyDuesAmount.toLocaleString()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-2xl border border-[#9FD6D5] px-3 py-2 text-sm font-semibold text-[#1E8C8A]"
              >
                Close
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-5 py-5">
              <section className="rounded-[24px] border border-[#9FD6D5]/70 bg-[#F8FAFA] p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">User Start Year</span>
                    <select
                      value={selectedUserStartYear}
                      disabled={!canEdit}
                      onChange={(event) => setSelectedUserStartYear(Number(event.target.value))}
                      className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                    >
                      {userStartYearOptions.map((optionYear) => (
                        <option key={optionYear} value={optionYear}>
                          {optionYear}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Viewing Year</span>
                    <select
                      value={selectedItem.isRegistered ? selectedItem.selectedYear : selectedUserStartYear}
                      disabled={!selectedItem.isRegistered}
                      onChange={(event) => {
                        const nextYear = Number(event.target.value);
                        setYear(nextYear);
                        void loadItems(query, nextYear, selectedItem.userId);
                      }}
                      className="w-full rounded-2xl border border-[#9FD6D5] bg-white px-4 py-3 text-sm outline-none"
                    >
                      {(selectedItem.isRegistered ? selectedItem.availableYears : [selectedUserStartYear]).map((optionYear) => (
                        <option key={optionYear} value={optionYear}>
                          {optionYear}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Removed Months</p>
                  <p className="mt-1 text-sm text-slate-600">Removed months are excluded from dues generation for this member across all years.</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {DUE_MONTH_NUMBERS.map((monthNumber) => {
                      const removed = selectedRemovedMonths.includes(monthNumber);

                      return (
                        <button
                          key={monthNumber}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleRemovedMonth(monthNumber)}
                          className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                            removed
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-slate-200 bg-white text-slate-600"
                          } disabled:opacity-50`}
                        >
                          {new Date(2026, monthNumber - 1, 1).toLocaleDateString("en-GB", { month: "short" })}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canEdit || isSavingConfig}
                  onClick={() => void saveUserConfig()}
                  className="mt-4 rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A] disabled:opacity-50"
                >
                  {isSavingConfig ? "Saving..." : selectedItem.isRegistered ? "Save User Dues Settings" : "Register Monthly Dues"}
                </button>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
                      {selectedItem.selectedYear} Dues Months
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Only months available for this member are shown here.
                    </p>
                  </div>
                </div>

                {displayedMonths.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                    {selectedItem.isRegistered
                      ? `No dues months apply for this member in ${selectedItem.selectedYear}.`
                      : "All months are removed. Add at least one month before registering monthly dues for this member."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {displayedMonths.map((month) => {
                      const active = month.status === "PAID";
                      const key = `${selectedItem.userId}-${selectedItem.selectedYear}-${month.monthNumber}`;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={!canEdit || !selectedItem.isRegistered || updatingKey === key}
                          onClick={() => void toggleMonth(selectedItem.userId, month)}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-[#F8FAFA] text-slate-600"
                          } disabled:opacity-50`}
                        >
                          <p className="text-xs font-semibold uppercase">{month.month.slice(0, 3)}</p>
                          <p className="mt-1 text-[11px] font-semibold">
                            {updatingKey === key ? "Saving..." : formatMonthlyDueStatus(month.status)}
                          </p>
                          <p className="mt-2 text-[11px] text-slate-500">
                            {selectedItem.isRegistered ? (active ? "Tap to undo" : "Tap to mark paid") : "Preview before registration"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <ActionModal
        open={Boolean(message)}
        title="Monthly Dues"
        message={message ?? ""}
        onClose={() => setMessage(null)}
        tone={messageTone}
      />
    </div>
  );
}
