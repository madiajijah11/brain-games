"use client";

import { useState, useCallback } from "react";
import { PatchesPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validatePatches } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

export function PatchesBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: PatchesPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const [placedPositions, setPlacedPositions] = useState<Record<string, [number, number]>>({});
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState<boolean>(false);

  const handleCellDrop = useCallback(
    (targetR: number, targetC: number) => {
      if (isSolved || !selectedShapeId) return;

      setPlacedPositions((prev) => {
        const next: Record<string, [number, number]> = {
          ...prev,
          [selectedShapeId]: [targetR, targetC],
        };

        // Test if all shapes are placed and valid
        const placedArray = Object.entries(next).map(([id, [r, c]]) => {
          const shape = puzzle.shapes.find((s) => s.id === id);
          const absoluteCoords: [number, number][] = (shape?.coords || []).map(([dr, dc]) => [
            r + dr,
            c + dc,
          ]);
          return { id, placedCoords: absoluteCoords };
        });

        if (validatePatches(puzzle, placedArray)) {
          setIsSolved(true);
        }

        return next;
      });
      setSelectedShapeId(null);
    },
    [isSolved, selectedShapeId, puzzle]
  );

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const placedArray = Object.entries(placedPositions).map(([id, [r, c]]) => {
        const shape = puzzle.shapes.find((s) => s.id === id);
        const absoluteCoords: [number, number][] = (shape?.coords || []).map(([dr, dc]) => [
          r + dr,
          c + dc,
        ]);
        return { id, placedCoords: absoluteCoords };
      });

      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "patches",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: placedArray,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [issueNumber, initialMode, placedPositions, puzzle.shapes]
  );

  return (
    <PuzzleShell
      slug="patches"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Select a piece below, then tap a valid square on the grid to place it.
          </div>

          {/* Target Board Grid */}
          <div
            className="grid gap-1.5 rounded-2xl border-2 border-slate-300 bg-slate-100 p-2 shadow-inner select-none"
            style={{
              gridTemplateColumns: `repeat(${puzzle.boardWidth}, minmax(0, 1fr))`,
              width: "min(100%, 280px)",
              aspectRatio: `${puzzle.boardWidth}/${puzzle.boardHeight}`,
            }}
          >
            {puzzle.targetMask.map((row, r) =>
              row.map((isValidTarget, c) => (
                <button
                  key={`${r}-${c}`}
                  disabled={!isValidTarget || isSolved}
                  onClick={() => handleCellDrop(r, c)}
                  className={`rounded-xl border transition-all ${
                    isValidTarget
                      ? "border-slate-300 bg-white hover:border-brand hover:bg-violet-50"
                      : "border-transparent bg-slate-200/40 cursor-not-allowed"
                  }`}
                  style={{ aspectRatio: "1/1" }}
                />
              ))
            )}
          </div>

          {/* Shapes Dock */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {puzzle.shapes.map((shape) => {
              const isSelected = selectedShapeId === shape.id;
              const isPlaced = placedPositions[shape.id] !== undefined;

              return (
                <button
                  key={shape.id}
                  disabled={isSolved}
                  onClick={() => setSelectedShapeId(shape.id)}
                  className={`flex flex-col items-center rounded-2xl border-2 p-3 transition-all ${
                    isSelected
                      ? "border-brand bg-violet-50 shadow-md scale-105"
                      : isPlaced
                      ? "border-emerald-300 bg-emerald-50/60 opacity-60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="grid grid-cols-3 gap-1">
                    {shape.coords.map(([r, c], i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-sm"
                        style={{ backgroundColor: shape.color }}
                      />
                    ))}
                  </div>
                  <span className="mt-1 text-[10px] font-bold text-slate-500">
                    {isPlaced ? "Placed" : "Pick piece"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
