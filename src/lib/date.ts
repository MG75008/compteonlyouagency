export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Toronto";

export function dayKey(d: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKey(tz: string = APP_TIMEZONE): string {
  return dayKey(new Date(), tz);
}

function localMidnightToUtc(dateStr: string, tz: string): Date {
  const asUtc = new Date(`${dateStr}T00:00:00Z`);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(asUtc);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asIfUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  const offsetMs = asIfUtc - asUtc.getTime();
  return new Date(asUtc.getTime() - offsetMs);
}

export function dayRangeUtc(dateStr: string, tz: string = APP_TIMEZONE) {
  const start = localMidnightToUtc(dateStr, tz);
  const [y, m, d] = dateStr.split("-").map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDateStr = nextDate.toISOString().slice(0, 10);
  const end = localMidnightToUtc(nextDateStr, tz);
  return { start, end };
}

export function shiftDayKey(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export function monthBounds(dateStr: string): { first: string; last: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { first, last };
}

export function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (dow + 6) % 7;
  return shiftDayKey(dateStr, -mondayOffset);
}

export function daysBetween(fromStr: string, toStr: string): number {
  const [y1, m1, d1] = fromStr.split("-").map(Number);
  const [y2, m2, d2] = toStr.split("-").map(Number);
  return Math.round(
    (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000
  );
}

export function daysInRange(fromDateStr: string, toDateStr: string): string[] {
  const result: string[] = [];
  let cur = fromDateStr;
  let guard = 0;
  while (cur <= toDateStr && guard < 400) {
    result.push(cur);
    cur = shiftDayKey(cur, 1);
    guard++;
  }
  return result;
}

export function monthsInRange(fromStr: string, toStr: string): string[] {
  const result: string[] = [];
  let [y, m] = fromStr.split("-").map(Number);
  const [ey, em] = toStr.split("-").map(Number);
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard < 600) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    guard++;
  }
  return result;
}

export function hourKeysOfDay(): string[] {
  return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
}

export function hourOfDate(d: Date, tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    hourCycle: "h23",
  })
    .format(d)
    .padStart(2, "0");
}

export function monthKeyOf(d: Date, tz: string = APP_TIMEZONE): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  });
  const parts = dtf.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}`;
}

export type ViewPeriod = "yesterday" | "today" | "week" | "month" | "alltime";
export type Granularity = "hour" | "day" | "month";

export function viewPeriodBounds(
  period: ViewPeriod,
  earliestDate: string | undefined,
  tz: string = APP_TIMEZONE
): { from: string; to: string; granularity: Granularity } {
  const today = todayKey(tz);
  switch (period) {
    case "yesterday": {
      const d = shiftDayKey(today, -1);
      return { from: d, to: d, granularity: "hour" };
    }
    case "today":
      return { from: today, to: today, granularity: "hour" };
    case "week":
      return { from: startOfWeek(today), to: today, granularity: "day" };
    case "month": {
      const { first } = monthBounds(today);
      return { from: first, to: today, granularity: "day" };
    }
    case "alltime": {
      const from = earliestDate && earliestDate <= today ? earliestDate : today;
      const span = daysBetween(from, today);
      return { from, to: today, granularity: span > 62 ? "month" : "day" };
    }
  }
}

export function viewPeriodRangeUtc(
  period: ViewPeriod,
  earliestDate: string | undefined,
  tz: string = APP_TIMEZONE
) {
  const { from, to, granularity } = viewPeriodBounds(period, earliestDate, tz);
  const { start } = dayRangeUtc(from, tz);
  const { end } = dayRangeUtc(to, tz);
  return { start, end, from, to, granularity };
}
