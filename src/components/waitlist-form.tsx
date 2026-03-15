"use client";

import { FormEvent, useMemo, useState } from "react";
import { EMAIL_PATTERN, normalizeEmail } from "@/lib/utils";

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

type ApiSuccess = {
  message: string;
  registrationId: string;
};

type ApiError = {
  message?: string;
  fieldErrors?: FieldErrors;
};

const initialValues: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";

  const normalizedEmail = normalizeEmail(values.email);
  if (!normalizedEmail) {
    errors.email = "Email is required.";
  } else if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

export function WaitlistForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ApiSuccess | null>(null);

  const hasErrors = useMemo(
    () => Object.values(errors).some((value) => Boolean(value)),
    [errors],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setSuccess(null);

    const trimmedValues: FormValues = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: normalizeEmail(values.email),
    };

    const nextErrors = validate(trimmedValues);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmedValues),
      });

      const payload = (await response.json()) as ApiSuccess | ApiError;

      if (!response.ok) {
        const responseErrors = "fieldErrors" in payload ? payload.fieldErrors : undefined;
        if (responseErrors) setErrors(responseErrors);
        setServerError(payload.message ?? "Unable to submit your request right now.");
        return;
      }

      setValues(initialValues);
      setErrors({});
      setSuccess(payload as ApiSuccess);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-2xl border border-bv-secondary/60 bg-white/90 p-4 shadow-[0_10px_28px_rgba(31,41,55,0.06)] sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase"
          >
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            value={values.firstName}
            onChange={(event) => {
              setValues((prev) => ({ ...prev, firstName: event.target.value }));
              if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: "" }));
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-bv-text outline-none transition placeholder:text-slate-400 focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
            placeholder="John"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
          />
          {errors.firstName ? (
            <p id="firstName-error" className="mt-1.5 text-xs text-red-600">
              {errors.firstName}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase"
          >
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(event) => {
              setValues((prev) => ({ ...prev, lastName: event.target.value }));
              if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: "" }));
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-bv-text outline-none transition placeholder:text-slate-400 focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
            placeholder="Doe"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
          />
          {errors.lastName ? (
            <p id="lastName-error" className="mt-1.5 text-xs text-red-600">
              {errors.lastName}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, email: event.target.value }));
            if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-bv-text outline-none transition placeholder:text-slate-400 focus:border-[#2CA6A4] focus:bg-white focus:ring-4 focus:ring-[#2CA6A4]/15"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email ? (
          <p id="email-error" className="mt-1.5 text-xs text-red-600">
            {errors.email}
          </p>
        ) : null}
        <p className="mt-1.5 text-xs text-slate-500">
          Make sure you are using a valid email address.
        </p>
      </div>

      {serverError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>{success.message}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || hasErrors}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#2CA6A4] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(30,140,138,0.3)] transition hover:bg-[#1E8C8A] hover:shadow-[0_10px_24px_rgba(30,140,138,0.35)] disabled:cursor-not-allowed disabled:bg-[#2CA6A4]/60 disabled:shadow-none"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Submitting...
          </span>
        ) : (
          "Join Waitlist"
        )}
      </button>
    </form>
  );
}
