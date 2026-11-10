"use client";

import { useState, useCallback, useRef } from "react";
import { ZipPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateZip } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const resolveCellCoord = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const cellW = rect.width / puzzle.width;
      const cellH = rect.height / puzzle.height;

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
        return null;
      }

      const c = Math.floor(relX / cellW);
      const r = Math.floor(relY / cellH);
      return [r, c];
    },
    [puzzle.width, puzzle.height]
  );

  const handleCellEnter = useCallback(
    (r: number, c: number) => {
      if (isSolved) return;

      setPath((prev) => {
        // If starting fresh, must start at checkpoint #1
        if (prev.length === 0) {
          const startNode = puzzle.nodes.find((n) => n.num === 1);
          if (startNode && startNode.r === r && startNode.c === c) {
            soundFx.playStep(1);
            return [[r, c]];
          }
          return prev;
        }

        const [lastR, lastC] = prev[prev.length - 1];
        if (lastR === r && lastC === c) return prev;

        // Check if moving backward (backtracking)
        const existingIdx = prev.findIndex(([pr, pc]) => pr === r && pc === c);
        if (existingIdx !== -1) {
          soundFx.playTap();
          return prev.slice(0, existingIdx + 1);
        }

        // Must be adjacent (distance = 1)
        const dist = Math.abs(lastR - r) + Math.abs(lastC - c);
        if (dist === 1) {
          const next = [...prev, [r, c] as [number, number]];
          soundFx.playStep(next.length);

          // Verify victory
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSolved) return;
      setIsDragging(true);
      const coord = resolveCellCoord(e.clientX, e.clientY);
      if (coord) {
        handleCellEnter(coord[0], coord[1]);
      }
    },
    [isSolved, resolveCellCoord, handleCellEnter]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || isSolved) return;
      const coord = resolveCellCoord(e.clientX, e.clientY);
      if (coord) {
        handleCellEnter(coord[0], coord[1]);
      }
    },
    [isDragging, isSolved, resolveCellCoord, handleCellEnter]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReset = useCallback(() => {
    setPath([]);
    setIsSolved(false);
    soundFx.playTap();
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

  // SVG continuous ribbon path generator
  const svgPoints = path
    .map(([r, c]) => {
      const x = ((c + 0.5) / puzzle.width) * 100;
      const y = ((r + 0.5) / puzzle.height) * 100;
      return `${x},${y}`;
    })
    .join(" ");

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
        <div className="flex flex-col items-center select-none touch-none">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Drag your finger or cursor starting from checkpoint 1 through all numbers in order.
          </div>

          {/* Interactive Path Board Container */}
          <div
            ref={boardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative grid gap-1.5 rounded-2xl border-2 border-slate-700 bg-slate-900 p-2 shadow-2xl touch-none cursor-crosshair overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
              width: "min(100%, 340px)",
              aspectRatio: `${puzzle.width}/${puzzle.height}`,
            }}
          >
            {/* Background Grid Cells */}
            {Array.from({ length: puzzle.height }).map((_, r) =>
              Array.from({ length: puzzle.width }).map((_, c) => {
                const node = puzzle.nodes.find((n) => n.r === r && n.c === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative flex items-center justify-center rounded-xl transition-all ${
                      node
                        ? "bg-slate-800/80 border border-slate-700"
                        : "bg-slate-800/40 border border-slate-800/60"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {/* Fixed Landmark Badges (High Contrast, Layered Above SVG) */}
                    {node && (
                      <span className="z-20 grid h-8 w-8 place-items-center rounded-full bg-amber-400 font-black text-sm text-slate-950 shadow-md ring-2 ring-amber-300">
                        {node.num}
                      </span>
                    )}
                  </div>
                );
              })
            )}

            {/* Continuous SVG Ribbon Overlay */}
            {path.length > 1 && (
              <svg
                className="absolute inset-0 z-10 pointer-events-none h-full w-full p-2"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {/* Glow Backdrop */}
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-40 blur-xs"
                />
                {/* Main Vibrant Ribbon Line */}
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Inner Core Highlight */}
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#E0E7FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <p className="mt-4 text-xs font-semibold text-slate-400">
            {path.length === 0
              ? "Touch 1 to begin drawing"
              : `Path length: ${path.length} steps`}
          </p>
        </div>
      )}
    </PuzzleShell>
  );
}
