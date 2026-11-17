"use client";

import { useState, useCallback, useMemo } from "react";
import { TangoPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateTango } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

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
  const half = N / 2;
  const [grid, setGrid] = useState<TangoCell[][]>(() =>
    puzzle.initial.map((row) => row.map((val) => (val === "S" || val === "M" ? val : null))),
  );
  const [history, setHistory] = useState<TangoCell[][][]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  const isInitialCell = useCallback(
    (r: number, c: number) => puzzle.initial[r]?.[c] !== null,
    [puzzle.initial],
  );

  const { conflictCells, conflictMessage } = useMemo(() => {
    const cells = new Set<string>();
    const msgs: string[] = [];

    for (let r = 0; r < N; r++) {
      let sCount = 0;
      let mCount = 0;
      for (let c = 0; c < N; c++) {
        const v = grid[r][c];
        if (v === "S") sCount++;
        if (v === "M") mCount++;
        if (c >= 2 && v && grid[r][c - 1] === v && grid[r][c - 2] === v) {
          cells.add(`${r},${c}`);
          cells.add(`${r},${c - 1}`);
          cells.add(`${r},${c - 2}`);
          msgs.push("No 3 identical symbols in a row.");
        }
      }
      if (sCount > half || mCount > half) {
        for (let c = 0; c < N; c++) {
          if ((sCount > half && grid[r][c] === "S") || (mCount > half && grid[r][c] === "M")) {
            cells.add(`${r},${c}`);
          }
        }
        msgs.push(`Each row needs exactly ${half} ☀️ and ${half} 🌙.`);
      }
    }

    for (let c = 0; c < N; c++) {
      let sCount = 0;
      let mCount = 0;
      for (let r = 0; r < N; r++) {
        const v = grid[r][c];
        if (v === "S") sCount++;
        if (v === "M") mCount++;
        if (r >= 2 && v && grid[r - 1][c] === v && grid[r - 2][c] === v) {
          cells.add(`${r},${c}`);
          cells.add(`${r - 1},${c}`);
          cells.add(`${r - 2},${c}`);
          msgs.push("No 3 identical symbols in a column.");
        }
      }
      if (sCount > half || mCount > half) {
        for (let r = 0; r < N; r++) {
          if ((sCount > half && grid[r][c] === "S") || (mCount > half && grid[r][c] === "M")) {
            cells.add(`${r},${c}`);
          }
        }
        msgs.push(`Each column needs exactly ${half} ☀️ and ${half} 🌙.`);
      }
    }

    for (const eq of puzzle.equalities ?? []) {
      const a = grid[eq.r1]?.[eq.c1];
      const b = grid[eq.r2]?.[eq.c2];
      if (a && b && a !== b) {
        cells.add(`${eq.r1},${eq.c1}`);
        cells.add(`${eq.r2},${eq.c2}`);
        msgs.push("Cells linked by = must have the same symbol.");
      }
    }

    for (const op of puzzle.opposites ?? []) {
      const a = grid[op.r1]?.[op.c1];
      const b = grid[op.r2]?.[op.c2];
      if (a && b && a === b) {
        cells.add(`${op.r1},${op.c1}`);
        cells.add(`${op.r2},${op.c2}`);
        msgs.push("Cells linked by × must have opposite symbols.");
      }
    }

    return {
      conflictCells: cells,
      conflictMessage: msgs[0] ?? "",
    };
  }, [grid, N, half, puzzle.equalities, puzzle.opposites]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (isSolved || isInitialCell(r, c)) return;
      soundFx.playTap();

      setGrid((prev) => {
        setHistory((h) => [...h.slice(-30), prev.map((row) => [...row])]);
        const next = prev.map((row) => [...row]);
        const current = next[r][c];

        if (current === null) next[r][c] = "S";
        else if (current === "S") next[r][c] = "M";
        else next[r][c] = null;

        const isComplete = next.every((row) => row.every((val) => val !== null));
        if (isComplete && validateTango(puzzle, next as string[][])) {
          setIsSolved(true);
        }

        return next;
      });
    },
    [isSolved, isInitialCell, puzzle],
  );

  const handleHint = useCallback(() => {
    if (isSolved) return;
    setGrid((prev) => {
      setHistory((h) => [...h.slice(-30), prev.map((row) => [...row])]);
      const next = prev.map((row) => [...row]);

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const target = puzzle.solution[r]?.[c] as TangoCell;
          if (next[r][c] !== null && next[r][c] !== target) {
            next[r][c] = target;
            setHintsUsed((n) => n + 1);
            soundFx.playStep(3);
            if (
              next.every((row) => row.every((v) => v !== null)) &&
              validateTango(puzzle, next as string[][])
            ) {
              setIsSolved(true);
            }
            return next;
          }
        }
      }
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (next[r][c] === null) {
            next[r][c] = puzzle.solution[r]?.[c] as TangoCell;
            setHintsUsed((n) => n + 1);
            soundFx.playStep(4);
            if (
              next.every((row) => row.every((v) => v !== null)) &&
              validateTango(puzzle, next as string[][])
            ) {
              setIsSolved(true);
            }
            return next;
          }
        }
      }
      return prev;
    });
  }, [isSolved, N, puzzle]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setGrid(last);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setHistory((h) => [...h.slice(-30), grid.map((row) => [...row])]);
    setGrid(
      puzzle.initial.map((row) => row.map((val) => (val === "S" || val === "M" ? val : null))),
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
    [issueNumber, initialMode, grid],
  );

  // Map horizontal/vertical constraint badges directly onto the left/top cell's border
  const cellEdgeBadges = useMemo(() => {
    const rightMap = new Map<string, { symbol: "=" | "×"; violated: boolean }>();
    const bottomMap = new Map<string, { symbol: "=" | "×"; violated: boolean }>();

    const register = (
      edge: { r1: number; c1: number; r2: number; c2: number },
      symbol: "=" | "×",
    ) => {
      const a = grid[edge.r1]?.[edge.c1];
      const b = grid[edge.r2]?.[edge.c2];
      const violated = Boolean(a && b && (symbol === "=" ? a !== b : a === b));

      if (edge.r1 === edge.r2) {
        const minC = Math.min(edge.c1, edge.c2);
        rightMap.set(`${edge.r1},${minC}`, { symbol, violated });
      } else if (edge.c1 === edge.c2) {
        const minR = Math.min(edge.r1, edge.r2);
        bottomMap.set(`${minR},${edge.c1}`, { symbol, violated });
      }
    };

    for (const eq of puzzle.equalities ?? []) register(eq, "=");
    for (const op of puzzle.opposites ?? []) register(op, "×");
    return { rightMap, bottomMap };
  }, [grid, puzzle.equalities, puzzle.opposites]);

  return (
    <PuzzleShell
      slug="tango"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onUndo={handleUndo}
      canUndo={history.length > 0}
      onReset={handleReset}
      onHint={handleHint}
      hintsUsed={hintsUsed}
      solveSummary={`${N}×${N} grid harmonized`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-slate-500">
            <span>Tap: ☀️ → 🌙 → Clear</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
              = Same · × Opposite
            </span>
          </div>

          <div
            className="relative select-none rounded-2xl border-2 border-slate-300 bg-slate-200 p-1.5 shadow-inner"
            style={{
              width: "min(100%, 360px)",
              aspectRatio: "1/1",
            }}
          >
            <div
              className="grid h-full w-full gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${N}, minmax(0, 1fr))`,
              }}
            >
              {grid.map((row, r) =>
                row.map((val, c) => {
                  const fixed = isInitialCell(r, c);
                  const hasConflict = conflictCells.has(`${r},${c}`);
                  const rightBadge = cellEdgeBadges.rightMap.get(`${r},${c}`);
                  const bottomBadge = cellEdgeBadges.bottomMap.get(`${r},${c}`);

                  return (
                    <div key={`${r}-${c}`} className="relative h-full w-full">
                      <button
                        type="button"
                        disabled={fixed || isSolved}
                        onClick={() => handleCellClick(r, c)}
                        className={`relative flex h-full w-full items-center justify-center rounded-xl font-black leading-none transition-all active:scale-95 ${
                          N >= 6 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                        } ${
                          hasConflict
                            ? "bg-red-100 ring-2 ring-red-500"
                            : fixed
                              ? "cursor-default border border-slate-300 bg-slate-300/80 text-slate-900"
                              : val === "S"
                                ? "border border-amber-300 bg-amber-50 shadow-sm"
                                : val === "M"
                                  ? "border border-indigo-300 bg-indigo-50 shadow-sm"
                                  : "border border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                        aria-label={`Row ${r + 1} Col ${c + 1}: ${val ?? "empty"}${fixed ? " (fixed)" : ""}`}
                      >
                        <span className="leading-none">
                          {val === "S" ? "☀️" : val === "M" ? "🌙" : ""}
                        </span>
                        {fixed && (
                          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                        )}
                      </button>

                      {rightBadge && (
                        <span
                          className={`pointer-events-none absolute -right-[3px] top-1/2 z-20 grid h-5 w-5 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border text-[11px] font-black shadow-sm ${
                            rightBadge.violated
                              ? "border-red-500 bg-red-600 text-white"
                              : "border-slate-300 bg-white text-slate-800"
                          }`}
                        >
                          {rightBadge.symbol}
                        </span>
                      )}

                      {bottomBadge && (
                        <span
                          className={`pointer-events-none absolute -bottom-[3px] left-1/2 z-20 grid h-5 w-5 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full border text-[11px] font-black shadow-sm ${
                            bottomBadge.violated
                              ? "border-red-500 bg-red-600 text-white"
                              : "border-slate-300 bg-white text-slate-800"
                          }`}
                        >
                          {bottomBadge.symbol}
                        </span>
                      )}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          {conflictMessage ? (
            <p className="mt-3 text-xs font-bold text-red-600">{conflictMessage}</p>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              Each row & column needs {half} ☀️ and {half} 🌙. Max 2 identical adjacent.
            </p>
          )}
        </div>
      )}
    </PuzzleShell>
  );
}
