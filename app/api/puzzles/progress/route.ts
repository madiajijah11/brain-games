export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";

export async function GET() {
  const session = await auth();
  const { dateKey } = getDailyEdition("queens");

  if (!session?.user?.id) {
    return NextResponse.json(
      { todayCompletedCount: 0, dateKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const todayCompletedCount = await prisma.dailyGameCompletion.count({
    where: {
      userId: session.user.id,
      dateKey,
    },
  });

  return NextResponse.json(
    { todayCompletedCount, dateKey },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
