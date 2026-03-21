export const MONTHLY_DUES_START_YEAR_MIN = 2024;
export const MONTHLY_DUES_START_YEAR_MAX = 2040;

export const MONTHLY_DUES_YEAR_OPTIONS = Array.from(
  { length: MONTHLY_DUES_START_YEAR_MAX - MONTHLY_DUES_START_YEAR_MIN + 1 },
  (_, index) => MONTHLY_DUES_START_YEAR_MIN + index,
);

export function isValidMonthlyDuesStartYear(value: number) {
  return MONTHLY_DUES_YEAR_OPTIONS.includes(value);
}
