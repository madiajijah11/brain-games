"use client";

import { useState, useCallback } from "react";
import { PinpointPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validatePinpoint } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

export function PinpointBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: PinpointPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const [revealedClues, setRevealedClues] = useState<number>(1);
  const [guess, setGuess] = useState<string>("");
  const [attempts, setAttempts] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("");

  const handleGuessSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!guess.trim() || isSolved) return;

      const currentGuess = guess.trim();
      const isCorrect = validatePinpoint(puzzle, currentGuess);

      if (isCorrect) {
        setIsSolved(true);
        setFeedback("Correct! You pinpointed the category.");
      } else {
        setAttempts((prev) => [...prev, currentGuess]);
        setFeedback(`"${currentGuess}" is not the secret category.`);
        // Reveal next clue on wrong guess if available
        if (revealedClues < puzzle.clues.length) {
          setRevealedClues((prev) => prev + 1);
        }
      }
      setGuess("");
    },
    [guess, isSolved, puzzle, revealedClues]
  );

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "pinpoint",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: puzzle.acceptedAnswers[0] || "correct",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, puzzle.acceptedAnswers]
  );

  return (
    <PuzzleShell
      slug="pinpoint"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Read the clues and guess what binds them together in common.
          </div>

          {/* Clues Stack */}
          <div className="w-full max-w-md space-y-2.5">
            {puzzle.clues.map((clue, idx) => {
              const isRevealed = idx < revealedClues;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-2xl border p-4 transition-all ${
                    isRevealed
                      ? "border-slate-200 bg-white text-slate-800 shadow-sm"
                      : "border-dashed border-slate-200 bg-slate-50/60 text-slate-300"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                      isRevealed
                        ? "bg-brand text-white"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-sm sm:text-base">
                    {isRevealed ? clue : "••••••••••••••••••••••••"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reveal Next Clue Manually */}
          {!isSolved && revealedClues < puzzle.clues.length && (
            <button
              onClick={() => setRevealedClues((c) => c + 1)}
              className="mt-3 text-xs font-bold text-brand hover:underline"
            >
              Need another clue? Reveal clue #{revealedClues + 1}
            </button>
          )}

          {/* Feedback */}
          {feedback && (
            <p
              className={`mt-4 text-sm font-bold ${
                isSolved ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {feedback}
            </p>
          )}

          {/* Guess Input Form */}
          {!isSolved && (
            <form onSubmit={handleGuessSubmit} className="mt-6 flex w-full max-w-md gap-2">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your category guess…"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={!guess.trim()}
                className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-soft disabled:opacity-40"
              >
                Guess
              </button>
            </form>
          )}

          {/* Past Attempts */}
          {attempts.length > 0 && !isSolved && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-xs">
              <span className="font-bold text-slate-400">Previous guesses:</span>
              {attempts.map((att, i) => (
                <span
                  key={i}
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 line-through"
                >
                  {att}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </PuzzleShell>
  );
}
