import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/transactions/[id]">
) {
  const { id } = await ctx.params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
