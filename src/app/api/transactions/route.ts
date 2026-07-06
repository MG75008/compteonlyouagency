import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeIncome, round2 } from "@/lib/money";
import { periodRangeUtc, todayKey, type Period } from "@/lib/date";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayKey();
  const period = (searchParams.get("period") || "day") as Period;
  const { start, end } = periodRangeUtc(date, period);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ date, period, transactions });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, source, amount, applyOfFee, note, date } = body ?? {};

  if (type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "type invalide" }, { status: 400 });
  }
  const gross = Number(amount);
  if (!Number.isFinite(gross) || gross <= 0) {
    return NextResponse.json({ error: "montant invalide" }, { status: 400 });
  }
  if (!source || typeof source !== "string") {
    return NextResponse.json({ error: "source requise" }, { status: 400 });
  }

  let feeAmount = 0;
  let netAmount = round2(gross);
  if (type === "INCOME") {
    const computed = computeIncome(gross, Boolean(applyOfFee));
    feeAmount = computed.fee;
    netAmount = computed.net;
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      source,
      grossAmount: gross,
      feeAmount,
      netAmount,
      note: note || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json({ transaction }, { status: 201 });
}
