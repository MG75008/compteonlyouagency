import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import {
  daysInRange,
  dayKey,
  periodBounds,
  periodRangeUtc,
  todayKey,
  type Period,
} from "@/lib/date";

function summarize(
  transactions: { type: string; grossAmount: number; feeAmount: number; netAmount: number }[]
) {
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
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayKey();
  const period = (searchParams.get("period") || "day") as Period;

  const { from, to } = periodBounds(date, period);
  const { start, end } = periodRangeUtc(date, period);
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
  });

  const base = { date, period, from, to, ...summarize(transactions) };

  if (period === "day") {
    return NextResponse.json(base);
  }

  const byDay = new Map<string, typeof transactions>();
  for (const day of daysInRange(from, to)) {
    byDay.set(day, []);
  }
  for (const t of transactions) {
    const key = dayKey(t.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(t);
  }

  const history = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, txs]) => ({ date: day, ...summarize(txs) }));

  return NextResponse.json({ ...base, history });
}
