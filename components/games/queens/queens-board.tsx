"use client";

import { useState, useCallback, useMemo } from "react";
import { QueensPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateQueens } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

type CellState = "empty" | "x" | "crown";

const REGION_COLORS = [
  "bg-violet-100 border-violet-200 text-violet-800",
  "bg-blue-100 border-blue-200 text-blue-800",
  "bg-emerald-100 border-emerald-200 text-emerald-800",
  "bg-amber-100 border-amber-200 text-amber-800",
  "bg-rose-100 border-rose-200 text-rose-800",
  "bg-cyan-100 border-cyan-200 text-cyan-800",
  "bg-orange-100 border-orange-200 text-orange-800",
  "bg-lime-100 border-lime-200 text-lime-800",
];

export function QueensBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: QueensPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const N = puzzle.size;
  const [board, setBoard] = useState<CellState[][]>(() =>
    Array.from({ length: N }, () => Array(N).fill("empty"))
  );
  const [history, setHistory] = useState<CellState[][][]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  // Extract placed crowns
  const userCrowns = useMemo(() => {
    const crowns: [number, number][] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === "crown") crowns.push([r, c]);
      }
    }
    return crowns;
  }, [board, N]);

  // Conflict detection for visual feedback
  const conflicts = useMemo(() => {
    const conflictSet = new Set<string>();
    for (let i = 0; i < userCrowns.length; i++) {
      const [r1, c1] = userCrowns[i];
      for (let j = i + 1; j < userCrowns.length; j++) {
        const [r2, c2] = userCrowns[j];
        const sameRow = r1 === r2;
        const sameCol = c1 === c2;
        const sameReg = puzzle.regions[r1]?.[c1] === puzzle.regions[r2]?.[c2];
        const touches = Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;

        if (sameRow || sameCol || sameReg || touches) {
          conflictSet.add(`${r1},${c1}`);
          conflictSet.add(`${r2},${c2}`);
        }
      }
    }
    return conflictSet;
  }, [userCrowns, puzzle.regions]);

  const handleCellClick = useCallback(
    (r: number, c: number, e?: React.MouseEvent) => {
      if (isSolved) return;
      if (e) e.preventDefault();

      setBoard((prev) => {
        setHistory((h) => [...h.slice(-20), prev.map((row) => [...row])]);
        const next = prev.map((row) => [...row]);
        const current = next[r][c];

        // Normal click cycle: empty -> x -> crown -> empty
        if (e && e.type === "contextmenu") {
          next[r][c] = current === "x" ? "empty" : "x";
        } else {
          if (current === "empty") next[r][c] = "x";
          else if (current === "x") next[r][c] = "crown";
          else next[r][c] = "empty";
        }

        // Check victory
        const nextCrowns: [number, number][] = [];
        for (let row = 0; row < N; row++) {
          for (let col = 0; col < N; col++) {
            if (next[row][col] === "crown") nextCrowns.push([row, col]);
          }
        }
        if (nextCrowns.length === N && validateQueens(puzzle, nextCrowns)) {
          setIsSolved(true);
        }

        return next;
      });
    },
    [N, puzzle, isSolved]
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setBoard(last);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setHistory((h) => [...h.slice(-20), board.map((row) => [...row])]);
    setBoard(Array.from({ length: N }, () => Array(N).fill("empty")));
    setIsSolved(false);
  }, [N, board]);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "queens",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: userCrowns,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, userCrowns]
  );

  return (
    <PuzzleShell
      slug="queens"
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
          {/* Legend / Crown Tracker */}
          <div className="mb-4 flex items-center justify-between gap-4 text-xs font-bold text-slate-500">
            <span>
              Crowns placed:{" "}
              <strong className={userCrowns.length === N ? "text-emerald-600" : "text-brand"}>
                {userCrowns.length} / {N}
              </strong>
            </span>
            <span className="hidden sm:inline">Tap cell: Cross ✕ → Crown ♕ → Empty</span>
          </div>

          {/* Grid Container */}
          <div
            className="grid gap-1 rounded-2xl border-2 border-slate-700 bg-slate-700 p-1 shadow-lg select-none"
            style={{
              gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
              width: "min(100%, 380px)",
              aspectRatio: "1/1",
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const regionId = puzzle.regions[r]?.[c] ?? 0;
                const regionClass = REGION_COLORS[regionId % REGION_COLORS.length];
                const isConflict = conflicts.has(`${r},${c}`);

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={(e) => handleCellClick(r, c, e)}
                    onContextMenu={(e) => handleCellClick(r, c, e)}
                    className={`relative flex items-center justify-center font-black transition-all active:scale-95 ${regionClass} ${
                      isConflict
                        ? "ring-2 ring-red-500 ring-offset-1 bg-red-100 text-red-600 animate-pulse"
                        : "hover:brightness-95"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                    aria-label={`Cell row ${r + 1}, column ${c + 1}, region ${regionId + 1}: ${cell}`}
                  >
                    {cell === "crown" && (
                      <span className="text-2xl sm:text-3xl drop-shadow-sm leading-none">
                        ♕
                      </span>
                    )}
                    {cell === "x" && (
                      <span className="text-sm sm:text-base font-bold text-slate-400/80 leading-none">
                        ✕
                      </span>
                    )}
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
