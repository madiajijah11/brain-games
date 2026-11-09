export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getQuestions } from "@/lib/games";
import { z } from "zod";
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ slug: z.enum(["number-rush", "logic-grid", "memory-match", "word-connect"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid game." }, { status: 400 });
  const questions = getQuestions(parsed.data.slug);
  if (!questions) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  return NextResponse.json({ questions, startedAt: Date.now() });
}
