"use client";

import { useState, useCallback } from "react";
import { MiniSudokuPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateMiniSudoku } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

export function MiniSudokuBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: MiniSudokuPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const N = puzzle.size;
  const [grid, setGrid] = useState<number[][]>(() =>
    puzzle.initial.map((row) => row.map((v) => v ?? 0))
  );
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<number[][][]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  const isInitialCell = useCallback(
    (r: number, c: number) => puzzle.initial[r]?.[c] !== null,
    [puzzle.initial]
  );

  const handleDigitInput = useCallback(
    (digit: number) => {
      if (isSolved || !selectedCell) return;
      const [r, c] = selectedCell;
      if (isInitialCell(r, c)) return;

      setGrid((prev) => {
        setHistory((h) => [...h.slice(-20), prev.map((row) => [...row])]);
        const next = prev.map((row) => [...row]);
        next[r][c] = next[r][c] === digit ? 0 : digit;

        // Check victory
        const isComplete = next.every((row) => row.every((val) => val > 0));
        if (isComplete && validateMiniSudoku(puzzle, next)) {
          setIsSolved(true);
        }

        return next;
      });
    },
    [isSolved, selectedCell, isInitialCell, puzzle]
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
    setGrid(puzzle.initial.map((row) => row.map((v) => v ?? 0)));
    setIsSolved(false);
  }, [grid, puzzle.initial]);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "mini-sudoku",
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
      slug="mini-sudoku"
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
            Select a square, then tap a number below (1 to {N}).
          </div>

          {/* Sudoku Grid */}
          <div
            className="grid gap-1 rounded-2xl border-2 border-slate-700 bg-slate-700 p-1 shadow-lg select-none"
            style={{
              gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
              width: "min(100%, 320px)",
              aspectRatio: "1/1",
            }}
          >
            {grid.map((row, r) =>
              row.map((val, c) => {
                const fixed = isInitialCell(r, c);
                const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => setSelectedCell([r, c])}
                    className={`flex items-center justify-center rounded-xl text-xl font-black transition-all ${
                      isSelected
                        ? "ring-2 ring-brand bg-violet-100 text-brand"
                        : fixed
                        ? "bg-slate-100 text-slate-900 font-extrabold"
                        : val > 0
                        ? "bg-white text-brand"
                        : "bg-white hover:bg-slate-50 text-transparent"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {val > 0 ? val : ""}
                  </button>
                );
              })
            )}
          </div>

          {/* Virtual Digit Keypad */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: N }, (_, i) => i + 1).map((digit) => (
              <button
                key={digit}
                disabled={isSolved || !selectedCell}
                onClick={() => handleDigitInput(digit)}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-lg font-black text-slate-800 shadow-sm transition active:scale-95 hover:border-brand hover:text-brand disabled:opacity-40"
              >
                {digit}
              </button>
            ))}
            <button
              disabled={isSolved || !selectedCell}
              onClick={() => handleDigitInput(0)}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 shadow-sm transition active:scale-95 disabled:opacity-40"
              title="Clear cell"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
