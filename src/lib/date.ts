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

export type Period = "day" | "week" | "month";

export function monthBounds(dateStr: string): { first: string; last: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { first, last };
}

export function periodBounds(dateStr: string, period: Period): { from: string; to: string } {
  if (period === "day") return { from: dateStr, to: dateStr };
  if (period === "week") return { from: shiftDayKey(dateStr, -6), to: dateStr };
  const { first, last } = monthBounds(dateStr);
  return { from: first, to: last };
}

export function periodRangeUtc(
  dateStr: string,
  period: Period,
  tz: string = APP_TIMEZONE
) {
  const { from, to } = periodBounds(dateStr, period);
  const { start } = dayRangeUtc(from, tz);
  const { end } = dayRangeUtc(to, tz);
  return { start, end };
}

export function shiftPeriod(dateStr: string, period: Period, delta: number): string {
  if (period === "day") return shiftDayKey(dateStr, delta);
  if (period === "week") return shiftDayKey(dateStr, delta * 7);
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  const daysInNewMonth = new Date(Date.UTC(newY, newM, 0)).getUTCDate();
  const newD = Math.min(d, daysInNewMonth);
  return `${newY}-${String(newM).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
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
