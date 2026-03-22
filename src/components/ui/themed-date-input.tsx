"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ThemedDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
};

type CalendarDay = {
  key: string;
  value: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string, placeholder: string) {
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return placeholder;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildCalendarDays(viewDate: Date) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  const monthStartDay = (monthStart.getDay() + 6) % 7;
  calendarStart.setDate(monthStart.getDate() - monthStartDay);

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const currentDate = new Date(calendarStart);
    currentDate.setDate(calendarStart.getDate() + index);

    return {
      key: `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`,
      value: toDateValue(currentDate),
      dayNumber: currentDate.getDate(),
      isCurrentMonth: currentDate.getMonth() === viewDate.getMonth(),
    };
  });
}

function isDateOutOfRange(dateValue: string, min?: string, max?: string) {
  if (min && dateValue < min) {
    return true;
  }

  if (max && dateValue > max) {
    return true;
  }

  return false;
}

export function ThemedDateInput({
  value,
  onChange,
  label,
  placeholder = "Select date",
  required = false,
  min,
  max,
  className = "",
  id,
}: ThemedDateInputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const initialDate = useMemo(() => parseDateValue(value) ?? parseDateValue(min) ?? new Date(), [min, value]);
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(initialDate);
  const displayDate = formatDisplayDate(value, placeholder);
  const selectedValue = value || "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);

  return (
    <div className={`block ${className}`} ref={wrapperRef}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase">
          {label}
        </label>
      ) : null}

      <input id={id} type="hidden" value={value} required={required} />

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const nextOpenState = !isOpen;

            if (nextOpenState) {
              setViewDate(parseDateValue(value) ?? parseDateValue(min) ?? new Date());
            }

            setIsOpen(nextOpenState);
          }}
          className="relative w-full overflow-hidden rounded-2xl border border-[#9FD6D5]/80 bg-[linear-gradient(180deg,#FDFEFE_0%,#F4FBFB_100%)] text-left shadow-[0_10px_24px_rgba(31,41,55,0.05)] transition hover:border-[#2CA6A4] focus-visible:border-[#2CA6A4] focus-visible:outline-none focus-visible:shadow-[0_14px_30px_rgba(44,166,164,0.16)]"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#1E8C8A]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M8 3v3" />
              <path d="M16 3v3" />
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M3 10h18" />
            </svg>
          </div>

          <div className="flex min-h-[52px] items-center pr-12 pl-12">
            <span className={`truncate text-sm font-semibold ${value ? "text-[#1F2937]" : "text-slate-400"}`}>{displayDate}</span>
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400">
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>

        {isOpen ? (
          <div className="absolute left-0 z-[80] mt-2 w-full min-w-[290px] rounded-[24px] border border-[#9FD6D5]/80 bg-white p-4 shadow-[0_20px_45px_rgba(31,41,55,0.16)]">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] text-[#1E8C8A] transition hover:border-[#2CA6A4] hover:bg-[#EAF9F8]"
                aria-label="Previous month"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m15 6-6 6 6 6" />
                </svg>
              </button>

              <p className="text-sm font-semibold text-[#1F2937]">{formatMonthLabel(viewDate)}</p>

              <button
                type="button"
                onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#9FD6D5] bg-[#F8FAFA] text-[#1E8C8A] transition hover:border-[#2CA6A4] hover:bg-[#EAF9F8]"
                aria-label="Next month"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday} className="text-center text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">
                  {weekday}
                </span>
              ))}

              {calendarDays.map((day) => {
                const isSelected = day.value === selectedValue;
                const isDisabled = isDateOutOfRange(day.value, min, max);

                return (
                  <button
                    key={day.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      onChange(day.value);
                      setIsOpen(false);
                    }}
                    className={[
                      "flex h-10 items-center justify-center rounded-2xl text-sm font-semibold transition",
                      isSelected
                        ? "bg-[#2CA6A4] text-white shadow-[0_12px_24px_rgba(44,166,164,0.24)]"
                        : day.isCurrentMonth
                          ? "bg-[#F8FAFA] text-[#1F2937] hover:bg-[#EAF9F8] hover:text-[#1E8C8A]"
                          : "bg-transparent text-slate-300",
                      isDisabled ? "cursor-not-allowed opacity-35" : "",
                    ].join(" ")}
                  >
                    {day.dayNumber}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  const today = toDateValue(new Date());

                  if (!isDateOutOfRange(today, min, max)) {
                    onChange(today);
                  }

                  setIsOpen(false);
                }}
                className="rounded-2xl border border-[#9FD6D5] bg-[#EAF9F8] px-4 py-2.5 text-sm font-semibold text-[#1E8C8A] transition hover:border-[#2CA6A4]"
              >
                Today
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
