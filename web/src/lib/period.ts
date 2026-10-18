export const PERIODS = {
  this_week: "This week",
  prev_week: "Last week",
  this_month: "This month",
  prev_month: "Last month",
} as const;
export type Period = keyof typeof PERIODS;
export const isPeriod = (p: unknown): p is Period => typeof p === "string" && p in PERIODS;

// Title for a period in the household time zone: "This week", or the month name for month views.
export function periodTitle(period: Period, tz: string, now = new Date()) {
  if (!period.endsWith("month")) return PERIODS[period];
  const month = (d: Date) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: tz }).format(d);
  if (period === "this_month") return month(now);
  const day = Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: tz }).format(now));
  return month(new Date(now.getTime() - day * 86_400_000)); // `day` days back is the last day of the previous month
}
