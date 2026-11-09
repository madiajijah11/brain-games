export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dateKey = new Date().toISOString().slice(0, 10);
  const entry = await prisma.dailyEntry.findUnique({ where: { userId_dateKey: { userId: session.user.id, dateKey } } });
  return NextResponse.json({ dateKey, completed: Boolean(entry), entry });
}
