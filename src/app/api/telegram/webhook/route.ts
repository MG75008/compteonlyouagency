import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMessage } from "@/lib/parseMessage";
import { computeIncome, formatMoney } from "@/lib/money";
import { sendTelegramMessage } from "@/lib/telegram";
import { todayKey, dayRangeUtc } from "@/lib/date";

const SETTINGS_ID = "singleton";

async function getSettings() {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

async function getTodaySummaryText() {
  const { start, end } = dayRangeUtc(todayKey());
  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
  });
  let netIncome = 0;
  let expenses = 0;
  for (const t of transactions) {
    if (t.type === "INCOME") netIncome += t.netAmount;
    else expenses += t.netAmount;
  }
  const result = netIncome - expenses;
  return `📊 Aujourd'hui — Net: ${formatMoney(netIncome)} $ | Depenses: ${formatMoney(
    expenses
  )} $ | Resultat: ${formatMoney(result)} $`;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (
    !process.env.TELEGRAM_WEBHOOK_SECRET ||
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await request.json();
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text: string | undefined = message?.text;

  if (!chatId || !text) {
    return NextResponse.json({ ok: true });
  }

  const settings = await getSettings();

  if (!settings.telegramChatId) {
    await prisma.settings.update({
      where: { id: SETTINGS_ID },
      data: { telegramChatId: String(chatId) },
    });
    await sendTelegramMessage(
      chatId,
      "Bot lie a ton compte !\n\nEnvoie-moi par exemple :\n- onlyfans 1655\n- topup 600\n- depense essence 40"
    );
    return NextResponse.json({ ok: true });
  }

  if (settings.telegramChatId !== String(chatId)) {
    return NextResponse.json({ ok: true });
  }

  const result = parseMessage(text);
  if (!result.ok) {
    await sendTelegramMessage(
      chatId,
      "Je n'ai pas compris.\n\nExemples :\n- onlyfans 1655\n- topup 600\n- depense essence 40"
    );
    return NextResponse.json({ ok: true });
  }

  const data = result.data;

  if (data.kind === "income") {
    const { fee, net } = computeIncome(data.gross, data.applyOfFee);
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        source: data.source,
        grossAmount: data.gross,
        feeAmount: fee,
        netAmount: net,
        note: data.note || null,
      },
    });
    const feeLine = data.applyOfFee
      ? `- Commission OnlyFans (20%): ${formatMoney(fee)} $\n`
      : "";
    const summary = await getTodaySummaryText();
    await sendTelegramMessage(
      chatId,
      `Revenu enregistre : ${data.source}\nBrut : ${formatMoney(
        data.gross
      )} $\n${feeLine}Net : ${formatMoney(net)} $\n\n${summary}`
    );
  } else {
    await prisma.transaction.create({
      data: {
        type: "EXPENSE",
        source: data.source,
        grossAmount: data.amount,
        feeAmount: 0,
        netAmount: data.amount,
        note: data.note || null,
      },
    });
    const summary = await getTodaySummaryText();
    await sendTelegramMessage(
      chatId,
      `Depense enregistree : ${data.source}\nMontant : ${formatMoney(
        data.amount
      )} $\n\n${summary}`
    );
  }

  return NextResponse.json({ ok: true });
}
