export const DUE_MONTH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type DueMonthNumber = (typeof DUE_MONTH_NUMBERS)[number];

export const DUE_MONTH_LABELS: Record<DueMonthNumber, string> = {
  1: "January",
  2: "February",
  3: "March",
  4: "April",
  5: "May",
  6: "June",
  7: "July",
  8: "August",
  9: "September",
  10: "October",
  11: "November",
  12: "December",
};

export function getMonthLabel(month: number): string {
  return DUE_MONTH_LABELS[month as DueMonthNumber] ?? String(month);
}
