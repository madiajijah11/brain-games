"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { PatchesPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validatePatches } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

export function PatchesBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: PatchesPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  // Map shapeId -> [rootRow, rootCol] where piece is dropped
  const [placedPositions, setPlacedPositions] = useState<Record<string, [number, number]>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [hoverCoord, setHoverCoord] = useState<[number, number] | null>(null);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  // Derive board cells: maps `${r},${c}` -> { shapeId, color }
  const boardOccupancy = useMemo(() => {
    const map = new Map<string, { shapeId: string; color: string }>();
    for (const [shapeId, [rootR, rootC]] of Object.entries(placedPositions)) {
      const shape = puzzle.shapes.find((s) => s.id === shapeId);
      if (shape) {
        for (const [dr, dc] of shape.coords) {
          map.set(`${rootR + dr},${rootC + dc}`, { shapeId, color: shape.color });
        }
      }
    }
    return map;
  }, [placedPositions, puzzle.shapes]);

  // Check if hovering position is valid for active piece
  const ghostCells = useMemo(() => {
    if (!activeDragId || !hoverCoord) return null;
    const shape = puzzle.shapes.find((s) => s.id === activeDragId);
    if (!shape) return null;

    const [rootR, rootC] = hoverCoord;
    const cells: { r: number; c: number; valid: boolean }[] = [];
    let isOverallValid = true;

    for (const [dr, dc] of shape.coords) {
      const r = rootR + dr;
      const c = rootC + dc;
      const isInside = r >= 0 && r < puzzle.boardHeight && c >= 0 && c < puzzle.boardWidth;
      const isTarget = isInside && !!puzzle.targetMask[r]?.[c];
      const existing = boardOccupancy.get(`${r},${c}`);
      const isOccupied = existing !== undefined && existing.shapeId !== activeDragId;
      const cellValid = isTarget && !isOccupied;

      if (!cellValid) isOverallValid = false;
      cells.push({ r, c, valid: cellValid });
    }

    return { cells, isOverallValid, color: shape.color };
  }, [activeDragId, hoverCoord, puzzle, boardOccupancy]);

  // Click on board to retrieve placed piece back to dock
  const handleBoardCellClick = useCallback(
    (r: number, c: number) => {
      if (isSolved) return;
      const occupying = boardOccupancy.get(`${r},${c}`);
      if (occupying) {
        soundFx.playTap();
        setPlacedPositions((prev) => {
          const next = { ...prev };
          delete next[occupying.shapeId];
          return next;
        });
      }
    },
    [isSolved, boardOccupancy]
  );

  // Compute grid coordinate from pointer event
  const resolveGridCoord = useCallback(
    (e: React.PointerEvent): [number, number] | null => {
      if (!gridContainerRef.current) return null;
      const rect = gridContainerRef.current.getBoundingClientRect();
      const cellW = rect.width / puzzle.boardWidth;
      const cellH = rect.height / puzzle.boardHeight;

      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
        return null;
      }

      const c = Math.floor(relX / cellW);
      const r = Math.floor(relY / cellH);
      return [r, c];
    },
    [puzzle.boardWidth, puzzle.boardHeight]
  );

  // Start dragging a piece from dock
  const handlePiecePointerDown = useCallback(
    (shapeId: string, e: React.PointerEvent) => {
      if (isSolved) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      soundFx.playTap();
      setActiveDragId(shapeId);
      setHoverCoord(null);
    },
    [isSolved]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDragId) return;
      const coord = resolveGridCoord(e);
      setHoverCoord(coord);
    },
    [activeDragId, resolveGridCoord]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDragId) return;

      const coord = resolveGridCoord(e);
      if (coord && ghostCells?.isOverallValid) {
        soundFx.playStep(Object.keys(placedPositions).length + 1);

        setPlacedPositions((prev) => {
          const next = { ...prev, [activeDragId]: coord };

          // Test victory
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
      } else {
        soundFx.playError();
      }

      setActiveDragId(null);
      setHoverCoord(null);
    },
    [activeDragId, resolveGridCoord, ghostCells, puzzle, placedPositions]
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
      onReset={() => {
        setPlacedPositions({});
        setIsSolved(false);
      }}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex flex-col items-center select-none touch-none"
        >
          <div className="mb-4 text-xs font-bold text-slate-500">
            Drag pieces onto the board. Tap a placed piece on the board to retrieve it.
          </div>

          {/* Target Board Grid */}
          <div
            ref={gridContainerRef}
            className="relative grid gap-1.5 rounded-2xl border-2 border-slate-300 bg-slate-100 p-2.5 shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${puzzle.boardWidth}, minmax(0, 1fr))`,
              width: "min(100%, 300px)",
              aspectRatio: `${puzzle.boardWidth}/${puzzle.boardHeight}`,
            }}
          >
            {puzzle.targetMask.map((row, r) =>
              row.map((isValidTarget, c) => {
                const cellKey = `${r},${c}`;
                const occupied = boardOccupancy.get(cellKey);
                const isGhost =
                  ghostCells &&
                  ghostCells.cells.some((gc) => gc.r === r && gc.c === c);
                const ghostValid = ghostCells?.isOverallValid;

                return (
                  <button
                    key={cellKey}
                    disabled={!isValidTarget || isSolved}
                    onClick={() => handleBoardCellClick(r, c)}
                    className={`relative flex items-center justify-center rounded-xl border text-xs font-black transition-all ${
                      occupied
                        ? "border-black/10 shadow-sm cursor-pointer hover:brightness-110 active:scale-95"
                        : isGhost
                        ? ghostValid
                          ? "ring-2 ring-emerald-500 bg-emerald-200/80 border-emerald-400"
                          : "ring-2 ring-red-500 bg-red-200/80 border-red-400"
                        : isValidTarget
                        ? "border-slate-300 bg-white hover:border-slate-400"
                        : "border-transparent bg-slate-200/30 cursor-not-allowed opacity-30"
                    }`}
                    style={{
                      aspectRatio: "1/1",
                      backgroundColor: occupied ? occupied.color : undefined,
                    }}
                  >
                    {occupied && (
                      <span className="text-[10px] text-white drop-shadow font-extrabold">✕</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Shapes Dock */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {puzzle.shapes.map((shape) => {
              const isPlaced = placedPositions[shape.id] !== undefined;
              const isDragging = activeDragId === shape.id;

              return (
                <div
                  key={shape.id}
                  onPointerDown={(e) => !isPlaced && handlePiecePointerDown(shape.id, e)}
                  className={`flex flex-col items-center rounded-2xl border-2 p-3 transition-all touch-none ${
                    isDragging
                      ? "border-brand bg-violet-50 scale-105 shadow-lg ring-2 ring-brand"
                      : isPlaced
                      ? "border-dashed border-slate-200 bg-slate-50/50 opacity-40 cursor-not-allowed"
                      : "border-slate-200 bg-white shadow-sm hover:border-brand cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                  }`}
                >
                  <div className="grid grid-cols-3 gap-1">
                    {shape.coords.map(([r, c], i) => (
                      <span
                        key={i}
                        className="h-4 w-4 rounded-sm shadow-sm"
                        style={{ backgroundColor: shape.color }}
                      />
                    ))}
                  </div>
                  <span className="mt-1 text-[10px] font-bold text-slate-500">
                    {isPlaced ? "In Grid" : "Drag to board"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
