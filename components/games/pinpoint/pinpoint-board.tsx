"use client";

import { useState, useCallback } from "react";
import { PinpointPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validatePinpoint } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

const MAX_GUESSES = 5;

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
  const [solvedGuess, setSolvedGuess] = useState<string>("");
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");

  const handleGuessSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!guess.trim() || isSolved || isFailed) return;

      const currentGuess = guess.trim();
      const isCorrect = validatePinpoint(puzzle, currentGuess);

      if (isCorrect) {
        soundFx.playStep(5);
        setSolvedGuess(currentGuess);
        setIsSolved(true);
        setFeedback(`Correct! Pinpointed on clue #${revealedClues}.`);
      } else {
        soundFx.playError();
        const nextAttempts = [...attempts, currentGuess];
        setAttempts(nextAttempts);

        if (nextAttempts.length >= MAX_GUESSES) {
          setIsFailed(true);
          setRevealedClues(puzzle.clues.length);
          setFeedback(`Out of guesses! The category was "${puzzle.category}".`);
        } else {
          setFeedback(`"${currentGuess}" is not the secret category.`);
          if (revealedClues < puzzle.clues.length) {
            setRevealedClues((prev) => prev + 1);
          }
        }
      }
      setGuess("");
    },
    [guess, isSolved, isFailed, puzzle, revealedClues, attempts],
  );

  const handleRevealHint = useCallback(() => {
    if (isSolved || isFailed || revealedClues >= puzzle.clues.length) return;
    soundFx.playTap();
    setRevealedClues((c) => Math.min(puzzle.clues.length, c + 1));
    setHintsUsed((n) => n + 1);
  }, [isSolved, isFailed, revealedClues, puzzle.clues.length]);

  const handleReset = useCallback(() => {
    setRevealedClues(1);
    setGuess("");
    setAttempts([]);
    setSolvedGuess("");
    setIsSolved(false);
    setIsFailed(false);
    setFeedback("");
  }, []);

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
          solution: solvedGuess || puzzle.acceptedAnswers[0] || puzzle.category,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, solvedGuess, puzzle.acceptedAnswers, puzzle.category],
  );

  return (
    <PuzzleShell
      slug="pinpoint"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onReset={handleReset}
      onHint={revealedClues < puzzle.clues.length && !isFailed ? handleRevealHint : undefined}
      hintsUsed={hintsUsed}
      solveSummary={`Pinpointed in ${revealedClues} clue${revealedClues > 1 ? "s" : ""}`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          {/* Guess Pips Header */}
          <div className="mb-4 flex w-full max-w-md items-center justify-between text-xs font-bold text-slate-500">
            <span>Guess what unites all 5 clues</span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: MAX_GUESSES }).map((_, idx) => {
                const isMiss = idx < attempts.length;
                const isWin = isSolved && idx === attempts.length;
                return (
                  <span
                    key={idx}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      isWin ? "bg-emerald-500" : isMiss ? "bg-rose-400" : "bg-slate-200"
                    }`}
                  />
                );
              })}
            </div>
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
                      isRevealed ? "bg-brand text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-sm font-semibold sm:text-base">
                    {isRevealed ? clue : "••••••••••••••••••••••••"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reveal Next Clue Manually */}
          {!isSolved && !isFailed && revealedClues < puzzle.clues.length && (
            <button
              type="button"
              onClick={handleRevealHint}
              className="mt-3 text-xs font-bold text-brand hover:underline"
            >
              Skip guess & reveal clue #{revealedClues + 1}
            </button>
          )}

          {/* Feedback */}
          {feedback && (
            <p
              className={`mt-4 text-center text-sm font-bold ${
                isSolved ? "text-emerald-600" : isFailed ? "text-rose-600" : "text-amber-600"
              }`}
            >
              {feedback}
            </p>
          )}

          {/* Failed State Recovery */}
          {isFailed && (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-brand hover:text-brand"
            >
              Reset & Try Again
            </button>
          )}

          {/* Guess Input Form */}
          {!isSolved && !isFailed && (
            <form onSubmit={handleGuessSubmit} className="mt-6 flex w-full max-w-md gap-2">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder={`Guess #${attempts.length + 1} of ${MAX_GUESSES}…`}
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
              <span className="font-bold text-slate-400">Misses:</span>
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
