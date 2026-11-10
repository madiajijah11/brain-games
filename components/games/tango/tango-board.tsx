"use client";

import { useState, useCallback, useMemo } from "react";
import { TangoPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateTango } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

type TangoCell = "S" | "M" | null;

export function TangoBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: TangoPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const N = puzzle.size;
  const [grid, setGrid] = useState<TangoCell[][]>(() =>
    puzzle.initial.map((row) =>
      row.map((val) => (val === "S" || val === "M" ? val : null))
    )
  );
  const [history, setHistory] = useState<TangoCell[][][]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  const isInitialCell = useCallback(
    (r: number, c: number) => puzzle.initial[r]?.[c] !== null,
    [puzzle.initial]
  );

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (isSolved || isInitialCell(r, c)) return;

      setGrid((prev) => {
        setHistory((h) => [...h.slice(-20), prev.map((row) => [...row])]);
        const next = prev.map((row) => [...row]);
        const current = next[r][c];

        // Cycle: null -> "S" (Sun) -> "M" (Moon) -> null
        if (current === null) next[r][c] = "S";
        else if (current === "S") next[r][c] = "M";
        else next[r][c] = null;

        // Check victory
        const isComplete = next.every((row) => row.every((val) => val !== null));
        if (isComplete && validateTango(puzzle, next as string[][])) {
          setIsSolved(true);
        }

        return next;
      });
    },
    [isSolved, isInitialCell, puzzle]
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setGrid(last);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setHistory((h) => [...h.slice(-20), grid.map((row) => [...row])]);
    setGrid(
      puzzle.initial.map((row) =>
        row.map((val) => (val === "S" || val === "M" ? val : null))
      )
    );
    setIsSolved(false);
  }, [grid, puzzle.initial]);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "tango",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: grid,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, grid]
  );

  return (
    <PuzzleShell
      slug="tango"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onUndo={handleUndo}
      canUndo={history.length > 0}
      onReset={handleReset}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Tap cell: Sun ☀️ → Moon 🌙 → Empty. Equal count per line; no 3 in a row.
          </div>

          <div
            className="grid gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-2 shadow-inner select-none"
            style={{
              gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
              width: "min(100%, 340px)",
              aspectRatio: "1/1",
            }}
          >
            {grid.map((row, r) =>
              row.map((val, c) => {
                const fixed = isInitialCell(r, c);

                return (
                  <button
                    key={`${r}-${c}`}
                    disabled={fixed || isSolved}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative flex items-center justify-center rounded-xl text-2xl font-black transition-all active:scale-95 ${
                      fixed
                        ? "bg-slate-200 text-slate-800 cursor-default font-extrabold"
                        : val === "S"
                        ? "bg-amber-100 text-amber-600 shadow-sm border border-amber-200"
                        : val === "M"
                        ? "bg-indigo-100 text-indigo-600 shadow-sm border border-indigo-200"
                        : "bg-white hover:bg-slate-50 border border-slate-200"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {val === "S" && "☀️"}
                    {val === "M" && "🌙"}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
