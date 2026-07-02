/** Day keys are UTC dates formatted as YYYYMMDD (e.g. "20260702"). */

export const dayKeyFromDate = (date: Date): string => {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};

/** Today's day key in UTC. */
export const todayKey = (): string => dayKeyFromDate(new Date());

/** The day key immediately before the given day key. */
export const previousDayKey = (day: string): string => {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(4, 6));
  const d = Number(day.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return dayKeyFromDate(date);
};

export const isValidDayKey = (value: string): boolean => /^\d{8}$/.test(value);
