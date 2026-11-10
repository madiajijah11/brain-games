"use client";

import { useState, useCallback } from "react";
import { CrossclimbPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateCrossclimb } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

export function CrossclimbBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: CrossclimbPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  // Scramble words for the player to arrange
  const [words, setWords] = useState<string[]>(() =>
    [...puzzle.rungs.map((r) => r.word)].sort(() => Math.random() - 0.5)
  );
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  const swapRungs = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (isSolved || fromIdx === toIdx) return;
      setWords((prev) => {
        const next = [...prev];
        const temp = next[fromIdx];
        next[fromIdx] = next[toIdx];
        next[toIdx] = temp;

        if (validateCrossclimb(puzzle, next)) {
          setIsSolved(true);
        }
        return next;
      });
    },
    [isSolved, puzzle]
  );

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "crossclimb",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: words,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, words]
  );

  return (
    <PuzzleShell
      slug="crossclimb"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Arrange the words so each rung changes by exactly 1 letter from the next.
          </div>

          {/* Rung Ladder */}
          <div className="w-full max-w-sm space-y-2">
            {words.map((word, idx) => {
              const matchedRung = puzzle.rungs.find((r) => r.word.toUpperCase() === word.toUpperCase());

              return (
                <div
                  key={word}
                  draggable={!isSolved}
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedIdx !== null) {
                      swapRungs(draggedIdx, idx);
                      setDraggedIdx(null);
                    }
                  }}
                  className={`flex cursor-grab items-center justify-between rounded-2xl border p-3.5 shadow-sm transition-all active:cursor-grabbing ${
                    isSolved
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-slate-200 bg-white hover:border-brand"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <div className="flex gap-1 font-mono font-black text-xl tracking-widest text-slate-800">
                      {word.split("").map((char, cIdx) => (
                        <span
                          key={cIdx}
                          className="grid h-9 w-8 place-items-center rounded-lg bg-slate-100"
                        >
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>

                  {matchedRung && (
                    <span className="max-w-[120px] truncate text-right text-[11px] font-medium text-slate-400">
                      {matchedRung.clue}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            💡 Drag and drop rungs to reorder the ladder.
          </p>
        </div>
      )}
    </PuzzleShell>
  );
}
