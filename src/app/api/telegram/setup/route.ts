import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (
    !process.env.TELEGRAM_WEBHOOK_SECRET ||
    key !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN manquant" },
      { status: 500 }
    );
  }

  const webhookUrl = `${request.nextUrl.origin}/api/telegram/webhook`;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    }),
  });
  const telegram = await res.json();

  return NextResponse.json({ webhookUrl, telegram });
}
