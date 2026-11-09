export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAnswers } from "@/lib/games";
import { z } from "zod";

const submitSchema = z.object({
  slug: z.enum(["number-rush", "logic-grid", "memory-match", "word-connect"]),
  answers: z.array(z.object({ questionId: z.string().min(1).max(80), answer: z.string().max(200) })).length(5),
  durationMs: z.number().int().min(0).max(600000),
  isDaily: z.boolean().optional(),
});
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid game submission." }, { status: 400 });
  const body = parsed.data;
  const graded = gradeAnswers(body.slug, body.answers);
  if (!graded) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  const baseXp = graded.correct * 20 + (graded.correct === 5 ? 25 : 0);
  const durationMs = body.durationMs;
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
    const lastDay = user.lastPlayedAt?.toISOString().slice(0, 10);
    const streak = lastDay === today ? user.streak : lastDay === yesterday ? user.streak + 1 : 1;
    let dailyBonus = 0;
    if (body.isDaily) {
      const existing = await tx.dailyEntry.findUnique({ where: { userId_dateKey: { userId: user.id, dateKey: today } } });
      if (!existing) {
        dailyBonus = 50;
        await tx.dailyEntry.create({ data: { userId: user.id, dateKey: today, score: graded.score, xpEarned: baseXp + dailyBonus } });
      }
    }
    const xpEarned = baseXp + dailyBonus;
    await tx.user.update({ where: { id: user.id }, data: { totalXp: { increment: xpEarned }, competitiveXp: { increment: graded.score }, streak, lastPlayedAt: now } });
    await tx.gameSession.create({ data: { userId: user.id, gameSlug: body.slug, score: graded.score, xpEarned, correct: graded.correct, total: graded.total, durationMs } });
    return { xpEarned, dailyBonus, score: graded.score, correct: graded.correct, total: graded.total, streak };
  });
  return NextResponse.json({ ...result, results: graded.results });
}
