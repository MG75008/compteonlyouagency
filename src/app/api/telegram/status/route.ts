import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });
  return NextResponse.json({ connected: Boolean(settings?.telegramChatId) });
}
