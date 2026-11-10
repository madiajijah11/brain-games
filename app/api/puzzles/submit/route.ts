export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";
import { evaluatePuzzleSolution } from "@/lib/puzzles/evaluators";
import { GameSlug } from "@/lib/puzzles/types";
import { z } from "zod";
import fs from "fs";
import path from "path";

const submissionSchema = z.object({
  slug: z.enum([
    "queens",
    "tango",
    "mini-sudoku",
    "pinpoint",
    "crossclimb",
    "patches",
    "zip",
    "wend",
  ]),
  issueNumber: z.number().int().positive(),
  durationMs: z.number().int().min(2000).max(1800000), // 2 seconds to 30 mins
  mode: z.enum(["daily", "practice"]),
  solution: z.any(),
});

function loadPuzzleDefinition(slug: GameSlug, issueNumber: number) {
  try {
    const filePath = path.join(process.cwd(), "data", "puzzles", `${slug}.json`);
    if (!fs.existsSync(filePath)) return null;
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const pool = JSON.parse(fileContent);
    if (!Array.isArray(pool) || pool.length === 0) return null;
    const index = (issueNumber - 1) % pool.length;
    return pool[index];
  } catch (err) {
    console.error(`[LoadPuzzleError] Failed to read puzzle bank for ${slug}:`, err);
    return null;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const rawBody = await request.json().catch(() => null);
  const parsed = submissionSchema.safeParse(rawBody);

  if (!parsed.success) {
    console.error(
      "[PuzzleSubmissionRejected] Invalid schema:",
      JSON.stringify(parsed.error.flatten())
    );
    return NextResponse.json(
      { error: "Invalid puzzle submission payload." },
      { status: 400 }
    );
  }

  const { slug, issueNumber, durationMs, mode, solution } = parsed.data;

  // Verify daily edition matches current UTC schedule when mode is daily
  const dailyInfo = getDailyEdition(slug);
  if (mode === "daily" && issueNumber !== dailyInfo.issueNumber) {
    return NextResponse.json(
      { error: "Issue number does not match current UTC edition." },
      { status: 400 }
    );
  }

  // Load authoritative puzzle from server repository
  const puzzle = loadPuzzleDefinition(slug, issueNumber);
  if (!puzzle) {
    return NextResponse.json({ error: "Puzzle not found." }, { status: 404 });
  }

  // Evaluate solution mathematically
  const isCorrect = evaluatePuzzleSolution(slug, puzzle, solution);
  if (!isCorrect) {
    return NextResponse.json(
      { valid: false, message: "Puzzle solution is incomplete or incorrect." },
      { status: 422 }
    );
  }

  // If Guest (Unauthenticated user)
  if (!session?.user?.id) {
    return NextResponse.json({
      valid: true,
      score: 100,
      xpEarned: 0,
      streak: 0,
      mode,
      issueNumber,
      isGuest: true,
      message: "Puzzle solved successfully! Create an account to save your streak and XP.",
    });
  }

  // If Authenticated User: Commit transaction
  const userId = session.user.id;
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const today = dailyInfo.dateKey;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const lastDay = user.lastPlayedAt?.toISOString().slice(0, 10);

    let effectiveMode = mode;
    let xpAwarded = 0;
    let streak = user.streak;

    // Check if player has already completed this game today
    const existingCompletion = await tx.dailyGameCompletion.findUnique({
      where: {
        userId_gameSlug_dateKey: {
          userId,
          gameSlug: slug,
          dateKey: today,
        },
      },
    });

    if (existingCompletion || mode === "practice") {
      // Practice mode or subsequent play on same calendar day: 0 XP
      effectiveMode = "practice";
      xpAwarded = 0;
    } else {
      // First official daily completion for this game: Award 100 XP + update streak
      effectiveMode = "daily";
      xpAwarded = 100;
      streak = lastDay === today ? user.streak : lastDay === yesterday ? user.streak + 1 : 1;

      await tx.dailyGameCompletion.create({
        data: {
          userId,
          gameSlug: slug,
          dateKey: today,
          issueNumber,
          timeTakenMs: durationMs,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          totalXp: { increment: xpAwarded },
          competitiveXp: { increment: 100 },
          streak,
          lastPlayedAt: new Date(),
        },
      });
    }

    // Always log session history
    await tx.gameSession.create({
      data: {
        userId,
        gameSlug: slug,
        score: 100,
        xpEarned: xpAwarded,
        correct: 1,
        total: 1,
        durationMs,
        issueNumber,
        mode: effectiveMode,
      },
    });

    return {
      valid: true,
      score: 100,
      xpEarned: xpAwarded,
      streak,
      mode: effectiveMode,
      issueNumber,
      isGuest: false,
    };
  });

  return NextResponse.json(result);
}
