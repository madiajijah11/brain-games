import { describe, expect, it } from "vitest";
import { getQuestions, gradeAnswers, levelForXp } from "@/lib/games";
import { z } from "zod";

const submitSchema = z.object({
  slug: z.enum(["number-rush", "logic-grid", "memory-match", "word-connect"]),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(80),
        answer: z.string().max(200),
      })
    )
    .length(5),
  durationMs: z.number().int().min(3000).max(600000),
  isDaily: z.boolean().optional(),
});

describe("Game submit validation schema", () => {
  const validAnswers = [
    { questionId: "number-rush-0", answer: "32" },
    { questionId: "number-rush-1", answer: "38" },
    { questionId: "number-rush-2", answer: "13" },
    { questionId: "number-rush-3", answer: "6.25" },
    { questionId: "number-rush-4", answer: "80" },
  ];

  it("accepts valid submission within realistic human duration bounds", () => {
    const res = submitSchema.safeParse({
      slug: "number-rush",
      answers: validAnswers,
      durationMs: 15420,
      isDaily: false,
    });
    expect(res.success).toBe(true);
  });

  it("rejects automated bot submissions faster than 3 seconds", () => {
    const res = submitSchema.safeParse({
      slug: "number-rush",
      answers: validAnswers,
      durationMs: 2500,
    });
    expect(res.success).toBe(false);
  });

  it("rejects negative durations caused by clock drift", () => {
    const res = submitSchema.safeParse({
      slug: "number-rush",
      answers: validAnswers,
      durationMs: -1200,
    });
    expect(res.success).toBe(false);
  });

  it("rejects submissions exceeding the 10-minute cap", () => {
    const res = submitSchema.safeParse({
      slug: "number-rush",
      answers: validAnswers,
      durationMs: 600001,
    });
    expect(res.success).toBe(false);
  });

  it("rejects submissions with fewer or more than 5 answers", () => {
    const res = submitSchema.safeParse({
      slug: "number-rush",
      answers: validAnswers.slice(0, 4),
      durationMs: 10000,
    });
    expect(res.success).toBe(false);
  });
});

describe("Game questions and grading logic", () => {
  it("fetches 5 questions for every valid game slug", () => {
    const slugs = ["number-rush", "logic-grid", "memory-match", "word-connect"] as const;
    for (const slug of slugs) {
      const q = getQuestions(slug);
      expect(q).not.toBeNull();
      expect(q?.length).toBe(5);
    }
  });

  it("grades full correct answers to 100% score", () => {
    const answers = [
      { questionId: "number-rush-0", answer: "32" },
      { questionId: "number-rush-1", answer: "38" },
      { questionId: "number-rush-2", answer: "13" },
      { questionId: "number-rush-3", answer: "6.25" },
      { questionId: "number-rush-4", answer: "80" },
    ];
    const graded = gradeAnswers("number-rush", answers);
    expect(graded).not.toBeNull();
    expect(graded?.score).toBe(100);
    expect(graded?.correct).toBe(5);
  });

  it("calculates progression levels correctly", () => {
    expect(levelForXp(0).name).toBe("Beginner");
    expect(levelForXp(500).name).toBe("Thinker");
    expect(levelForXp(1200).name).toBe("Strategist");
    expect(levelForXp(2500).name).toBe("Mastermind");
    expect(levelForXp(5000).name).toBe("Grandmaster");
  });
});
