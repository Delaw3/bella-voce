"use client";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { useCan } from "@/components/admin/admin-session-provider";
import { EmptyState } from "@/components/admin/empty-state";
import { ActionModal } from "@/components/ui/action-modal";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { EMAIL_PATTERN, formatAppDate, formatDisplayName, formatInitials, normalizeEmail } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WaitlistItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  uniqueId: string;
  source: string;
  status: string;
  signupCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  registrationState: "REGISTERED" | "WAITLIST_ONLY";
  registeredUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    uniqueId: string;
    voicePart: string;
    choirLevel: string;
    status: string;
    onboardingCompleted: boolean;
    profilePicture?: string;
    createdAt: string;
  } | null;
};

type WaitlistSummary = {
  total: number;
  registered: number;
  waiting: number;
};

type WaitlistPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type RegisterValues = {
  firstName: string;
  lastName: string;
  email: string;
};

type RegisterFieldErrors = Partial<Record<keyof RegisterValues, string>>;

const initialRegisterValues: RegisterValues = {
  firstName: "",
  lastName: "",
  email: "",
};

const registrationStateClasses = {
  REGISTERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  WAITLIST_ONLY: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function validateRegisterValues(values: RegisterValues) {
  const errors: RegisterFieldErrors = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";

  const email = normalizeEmail(values.email);
  if (!email) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

export function WaitlistAdmin() {
  const router = useRouter();
  const canCreate = useCan("waitlist.create");
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [summary, setSummary] = useState<WaitlistSummary>({ total: 0, registered: 0, waiting: 0 });
  const [pagination, setPagination] = useState<WaitlistPagination>({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "REGISTERED" | "WAITLIST_ONLY">("ALL");
  const [registerValues, setRegisterValues] = useState<RegisterValues>(initialRegisterValues);
  const [registerErrors, setRegisterErrors] = useState<RegisterFieldErrors>({});
  const [createdRegistrationId, setCreatedRegistrationId] = useState<string | null>(null);
  const [lastEmailSent, setLastEmailSent] = useState<boolean | null>(null);

  async function loadItems(nextPage = pagination.page, nextQuery = query, nextFilter = filter) {
    setIsLoading(true);
    const params = new URLSearchParams({
      ts: String(Date.now()),
      page: String(nextPage),
      limit: String(pagination.limit),
      filter: nextFilter,
    });
    if (nextQuery.trim()) {
      params.set("q", nextQuery.trim());
    }
    const response = await fetch(`/api/admin/waitlist?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as {
      items?: WaitlistItem[];
      summary?: WaitlistSummary;
      pagination?: WaitlistPagination;
      message?: string;
    };

    if (response.ok) {
      setItems(payload.items ?? []);
      setSummary(payload.summary ?? { total: 0, registered: 0, waiting: 0 });
      setPagination(payload.pagination ?? { page: 1, limit: 8, total: 0, totalPages: 1 });
      setMessage(null);
    } else {
      setMessage(payload.message ?? "Unable to load waitlist records.");
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      const params = new URLSearchParams({
        ts: String(Date.now()),
        page: "1",
        limit: String(pagination.limit),
        filter: "ALL",
      });
      const response = await fetch(`/api/admin/waitlist?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        items?: WaitlistItem[];
        summary?: WaitlistSummary;
        pagination?: WaitlistPagination;
        message?: string;
      };

      if (cancelled) {
        return;
      }

      if (response.ok) {
        setItems(payload.items ?? []);
        setSummary(payload.summary ?? { total: 0, registered: 0, waiting: 0 });
        setPagination(payload.pagination ?? { page: 1, limit: 8, total: 0, totalPages: 1 });
        setMessage(null);
      } else {
        setMessage(payload.message ?? "Unable to load waitlist records.");
      }

      setIsLoading(false);
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [pagination.limit]);

  async function handleCreateRecord() {
    const trimmedValues = {
      firstName: registerValues.firstName.trim(),
      lastName: registerValues.lastName.trim(),
      email: normalizeEmail(registerValues.email),
    };

    const nextErrors = validateRegisterValues(trimmedValues);
    setRegisterErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsCreating(true);
    const response = await fetch("/api/admin/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trimmedValues),
    });

    const payload = (await response.json()) as {
      message?: string;
      registrationId?: string;
      emailSent?: boolean;
      fieldErrors?: RegisterFieldErrors;
    };

    if (!response.ok) {
      setRegisterErrors(payload.fieldErrors ?? {});
      setMessage(payload.message ?? "Unable to create registration right now.");
      setIsCreating(false);
      return;
    }

    setRegisterValues(initialRegisterValues);
    setRegisterErrors({});
    setMessage(payload.message ?? null);
    setCreatedRegistrationId(payload.registrationId ?? null);
    setLastEmailSent(payload.emailSent ?? null);
    await loadItems(1, query, filter);
    setIsCreating(false);
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Waitlist"
        description="Review Bella Voce waitlist signups, create new registrations for invited members, and inspect who has completed registration."
        badge="Registration Queue"
      />

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Expand any row to inspect the waitlist details and the linked registered member account.</p>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
          >
            Close
          </button>
        </div>
      </section>

      {canCreate ? (
        <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[#1F2937]">Create Registration</h2>
              <p className="mt-1 text-sm text-slate-600">Add someone to the waitlist from admin, generate their ID, and email them immediately.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
                First Name
              </label>
              <input
                value={registerValues.firstName}
                onChange={(event) => {
                  setRegisterValues((current) => ({ ...current, firstName: event.target.value }));
                  if (registerErrors.firstName) setRegisterErrors((current) => ({ ...current, firstName: "" }));
                }}
                className="w-full rounded-2xl border border-[#9FD6D5]/80 bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
                placeholder="John"
              />
              {registerErrors.firstName ? <p className="mt-1.5 text-xs text-red-600">{registerErrors.firstName}</p> : null}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
                Last Name
              </label>
              <input
                value={registerValues.lastName}
                onChange={(event) => {
                  setRegisterValues((current) => ({ ...current, lastName: event.target.value }));
                  if (registerErrors.lastName) setRegisterErrors((current) => ({ ...current, lastName: "" }));
                }}
                className="w-full rounded-2xl border border-[#9FD6D5]/80 bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
                placeholder="Doe"
              />
              {registerErrors.lastName ? <p className="mt-1.5 text-xs text-red-600">{registerErrors.lastName}</p> : null}
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase">
              Email
            </label>
            <input
              type="email"
              value={registerValues.email}
              onChange={(event) => {
                setRegisterValues((current) => ({ ...current, email: event.target.value }));
                if (registerErrors.email) setRegisterErrors((current) => ({ ...current, email: "" }));
              }}
              className="w-full rounded-2xl border border-[#9FD6D5]/80 bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
              placeholder="person@example.com"
            />
            {registerErrors.email ? <p className="mt-1.5 text-xs text-red-600">{registerErrors.email}</p> : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleCreateRecord()}
              disabled={isCreating}
              className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(30,140,138,0.22)] transition hover:bg-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Register Person"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total Waitlist", value: summary.total },
          { label: "Registered", value: summary.registered },
          { label: "Still Waiting", value: summary.waiting },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[24px] border border-[#9FD6D5]/70 bg-white px-4 py-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]"
          >
            <p className="text-xs font-semibold tracking-[0.12em] text-[#1E8C8A] uppercase">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#1F2937]">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or ID"
            className="w-full rounded-2xl border border-[#9FD6D5]/80 bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as "ALL" | "REGISTERED" | "WAITLIST_ONLY")}
            className="w-full rounded-2xl border border-[#9FD6D5]/80 bg-[#F8FAFA] px-4 py-3 text-sm text-[#1F2937] outline-none transition focus:border-[#2CA6A4] focus:bg-white"
          >
            <option value="ALL">All Records</option>
            <option value="REGISTERED">Registered</option>
            <option value="WAITLIST_ONLY">Waiting</option>
          </select>
          <button
            type="button"
            onClick={() => void loadItems(1, query, filter)}
            className="rounded-2xl bg-[#2CA6A4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1E8C8A]"
          >
            Search
          </button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading waitlist records...</p> : null}
      {message ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
      {!isLoading && !message && items.length === 0 ? <EmptyState message="No waitlist records found." /> : null}

      <section className="grid gap-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[28px] border border-[#9FD6D5]/70 bg-white p-5 shadow-[0_14px_30px_rgba(31,41,55,0.07)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#1F2937]">
                  {formatDisplayName(item.firstName, item.lastName)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                <p className="mt-2 text-xs font-semibold tracking-[0.08em] text-[#1E8C8A] uppercase">
                  Registration ID: {item.uniqueId}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${registrationStateClasses[item.registrationState]}`}>
                  {item.registrationState === "REGISTERED" ? "Registered" : "Waiting"}
                </span>
                <span className="rounded-full bg-[#F8FAFA] px-3 py-1 text-xs font-semibold text-slate-500">
                  {formatStatusLabel(item.status)}
                </span>
              </div>
            </div>

            <details className="group mt-5 overflow-hidden rounded-[24px] border border-slate-100 bg-[#F8FAFA] open:border-[#9FD6D5] open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="text-sm font-semibold tracking-[0.08em] text-slate-500 uppercase">Review Details</h3>
                  <p className="mt-1 text-xs text-slate-500">Open to inspect the waitlist record and registration outcome.</p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-500 transition group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>

              <div className="border-t border-slate-100 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-[#F8FAFA] px-4 py-3">
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Joined Waitlist</p>
                    <p className="mt-2 text-sm font-semibold text-[#1F2937]">{formatAppDate(item.createdAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8FAFA] px-4 py-3">
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Signup Completed</p>
                    <p className="mt-2 text-sm font-semibold text-[#1F2937]">{item.signupCompleted ? "Yes" : "No"}</p>
                  </div>
                </div>

                {item.registeredUser ? (
                  <div className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <ProfileAvatar
                        src={item.registeredUser.profilePicture}
                        alt={`${item.registeredUser.firstName} ${item.registeredUser.lastName}`}
                        initials={formatInitials(item.registeredUser.firstName, item.registeredUser.lastName)}
                        size={56}
                        className="h-14 w-14 ring-2 ring-white"
                        fallbackClassName="bg-white text-emerald-700"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-[#1F2937]">
                            {formatDisplayName(item.registeredUser.firstName, item.registeredUser.lastName)}
                          </p>
                          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            Registered Member
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{item.registeredUser.email}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-white px-4 py-3">
                            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Voice Part</p>
                            <p className="mt-2 text-sm font-semibold text-[#1F2937]">{item.registeredUser.voicePart || "Not set"}</p>
                          </div>
                          <div className="rounded-2xl bg-white px-4 py-3">
                            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Choir Level</p>
                            <p className="mt-2 text-sm font-semibold text-[#1F2937]">{item.registeredUser.choirLevel}</p>
                          </div>
                          <div className="rounded-2xl bg-white px-4 py-3">
                            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Member Status</p>
                            <p className="mt-2 text-sm font-semibold text-[#1F2937]">{item.registeredUser.status}</p>
                          </div>
                          <div className="rounded-2xl bg-white px-4 py-3">
                            <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">Registered On</p>
                            <p className="mt-2 text-sm font-semibold text-[#1F2937]">{formatAppDate(item.registeredUser.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[24px] border border-dashed border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-800">
                    This person is still on the waitlist and has not completed registration yet.
                  </div>
                )}
              </div>
            </details>
          </article>
        ))}
      </section>

      {pagination.totalPages > 1 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#9FD6D5]/70 bg-white px-4 py-3 shadow-[0_14px_30px_rgba(31,41,55,0.07)]">
          <p className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void loadItems(Math.max(1, pagination.page - 1), query, filter)}
              disabled={pagination.page <= 1 || isLoading}
              className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => void loadItems(Math.min(pagination.totalPages, pagination.page + 1), query, filter)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
              className="rounded-2xl border border-[#9FD6D5] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      <ActionModal
        open={Boolean(createdRegistrationId)}
        tone="success"
        title="Registration Created"
        message={
          createdRegistrationId
            ? `Registration ID: ${createdRegistrationId}. ${lastEmailSent === false ? "The waitlist record was created, but the email could not be sent right now." : "The person has been added to the waitlist and their registration ID has been emailed."}`
            : ""
        }
        onClose={() => {
          setCreatedRegistrationId(null);
          setLastEmailSent(null);
        }}
      />
    </div>
  );
}
