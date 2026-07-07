import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import {
  dayKey,
  dayRangeUtc,
  daysBetween,
  daysInRange,
  hourKeysOfDay,
  hourOfDate,
  monthKeyOf,
  monthsInRange,
  shiftDayKey,
  todayKey,
  viewPeriodRangeUtc,
  type ViewPeriod,
} from "@/lib/date";

const REINVEST_WINDOW_DAYS = 30;
const REINVEST_RUNWAY_DAYS = 7;

async function computeSalaryAvailable() {
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { netAmount: true },
      where: { type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { netAmount: true },
      where: { type: "EXPENSE" },
    }),
  ]);
  const balance = round2(
    (incomeAgg._sum.netAmount ?? 0) - (expenseAgg._sum.netAmount ?? 0)
  );

  const earliest = await prisma.transaction.findFirst({ orderBy: { date: "asc" } });
  const today = todayKey();
  const earliestKey = earliest ? dayKey(earliest.date) : today;
  const daysSinceStart = Math.max(1, daysBetween(earliestKey, today) + 1);
  const windowDays = Math.min(REINVEST_WINDOW_DAYS, daysSinceStart);
  const windowFrom = shiftDayKey(today, -(windowDays - 1));

  const { start: windowStart } = dayRangeUtc(windowFrom);
  const { end: windowEnd } = dayRangeUtc(today);
  const windowExpenseAgg = await prisma.transaction.aggregate({
    _sum: { netAmount: true },
    where: { type: "EXPENSE", date: { gte: windowStart, lt: windowEnd } },
  });
  const avgDailyExpense = round2(
    (windowExpenseAgg._sum.netAmount ?? 0) / windowDays
  );
  const reinvestReserve = round2(avgDailyExpense * REINVEST_RUNWAY_DAYS);
  const salaryAvailable = round2(Math.max(0, balance - reinvestReserve));

  return { balance, avgDailyExpense, reinvestReserve, salaryAvailable };
}

type Tx = { type: string; grossAmount: number; feeAmount: number; netAmount: number };

function summarize(transactions: Tx[]) {
  let grossIncome = 0;
  let ofFees = 0;
  let netIncome = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "INCOME") {
      grossIncome += t.grossAmount;
      ofFees += t.feeAmount;
      netIncome += t.netAmount;
    } else {
      expenses += t.netAmount;
    }
  }
  return {
    grossIncome: round2(grossIncome),
    ofFees: round2(ofFees),
    netIncome: round2(netIncome),
    expenses: round2(expenses),
    result: round2(netIncome - expenses),
    roi: expenses > 0 ? round2(netIncome / expenses) : null,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "alltime") as ViewPeriod;

  let earliestDate: string | undefined;
  if (period === "alltime") {
    const earliest = await prisma.transaction.findFirst({
      orderBy: { date: "asc" },
    });
    earliestDate = earliest ? dayKey(earliest.date) : undefined;
  }

  const { start, end, from, to, granularity } = viewPeriodRangeUtc(
    period,
    earliestDate
  );

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
  });

  const totals = summarize(transactions);

  const buckets = new Map<string, Tx[]>();
  let bucketKeys: string[];
  let labelOf: (key: string) => string;

  if (granularity === "hour") {
    bucketKeys = hourKeysOfDay();
    labelOf = (key) => `${key}h`;
  } else if (granularity === "day") {
    bucketKeys = daysInRange(from, to);
    labelOf = (key) => {
      const [, m, d] = key.split("-").map(Number);
      return new Intl.DateTimeFormat("fr-FR", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
      }).format(new Date(Date.UTC(2000, m - 1, d)));
    };
  } else {
    bucketKeys = monthsInRange(from, to);
    labelOf = (key) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Intl.DateTimeFormat("fr-FR", {
        timeZone: "UTC",
        month: "short",
        year: "2-digit",
      }).format(new Date(Date.UTC(y, m - 1, 1)));
      return label;
    };
  }

  for (const key of bucketKeys) buckets.set(key, []);

  for (const t of transactions) {
    const key =
      granularity === "hour"
        ? hourOfDate(t.date)
        : granularity === "day"
        ? dayKey(t.date)
        : monthKeyOf(t.date);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }

  const points = bucketKeys.map((key) => ({
    label: labelOf(key),
    ...summarize(buckets.get(key) ?? []),
  }));

  const salary = await computeSalaryAvailable();

  return NextResponse.json({
    period,
    from,
    to,
    granularity,
    ...totals,
    ...salary,
    points,
  });
}
