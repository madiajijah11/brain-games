"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { MiniSudokuPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateMiniSudoku } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

interface HistoryEntry {
  grid: number[][];
  notes: number[][][];
}

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
    puzzle.initial.map((row) => row.map((v) => v ?? 0)),
  );
  const [notes, setNotes] = useState<number[][][]>(() =>
    Array.from({ length: N }, () => Array.from({ length: N }, () => [])),
  );
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [isNotesMode, setIsNotesMode] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  const isInitialCell = useCallback(
    (r: number, c: number) => puzzle.initial[r]?.[c] !== null,
    [puzzle.initial],
  );

  const conflictCells = useMemo(() => {
    const conflicts = new Set<string>();

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const val = grid[r][c];
        if (val === 0) continue;

        for (let i = 0; i < N; i++) {
          if (i !== c && grid[r][i] === val) {
            conflicts.add(`${r},${c}`);
            conflicts.add(`${r},${i}`);
          }
          if (i !== r && grid[i][c] === val) {
            conflicts.add(`${r},${c}`);
            conflicts.add(`${i},${c}`);
          }
        }

        const br = Math.floor(r / puzzle.boxHeight) * puzzle.boxHeight;
        const bc = Math.floor(c / puzzle.boxWidth) * puzzle.boxWidth;
        for (let rr = br; rr < br + puzzle.boxHeight; rr++) {
          for (let cc = bc; cc < bc + puzzle.boxWidth; cc++) {
            if ((rr !== r || cc !== c) && grid[rr][cc] === val) {
              conflicts.add(`${r},${c}`);
              conflicts.add(`${rr},${cc}`);
            }
          }
        }
      }
    }
    return conflicts;
  }, [grid, N, puzzle.boxHeight, puzzle.boxWidth]);

  const handleDigitInput = useCallback(
    (digit: number) => {
      if (isSolved || !selectedCell) return;
      const [r, c] = selectedCell;
      if (isInitialCell(r, c)) return;

      setHistory((h) => [
        ...h.slice(-30),
        {
          grid: grid.map((row) => [...row]),
          notes: notes.map((row) => row.map((cell) => [...cell])),
        },
      ]);

      if (isNotesMode && digit > 0) {
        soundFx.playTap();
        setNotes((prev) => {
          const next = prev.map((row) => row.map((cell) => [...cell]));
          const cellNotes = next[r][c];
          next[r][c] = cellNotes.includes(digit)
            ? cellNotes.filter((d) => d !== digit)
            : [...cellNotes, digit].sort((a, b) => a - b);
          return next;
        });
        return;
      }

      const nextGrid = grid.map((row) => [...row]);
      const nextVal = nextGrid[r][c] === digit ? 0 : digit;
      nextGrid[r][c] = nextVal;

      setGrid(nextGrid);

      setNotes((prev) => {
        const nextNotes = prev.map((row) => row.map((cell) => [...cell]));
        if (nextVal > 0) {
          nextNotes[r][c] = [];
          const br = Math.floor(r / puzzle.boxHeight) * puzzle.boxHeight;
          const bc = Math.floor(c / puzzle.boxWidth) * puzzle.boxWidth;
          for (let i = 0; i < N; i++) {
            nextNotes[r][i] = nextNotes[r][i].filter((d) => d !== nextVal);
            nextNotes[i][c] = nextNotes[i][c].filter((d) => d !== nextVal);
          }
          for (let rr = br; rr < br + puzzle.boxHeight; rr++) {
            for (let cc = bc; cc < bc + puzzle.boxWidth; cc++) {
              nextNotes[rr][cc] = nextNotes[rr][cc].filter((d) => d !== nextVal);
            }
          }
        }
        return nextNotes;
      });

      if (nextVal === 0) {
        soundFx.playTap();
      } else {
        soundFx.playStep(nextVal);
      }

      const isComplete = nextGrid.every((row) => row.every((val) => val > 0));
      if (isComplete && validateMiniSudoku(puzzle, nextGrid)) {
        setIsSolved(true);
      }
    },
    [isSolved, selectedCell, isInitialCell, grid, notes, isNotesMode, N, puzzle],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSolved) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        setIsNotesMode((v) => !v);
        return;
      }

      if (e.key >= "1" && e.key <= String(N)) {
        e.preventDefault();
        handleDigitInput(Number(e.key));
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        e.preventDefault();
        handleDigitInput(0);
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedCell((prev) => {
          const [r, c] = prev ?? [0, 0];
          if (e.key === "ArrowUp") return [Math.max(0, r - 1), c];
          if (e.key === "ArrowDown") return [Math.min(N - 1, r + 1), c];
          if (e.key === "ArrowLeft") return [r, Math.max(0, c - 1)];
          return [r, Math.min(N - 1, c + 1)];
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSolved, N, handleDigitInput]);

  const handleHint = useCallback(() => {
    if (isSolved) return;
    setHistory((h) => [
      ...h.slice(-30),
      {
        grid: grid.map((row) => [...row]),
        notes: notes.map((row) => row.map((cell) => [...cell])),
      },
    ]);

    const nextGrid = grid.map((row) => [...row]);
    const candidates: [number, number][] = [];
    if (selectedCell) candidates.push(selectedCell);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        candidates.push([r, c]);
      }
    }

    for (const [r, c] of candidates) {
      if (isInitialCell(r, c)) continue;
      if (nextGrid[r][c] !== puzzle.solution[r][c]) {
        nextGrid[r][c] = puzzle.solution[r][c];
        setGrid(nextGrid);
        setSelectedCell([r, c]);
        setHintsUsed((n) => n + 1);
        soundFx.playStep(nextGrid[r][c]);
        if (
          nextGrid.every((row) => row.every((v) => v > 0)) &&
          validateMiniSudoku(puzzle, nextGrid)
        ) {
          setIsSolved(true);
        }
        return;
      }
    }
  }, [isSolved, grid, notes, selectedCell, N, isInitialCell, puzzle]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setGrid(last.grid);
      setNotes(last.notes);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setHistory((h) => [
      ...h.slice(-30),
      {
        grid: grid.map((row) => [...row]),
        notes: notes.map((row) => row.map((cell) => [...cell])),
      },
    ]);
    setGrid(puzzle.initial.map((row) => row.map((v) => v ?? 0)));
    setNotes(Array.from({ length: N }, () => Array.from({ length: N }, () => [])));
    setIsSolved(false);
  }, [grid, notes, puzzle.initial, N]);

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
    [issueNumber, initialMode, grid],
  );

  const selectedValue = selectedCell ? grid[selectedCell[0]][selectedCell[1]] : 0;

  return (
    <PuzzleShell
      slug="mini-sudoku"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onUndo={handleUndo}
      canUndo={history.length > 0}
      onReset={handleReset}
      onHint={handleHint}
      hintsUsed={hintsUsed}
      solveSummary={`${N}×${N} Mini Sudoku`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 flex w-full max-w-[340px] items-center justify-between text-xs font-bold text-slate-500">
            <span>Fill 1–{N} per row, col & box</span>
            <button
              type="button"
              onClick={() => setIsNotesMode((v) => !v)}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                isNotesMode
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
              }`}
            >
              ✏️ Notes: {isNotesMode ? "ON" : "OFF"}
            </button>
          </div>

          <div
            className="grid select-none overflow-hidden rounded-2xl border-[3px] border-slate-800 bg-slate-800 shadow-lg"
            style={{
              gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))`,
              width: "min(100%, 340px)",
              aspectRatio: "1/1",
            }}
          >
            {grid.map((row, r) =>
              row.map((val, c) => {
                const fixed = isInitialCell(r, c);
                const isSelected = selectedCell?.[0] === r && selectedCell?.[1] === c;
                const isSamePeer =
                  selectedCell &&
                  !isSelected &&
                  (selectedCell[0] === r ||
                    selectedCell[1] === c ||
                    (Math.floor(selectedCell[0] / puzzle.boxHeight) ===
                      Math.floor(r / puzzle.boxHeight) &&
                      Math.floor(selectedCell[1] / puzzle.boxWidth) ===
                        Math.floor(c / puzzle.boxWidth)));
                const isSameDigit = selectedValue > 0 && val === selectedValue && !isSelected;
                const isConflict = conflictCells.has(`${r},${c}`);
                const cellNotes = notes[r][c];

                const boxTopBorder =
                  r > 0 && r % puzzle.boxHeight === 0
                    ? "border-t-[2.5px] border-t-slate-800"
                    : "border-t border-t-slate-200";
                const boxLeftBorder =
                  c > 0 && c % puzzle.boxWidth === 0
                    ? "border-l-[2.5px] border-l-slate-800"
                    : "border-l border-l-slate-200";

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => setSelectedCell([r, c])}
                    className={`relative flex items-center justify-center font-black transition-colors ${boxTopBorder} ${boxLeftBorder} ${
                      isConflict
                        ? "bg-red-100 text-red-700"
                        : isSelected
                          ? "bg-violet-200/90 text-brand ring-2 ring-inset ring-brand"
                          : isSameDigit
                            ? "bg-violet-100 text-brand"
                            : isSamePeer
                              ? "bg-slate-50"
                              : fixed
                                ? "bg-slate-100 text-slate-900"
                                : "bg-white text-brand hover:bg-slate-50"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                    aria-label={`Row ${r + 1} Col ${c + 1}: ${val || "empty"}`}
                  >
                    {val > 0 ? (
                      <span className={N >= 6 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}>
                        {val}
                      </span>
                    ) : cellNotes.length > 0 ? (
                      <div
                        className="grid h-full w-full place-items-center p-0.5 text-[9px] font-bold leading-none text-slate-500"
                        style={{
                          gridTemplateColumns: `repeat(${N === 4 ? 2 : 3}, minmax(0, 1fr))`,
                        }}
                      >
                        {Array.from({ length: N }, (_, idx) => idx + 1).map((d) => (
                          <span
                            key={d}
                            className={cellNotes.includes(d) ? "opacity-100" : "opacity-0"}
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              }),
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: N }, (_, i) => i + 1).map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isSolved || !selectedCell}
                onClick={() => handleDigitInput(digit)}
                className={`grid h-11 w-11 place-items-center rounded-2xl border text-lg font-black shadow-sm transition active:scale-95 disabled:opacity-40 ${
                  isNotesMode
                    ? "border-violet-200 bg-violet-50 text-brand hover:border-brand"
                    : "border-slate-200 bg-white text-slate-800 hover:border-brand hover:text-brand"
                }`}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={isSolved || !selectedCell}
              onClick={() => handleDigitInput(0)}
              className="grid h-11 place-items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 shadow-sm transition active:scale-95 disabled:opacity-40"
              title="Clear cell"
            >
              Clear
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Keyboard: 1–{N}, Arrow keys, Backspace to clear, N for Notes
          </p>
        </div>
      )}
    </PuzzleShell>
  );
}
