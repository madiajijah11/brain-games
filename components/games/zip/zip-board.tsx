"use client";

import { useState, useCallback } from "react";
import { ZipPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateZip } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

export function ZipBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: ZipPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const [path, setPath] = useState<[number, number][]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (isSolved) return;

      setPath((prev) => {
        // If empty path, must start at node #1
        if (prev.length === 0) {
          const startNode = puzzle.nodes.find((n) => n.num === 1);
          if (startNode && startNode.r === r && startNode.c === c) {
            return [[r, c]];
          }
          return prev;
        }

        const [lastR, lastC] = prev[prev.length - 1];
        // If tapping last cell, backtrack 1 step
        if (lastR === r && lastC === c) {
          return prev.slice(0, -1);
        }

        // Must be adjacent (distance = 1)
        const dist = Math.abs(lastR - r) + Math.abs(lastC - c);
        if (dist === 1) {
          const next = [...prev, [r, c] as [number, number]];
          if (validateZip(puzzle, next)) {
            setIsSolved(true);
          }
          return next;
        }

        return prev;
      });
    },
    [isSolved, puzzle]
  );

  const handleReset = useCallback(() => {
    setPath([]);
    setIsSolved(false);
  }, []);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "zip",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: path,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, path]
  );

  return (
    <PuzzleShell
      slug="zip"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onReset={handleReset}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Start at checkpoint 1 and tap adjacent cells to connect through to the final checkpoint.
          </div>

          {/* Grid Canvas */}
          <div
            className="grid gap-2 rounded-2xl border-2 border-slate-700 bg-slate-800 p-3 shadow-lg select-none"
            style={{
              gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
              width: "min(100%, 320px)",
              aspectRatio: `${puzzle.width}/${puzzle.height}`,
            }}
          >
            {Array.from({ length: puzzle.height }).map((_, r) =>
              Array.from({ length: puzzle.width }).map((_, c) => {
                const node = puzzle.nodes.find((n) => n.r === r && n.c === c);
                const pathIdx = path.findIndex(([pr, pc]) => pr === r && pc === c);
                const isInPath = pathIdx !== -1;

                return (
                  <button
                    key={`${r}-${c}`}
                    disabled={isSolved}
                    onClick={() => handleCellClick(r, c)}
                    className={`relative flex items-center justify-center rounded-xl text-base font-black transition-all ${
                      node
                        ? "bg-amber-400 text-slate-900 shadow-md ring-2 ring-amber-300"
                        : isInPath
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "bg-slate-700 hover:bg-slate-600 text-transparent"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {node ? node.num : isInPath ? pathIdx + 1 : ""}
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
