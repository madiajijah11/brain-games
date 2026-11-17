"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { QueensPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateQueens } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

type CellState = "empty" | "x" | "crown";

const REGION_PALETTES = [
  "bg-violet-100 text-violet-900",
  "bg-sky-100 text-sky-900",
  "bg-emerald-100 text-emerald-900",
  "bg-amber-100 text-amber-900",
  "bg-rose-100 text-rose-900",
  "bg-cyan-100 text-cyan-900",
  "bg-orange-100 text-orange-900",
  "bg-lime-100 text-lime-900",
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
    Array.from({ length: N }, () => Array<CellState>(N).fill("empty")),
  );
  const [history, setHistory] = useState<CellState[][][]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [autoX, setAutoX] = useState<boolean>(true);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragActionRef = useRef<{
    active: boolean;
    mode: "mark-x" | "clear-x" | null;
    startCell: [number, number] | null;
    draggedCells: number;
  }>({ active: false, mode: null, startCell: null, draggedCells: 0 });

  const userCrowns = useMemo(() => {
    const crowns: [number, number][] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === "crown") crowns.push([r, c]);
      }
    }
    return crowns;
  }, [board, N]);

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

  const applyAutoXAroundCrown = useCallback(
    (grid: CellState[][], crownR: number, crownC: number) => {
      const crownReg = puzzle.regions[crownR]?.[crownC];
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (r === crownR && c === crownC) continue;
          if (grid[r][c] !== "empty") continue;
          const sameRow = r === crownR;
          const sameCol = c === crownC;
          const sameReg = puzzle.regions[r]?.[c] === crownReg;
          const adjacent = Math.abs(r - crownR) <= 1 && Math.abs(c - crownC) <= 1;
          if (sameRow || sameCol || sameReg || adjacent) {
            grid[r][c] = "x";
          }
        }
      }
    },
    [N, puzzle.regions],
  );

  const checkSolved = useCallback(
    (next: CellState[][]) => {
      const nextCrowns: [number, number][] = [];
      for (let row = 0; row < N; row++) {
        for (let col = 0; col < N; col++) {
          if (next[row][col] === "crown") nextCrowns.push([row, col]);
        }
      }
      if (nextCrowns.length === N && validateQueens(puzzle, nextCrowns)) {
        setIsSolved(true);
      }
    },
    [N, puzzle],
  );

  const cycleCell = useCallback(
    (r: number, c: number, forceX = false) => {
      if (isSolved) return;
      setBoard((prev) => {
        setHistory((h) => [...h.slice(-30), prev.map((row) => [...row])]);
        const next = prev.map((row) => [...row]);
        const current = next[r][c];

        if (forceX) {
          next[r][c] = current === "x" ? "empty" : "x";
          soundFx.playTap();
        } else {
          if (current === "empty") {
            next[r][c] = "x";
            soundFx.playTap();
          } else if (current === "x") {
            next[r][c] = "crown";
            if (autoX) {
              applyAutoXAroundCrown(next, r, c);
            }
            soundFx.playStep(3);
          } else {
            next[r][c] = "empty";
            soundFx.playTap();
          }
        }

        checkSolved(next);
        return next;
      });
    },
    [isSolved, autoX, applyAutoXAroundCrown, checkSolved],
  );

  const resolveCellFromPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) return null;
      const c = Math.min(N - 1, Math.max(0, Math.floor((relX / rect.width) * N)));
      const r = Math.min(N - 1, Math.max(0, Math.floor((relY / rect.height) * N)));
      return [r, c];
    },
    [N],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSolved || e.button === 2) return;
      const coord = resolveCellFromPoint(e.clientX, e.clientY);
      if (!coord) return;
      const [r, c] = coord;
      const cur = board[r][c];
      dragActionRef.current = {
        active: true,
        mode: cur === "x" ? "clear-x" : cur === "empty" ? "mark-x" : null,
        startCell: coord,
        draggedCells: 1,
      };
    },
    [isSolved, resolveCellFromPoint, board],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragActionRef.current.active || isSolved || !dragActionRef.current.mode) return;
      const coord = resolveCellFromPoint(e.clientX, e.clientY);
      if (!coord) return;
      const [r, c] = coord;
      const start = dragActionRef.current.startCell;
      if (start && start[0] === r && start[1] === c && dragActionRef.current.draggedCells === 1) {
        return;
      }

      const mode = dragActionRef.current.mode;
      setBoard((prev) => {
        const cur = prev[r][c];
        if (mode === "mark-x" && cur === "empty") {
          const next = prev.map((row) => [...row]);
          if (dragActionRef.current.draggedCells === 1) {
            setHistory((h) => [...h.slice(-30), prev.map((row) => [...row])]);
            if (start && next[start[0]][start[1]] === "empty") {
              next[start[0]][start[1]] = "x";
            }
          }
          next[r][c] = "x";
          dragActionRef.current.draggedCells++;
          soundFx.playTap();
          return next;
        }
        if (mode === "clear-x" && cur === "x") {
          const next = prev.map((row) => [...row]);
          if (dragActionRef.current.draggedCells === 1) {
            setHistory((h) => [...h.slice(-30), prev.map((row) => [...row])]);
            if (start && next[start[0]][start[1]] === "x") {
              next[start[0]][start[1]] = "empty";
            }
          }
          next[r][c] = "empty";
          dragActionRef.current.draggedCells++;
          soundFx.playTap();
          return next;
        }
        return prev;
      });
    },
    [isSolved, resolveCellFromPoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragActionRef.current.active) return;
      const wasClick = dragActionRef.current.draggedCells === 1;
      const start = dragActionRef.current.startCell;
      dragActionRef.current = { active: false, mode: null, startCell: null, draggedCells: 0 };

      if (wasClick && start && e.button !== 2) {
        cycleCell(start[0], start[1], false);
      }
    },
    [cycleCell],
  );

  const handleHint = useCallback(() => {
    if (isSolved) return;
    const solSet = new Set(puzzle.solution.map(([r, c]) => `${r},${c}`));

    setBoard((prev) => {
      setHistory((h) => [...h.slice(-30), prev.map((row) => [...row])]);
      const next = prev.map((row) => [...row]);

      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (next[r][c] === "crown" && !solSet.has(`${r},${c}`)) {
            next[r][c] = "x";
            setHintsUsed((n) => n + 1);
            soundFx.playError();
            return next;
          }
        }
      }

      for (const [sr, sc] of puzzle.solution) {
        if (next[sr][sc] !== "crown") {
          next[sr][sc] = "crown";
          if (autoX) applyAutoXAroundCrown(next, sr, sc);
          setHintsUsed((n) => n + 1);
          soundFx.playStep(5);
          checkSolved(next);
          return next;
        }
      }
      return prev;
    });
  }, [isSolved, puzzle.solution, N, autoX, applyAutoXAroundCrown, checkSolved]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setBoard(last);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setHistory((h) => [...h.slice(-30), board.map((row) => [...row])]);
    setBoard(Array.from({ length: N }, () => Array<CellState>(N).fill("empty")));
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
    [issueNumber, initialMode, userCrowns],
  );

  return (
    <PuzzleShell
      slug="queens"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onUndo={handleUndo}
      canUndo={history.length > 0}
      onReset={handleReset}
      onHint={handleHint}
      hintsUsed={hintsUsed}
      solveSummary={`${N}×${N} grid cleared`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 flex w-full max-w-[380px] flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
            <span>
              Crowns:{" "}
              <strong className={userCrowns.length === N ? "text-emerald-600" : "text-brand"}>
                {userCrowns.length} / {N}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setAutoX((v) => !v)}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                autoX
                  ? "border-brand/30 bg-violet-50 text-brand"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              Auto-✕: {autoX ? "ON" : "OFF"}
            </button>
          </div>

          <div
            ref={gridRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
            className="grid touch-none select-none overflow-hidden rounded-2xl border-[3px] border-slate-800 bg-slate-800 shadow-lg"
            style={{
              gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
              width: "min(100%, 380px)",
              aspectRatio: "1/1",
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const regionId = puzzle.regions[r]?.[c] ?? 0;
                const regionClass = REGION_PALETTES[regionId % REGION_PALETTES.length];
                const isConflict = conflicts.has(`${r},${c}`);

                const borderTop =
                  r > 0 && puzzle.regions[r - 1]?.[c] !== regionId
                    ? "border-t-[2.5px] border-t-slate-800"
                    : "border-t border-t-slate-900/15";
                const borderLeft =
                  c > 0 && puzzle.regions[r]?.[c - 1] !== regionId
                    ? "border-l-[2.5px] border-l-slate-800"
                    : "border-l border-l-slate-900/15";

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      cycleCell(r, c, true);
                    }}
                    className={`relative flex items-center justify-center font-black transition-colors ${regionClass} ${borderTop} ${borderLeft} ${
                      isConflict
                        ? "bg-red-200 text-red-700 ring-2 ring-inset ring-red-500"
                        : "hover:brightness-95"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                    aria-label={`Row ${r + 1} Col ${c + 1} Region ${regionId + 1}: ${cell}`}
                  >
                    {cell === "crown" && (
                      <span
                        className={`leading-none drop-shadow-sm ${
                          N >= 8 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                        } ${isConflict ? "animate-bounce" : ""}`}
                      >
                        ♕
                      </span>
                    )}
                    {cell === "x" && (
                      <span className="text-xs font-extrabold leading-none text-slate-600/65 sm:text-sm">
                        ✕
                      </span>
                    )}
                  </button>
                );
              }),
            )}
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Tap: ✕ → ♕ → Clear · Drag across squares to quickly mark ✕ · Right-click for ✕
          </p>
          {conflicts.size > 0 && (
            <p className="mt-1.5 text-xs font-bold text-red-600">
              Crowns cannot share a row, column, region, or touch diagonally!
            </p>
          )}
        </div>
      )}
    </PuzzleShell>
  );
}
