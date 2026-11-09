export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const users = await prisma.user.findMany({ orderBy: [{ competitiveXp: "desc" }, { totalXp: "desc" }], take: 50, select: { id: true, name: true, competitiveXp: true, totalXp: true } });
  return NextResponse.json(users.map((u, index) => ({ rank: index + 1, ...u })));
}
