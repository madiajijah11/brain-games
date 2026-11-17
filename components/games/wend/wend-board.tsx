"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { WendPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateWend } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

export function WendBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: WendPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const rows = puzzle.grid.length;
  const cols = puzzle.grid[0]?.length ?? 4;

  const [selectedCoords, setSelectedCoords] = useState<[number, number][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [hintPrefix, setHintPrefix] = useState<string>("");
  const [hintsUsed, setHintsUsed] = useState<number>(0);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const swipeMovedRef = useRef<boolean>(false);

  const currentWord = useMemo(
    () => selectedCoords.map(([r, c]) => puzzle.grid[r]?.[c] ?? "").join(""),
    [selectedCoords, puzzle.grid],
  );

  const submitBuiltWord = useCallback(
    (wordToSubmit: string) => {
      if (!wordToSubmit || isSolved) return;
      const wordUpper = wordToSubmit.toUpperCase();
      const isTarget = puzzle.targetWords.some((w) => w.toUpperCase() === wordUpper);

      if (isTarget && !foundWords.includes(wordUpper)) {
        const nextFound = [...foundWords, wordUpper];
        setFoundWords(nextFound);
        setMessage(`✓ Found "${wordUpper}"!`);
        setHintPrefix("");
        soundFx.playStep(Math.min(8, nextFound.length));

        if (validateWend(puzzle, nextFound)) {
          setIsSolved(true);
        }
      } else if (foundWords.includes(wordUpper)) {
        setMessage(`"${wordUpper}" was already found.`);
        soundFx.playTap();
      } else if (wordUpper.length >= 3) {
        setMessage(`"${wordUpper}" is not in today's word bank.`);
        soundFx.playError();
      }

      setSelectedCoords([]);
    },
    [isSolved, puzzle, foundWords],
  );

  // Resolve cell from pointer with generous diagonal tolerance (inner 44% radius)
  const resolveCellCoord = useCallback(
    (clientX: number, clientY: number, strictCenter: boolean): [number, number] | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) return null;

      const cellW = rect.width / cols;
      const cellH = rect.height / rows;
      const c = Math.min(cols - 1, Math.max(0, Math.floor(relX / cellW)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(relY / cellH)));

      if (strictCenter) {
        const cx = (c + 0.5) * cellW;
        const cy = (r + 0.5) * cellH;
        const distNorm = Math.hypot((relX - cx) / cellW, (relY - cy) / cellH);
        if (distNorm > 0.42) return null;
      }
      return [r, c];
    },
    [cols, rows],
  );

  const extendTrailTo = useCallback(
    (r: number, c: number, allowToggleTap: boolean) => {
      if (isSolved) return;
      setSelectedCoords((prev) => {
        if (prev.length === 0) {
          soundFx.playStep(1);
          return [[r, c]];
        }
        const [lastR, lastC] = prev[prev.length - 1];
        if (lastR === r && lastC === c) {
          if (allowToggleTap) {
            soundFx.playTap();
            return prev.slice(0, -1);
          }
          return prev;
        }

        // Backtrack to previous cell
        if (prev.length >= 2) {
          const [prevR, prevC] = prev[prev.length - 2];
          if (prevR === r && prevC === c) {
            soundFx.playTap();
            return prev.slice(0, -1);
          }
        }

        const dR = Math.abs(lastR - r);
        const dC = Math.abs(lastC - c);
        const already = prev.some(([sr, sc]) => sr === r && sc === c);
        if (dR <= 1 && dC <= 1 && !already) {
          soundFx.playStep(Math.min(8, prev.length + 1));
          return [...prev, [r, c]];
        }
        return prev;
      });
    },
    [isSolved],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSolved) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const coord = resolveCellCoord(e.clientX, e.clientY, false);
      if (!coord) return;
      setIsSwiping(true);
      swipeMovedRef.current = false;
      extendTrailTo(coord[0], coord[1], true);
    },
    [isSolved, resolveCellCoord, extendTrailTo],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isSwiping || isSolved) return;
      const coord = resolveCellCoord(e.clientX, e.clientY, true);
      if (!coord) return;
      setSelectedCoords((prev) => {
        const last = prev[prev.length - 1];
        if (!last || (last[0] === coord[0] && last[1] === coord[1])) return prev;
        swipeMovedRef.current = true;
        const dR = Math.abs(last[0] - coord[0]);
        const dC = Math.abs(last[1] - coord[1]);
        const prevTwo = prev.length >= 2 ? prev[prev.length - 2] : null;
        if (prevTwo && prevTwo[0] === coord[0] && prevTwo[1] === coord[1]) {
          soundFx.playTap();
          return prev.slice(0, -1);
        }
        const already = prev.some(([sr, sc]) => sr === coord[0] && sc === coord[1]);
        if (dR <= 1 && dC <= 1 && !already) {
          soundFx.playStep(Math.min(8, prev.length + 1));
          return [...prev, coord];
        }
        return prev;
      });
    },
    [isSwiping, isSolved, resolveCellCoord],
  );

  const handlePointerUp = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (swipeMovedRef.current && currentWord.length >= 3) {
      submitBuiltWord(currentWord);
    }
  }, [isSwiping, currentWord, submitBuiltWord]);

  const handleHint = useCallback(() => {
    if (isSolved) return;
    const foundSet = new Set(foundWords.map((w) => w.toUpperCase()));
    const unfound = puzzle.targetWords.find((w) => !foundSet.has(w.toUpperCase()));
    if (!unfound) return;
    const upper = unfound.toUpperCase();
    setHintPrefix(`Try a ${upper.length}-letter word starting with "${upper.slice(0, 2)}…"`);
    setHintsUsed((n) => n + 1);
    soundFx.playTap();
  }, [isSolved, foundWords, puzzle.targetWords]);

  const handleReset = useCallback(() => {
    setSelectedCoords([]);
    setFoundWords([]);
    setMessage("");
    setHintPrefix("");
    setIsSolved(false);
  }, []);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "wend",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: foundWords,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, foundWords],
  );

  const svgPoints = selectedCoords
    .map(([r, c]) => {
      const x = ((c + 0.5) / cols) * 100;
      const y = ((r + 0.5) / rows) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const progressPct = Math.min(100, Math.round((foundWords.length / puzzle.minWordsToWin) * 100));

  return (
    <PuzzleShell
      slug="wend"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onReset={handleReset}
      onHint={handleHint}
      hintsUsed={hintsUsed}
      solveSummary={`${foundWords.length} words discovered`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex touch-none select-none flex-col items-center">
          {/* Progress Tracker */}
          <div className="mb-4 w-full max-w-xs">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Swipe or tap adjacent letters</span>
              <span className="text-brand">
                {foundWords.length} / {puzzle.minWordsToWin} words
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Active Word Display */}
          <div className="mb-4 flex h-11 w-full max-w-xs items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4">
            <span className="font-mono text-lg font-black tracking-widest text-brand">
              {currentWord || "…"}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={currentWord.length < 3}
                onClick={() => submitBuiltWord(currentWord)}
                className="rounded-lg bg-brand px-3 py-1 text-xs font-bold text-white shadow-sm disabled:opacity-40"
              >
                Submit
              </button>
              <button
                type="button"
                disabled={!currentWord}
                onClick={() => setSelectedCoords([])}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 4x4 Letter Grid with Live SVG Swipe Trail */}
          <div
            ref={gridRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative grid cursor-pointer touch-none grid-cols-4 gap-2.5 rounded-2xl border-[3px] border-slate-800 bg-slate-900 p-3 shadow-xl"
            style={{ width: "min(100%, 330px)", aspectRatio: "1/1" }}
          >
            {puzzle.grid.map((row, r) =>
              row.map((char, c) => {
                const selIdx = selectedCoords.findIndex(([sr, sc]) => sr === r && sc === c);
                const isSelected = selIdx !== -1;

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative z-20 flex items-center justify-center rounded-xl text-2xl font-black transition-all ${
                      isSelected
                        ? "scale-95 bg-brand text-white shadow-md ring-2 ring-violet-300"
                        : "bg-slate-800 text-white hover:bg-slate-700"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {char}
                  </div>
                );
              }),
            )}

            {selectedCoords.length > 1 && (
              <svg
                className="pointer-events-none absolute inset-3 z-10 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                />
              </svg>
            )}
          </div>

          {hintPrefix && (
            <p className="mt-3 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              💡 {hintPrefix}
            </p>
          )}
          {message && <p className="mt-2 text-xs font-bold text-slate-600">{message}</p>}

          {/* Words Found Pill List */}
          <div className="mt-5 flex flex-wrap justify-center gap-1.5 text-xs">
            <span className="font-bold text-slate-400">
              Found ({foundWords.length}/{puzzle.minWordsToWin}):
            </span>
            {foundWords.map((w) => (
              <span
                key={w}
                className="rounded-md bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
