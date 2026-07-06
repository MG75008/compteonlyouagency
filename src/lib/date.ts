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
