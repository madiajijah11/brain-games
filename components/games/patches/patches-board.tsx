"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { PatchesPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validatePatches } from "@/lib/puzzles/evaluators";
import { rotateCoords, Coord } from "@/lib/puzzles/geometry";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

interface PlacedInfo {
  root: [number, number];
  rotation: number;
}

export function PatchesBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: PatchesPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const [placedPositions, setPlacedPositions] = useState<Record<string, PlacedInfo>>({});
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<Record<string, PlacedInfo>[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const getRotatedShapeCoords = useCallback(
    (shapeId: string, overrideRot?: number): Coord[] => {
      const shape = puzzle.shapes.find((s) => s.id === shapeId);
      if (!shape) return [];
      const rot = overrideRot ?? rotations[shapeId] ?? 0;
      return rotateCoords(shape.coords, rot);
    },
    [puzzle.shapes, rotations],
  );

  // Derive board cells: maps `${r},${c}` -> { shapeId, color }
  const boardOccupancy = useMemo(() => {
    const map = new Map<string, { shapeId: string; color: string }>();
    for (const [shapeId, info] of Object.entries(placedPositions)) {
      const shape = puzzle.shapes.find((s) => s.id === shapeId);
      if (!shape) continue;
      const coords = rotateCoords(shape.coords, info.rotation);
      for (const [dr, dc] of coords) {
        map.set(`${info.root[0] + dr},${info.root[1] + dc}`, {
          shapeId,
          color: shape.color,
        });
      }
    }
    return map;
  }, [placedPositions, puzzle.shapes]);

  const activePreviewId = activeDragId ?? selectedShapeId;

  const ghostCells = useMemo(() => {
    if (!activePreviewId || !hoverCoord) return null;
    const shape = puzzle.shapes.find((s) => s.id === activePreviewId);
    if (!shape) return null;

    const coords = getRotatedShapeCoords(activePreviewId);
    const [rootR, rootC] = hoverCoord;
    const cells: { r: number; c: number; valid: boolean }[] = [];
    let isOverallValid = true;

    for (const [dr, dc] of coords) {
      const r = rootR + dr;
      const c = rootC + dc;
      const isInside = r >= 0 && r < puzzle.boardHeight && c >= 0 && c < puzzle.boardWidth;
      const isTarget = isInside && !!puzzle.targetMask[r]?.[c];
      const existing = boardOccupancy.get(`${r},${c}`);
      const isOccupied = existing !== undefined && existing.shapeId !== activePreviewId;
      const cellValid = isTarget && !isOccupied;

      if (!cellValid) isOverallValid = false;
      cells.push({ r, c, valid: cellValid });
    }

    return { cells, isOverallValid, color: shape.color };
  }, [activePreviewId, hoverCoord, puzzle, boardOccupancy, getRotatedShapeCoords]);

  const buildPlacedPayload = useCallback(
    (positions: Record<string, PlacedInfo>) => {
      return Object.entries(positions).map(([id, info]) => {
        const shape = puzzle.shapes.find((s) => s.id === id);
        const coords = shape ? rotateCoords(shape.coords, info.rotation) : [];
        const absoluteCoords: [number, number][] = coords.map(([dr, dc]) => [
          info.root[0] + dr,
          info.root[1] + dc,
        ]);
        return { id, placedCoords: absoluteCoords };
      });
    },
    [puzzle.shapes],
  );

  const tryPlaceShape = useCallback(
    (shapeId: string, coord: [number, number]) => {
      const coords = getRotatedShapeCoords(shapeId);
      const [rootR, rootC] = coord;

      for (const [dr, dc] of coords) {
        const r = rootR + dr;
        const c = rootC + dc;
        if (
          r < 0 ||
          r >= puzzle.boardHeight ||
          c < 0 ||
          c >= puzzle.boardWidth ||
          !puzzle.targetMask[r]?.[c]
        ) {
          soundFx.playError();
          return false;
        }
        const existing = boardOccupancy.get(`${r},${c}`);
        if (existing && existing.shapeId !== shapeId) {
          soundFx.playError();
          return false;
        }
      }

      const rot = rotations[shapeId] ?? 0;
      setHistory((h) => [...h.slice(-30), placedPositions]);
      const next = { ...placedPositions, [shapeId]: { root: coord, rotation: rot } };
      setPlacedPositions(next);
      setSelectedShapeId(null);
      soundFx.playStep(Object.keys(next).length);

      const payload = buildPlacedPayload(next);
      if (validatePatches(puzzle, payload)) {
        setIsSolved(true);
      }
      return true;
    },
    [getRotatedShapeCoords, puzzle, boardOccupancy, rotations, placedPositions, buildPlacedPayload],
  );

  const handleBoardCellClick = useCallback(
    (r: number, c: number) => {
      if (isSolved) return;
      const occupying = boardOccupancy.get(`${r},${c}`);
      if (occupying) {
        soundFx.playTap();
        setHistory((h) => [...h.slice(-30), placedPositions]);
        setPlacedPositions((prev) => {
          const next = { ...prev };
          delete next[occupying.shapeId];
          return next;
        });
        return;
      }
      if (selectedShapeId) {
        tryPlaceShape(selectedShapeId, [r, c]);
      }
    },
    [isSolved, boardOccupancy, placedPositions, selectedShapeId, tryPlaceShape],
  );

  const resolveGridCoord = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      if (!gridContainerRef.current) return null;
      const rect = gridContainerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
        return null;
      }
      const c = Math.min(
        puzzle.boardWidth - 1,
        Math.max(0, Math.floor((relX / rect.width) * puzzle.boardWidth)),
      );
      const r = Math.min(
        puzzle.boardHeight - 1,
        Math.max(0, Math.floor((relY / rect.height) * puzzle.boardHeight)),
      );
      return [r, c];
    },
    [puzzle.boardWidth, puzzle.boardHeight],
  );

  const handlePiecePointerDown = useCallback(
    (shapeId: string, e: React.PointerEvent) => {
      if (isSolved) return;
      if ((e.target as HTMLElement).closest("[data-rotate-btn]")) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      soundFx.playTap();
      setActiveDragId(shapeId);
      setDragPointer({ x: e.clientX, y: e.clientY });
      dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
      setHoverCoord(null);
    },
    [isSolved],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDragId) return;
      if (dragStartRef.current) {
        const dx = Math.abs(e.clientX - dragStartRef.current.x);
        const dy = Math.abs(e.clientY - dragStartRef.current.y);
        if (dx > 6 || dy > 6) dragStartRef.current.moved = true;
      }
      setDragPointer({ x: e.clientX, y: e.clientY });
      setHoverCoord(resolveGridCoord(e.clientX, e.clientY));
    },
    [activeDragId, resolveGridCoord],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDragId) return;
      const moved = dragStartRef.current?.moved ?? false;
      const coord = resolveGridCoord(e.clientX, e.clientY);

      if (coord) {
        tryPlaceShape(activeDragId, coord);
      } else if (!moved) {
        // Quick tap on dock piece toggles click-to-place selection
        setSelectedShapeId((prev) => (prev === activeDragId ? null : activeDragId));
      }

      setActiveDragId(null);
      setDragPointer(null);
      setHoverCoord(null);
      dragStartRef.current = null;
    },
    [activeDragId, resolveGridCoord, tryPlaceShape],
  );

  const handleRotateShape = useCallback(
    (shapeId: string) => {
      if (isSolved) return;
      soundFx.playTap();
      setRotations((prev) => ({
        ...prev,
        [shapeId]: ((prev[shapeId] ?? 0) + 1) % 4,
      }));
    },
    [isSolved],
  );

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setPlacedPositions(last);
      return prev.slice(0, -1);
    });
  }, []);

  const handleReset = useCallback(() => {
    setHistory((h) => [...h.slice(-30), placedPositions]);
    setPlacedPositions({});
    setSelectedShapeId(null);
    setIsSolved(false);
  }, [placedPositions]);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const placedArray = buildPlacedPayload(placedPositions);
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
    [buildPlacedPayload, placedPositions, issueNumber, initialMode],
  );

  const draggedShape = activeDragId ? puzzle.shapes.find((s) => s.id === activeDragId) : null;
  const draggedCoords = activeDragId ? getRotatedShapeCoords(activeDragId) : [];

  return (
    <PuzzleShell
      slug="patches"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onUndo={handleUndo}
      canUndo={history.length > 0}
      onReset={handleReset}
      solveSummary={`${puzzle.shapes.length} pieces fitted`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex touch-none select-none flex-col items-center"
        >
          <div className="mb-4 text-center text-xs font-bold text-slate-500">
            Drag a piece onto the board (or tap piece → tap cell). Tap placed pieces to remove.
          </div>

          {/* Target Board Grid */}
          <div
            ref={gridContainerRef}
            onPointerLeave={() => {
              if (!activeDragId) setHoverCoord(null);
            }}
            className="relative grid gap-1 rounded-2xl border-2 border-slate-300 bg-slate-200/70 p-2.5 shadow-inner"
            style={{
              gridTemplateColumns: `repeat(${puzzle.boardWidth}, minmax(0, 1fr))`,
              width: "min(100%, 320px)",
              aspectRatio: `${puzzle.boardWidth}/${puzzle.boardHeight}`,
            }}
          >
            {puzzle.targetMask.map((row, r) =>
              row.map((isValidTarget, c) => {
                const cellKey = `${r},${c}`;
                const occupied = boardOccupancy.get(cellKey);
                const isGhost =
                  ghostCells && ghostCells.cells.some((gc) => gc.r === r && gc.c === c);
                const ghostValid = ghostCells?.isOverallValid;

                return (
                  <button
                    key={cellKey}
                    type="button"
                    disabled={!isValidTarget || isSolved}
                    onPointerEnter={() => {
                      if (selectedShapeId && !activeDragId) {
                        setHoverCoord([r, c]);
                      }
                    }}
                    onClick={() => handleBoardCellClick(r, c)}
                    className={`relative flex items-center justify-center rounded-lg border transition-all ${
                      occupied
                        ? "cursor-pointer border-black/15 shadow-sm hover:brightness-110 active:scale-95"
                        : isGhost
                          ? ghostValid
                            ? "border-emerald-400 bg-emerald-200/80 ring-2 ring-emerald-500"
                            : "border-red-400 bg-red-200/80 ring-2 ring-red-500"
                          : isValidTarget
                            ? "border-slate-300 bg-white hover:border-brand/50"
                            : "pointer-events-none border-transparent bg-transparent opacity-0"
                    }`}
                    style={{
                      aspectRatio: "1/1",
                      backgroundColor: occupied ? occupied.color : undefined,
                    }}
                    aria-label={`Board row ${r + 1} col ${c + 1}`}
                  />
                );
              }),
            )}
          </div>

          {/* Floating Drag Preview following Cursor/Finger */}
          {activeDragId && dragPointer && draggedShape && (
            <div
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80 drop-shadow-xl"
              style={{ left: dragPointer.x, top: dragPointer.y }}
            >
              <PolyominoPreview coords={draggedCoords} color={draggedShape.color} cellPx={22} />
            </div>
          )}

          {/* Shapes Dock with True Polyomino Geometry & Rotate */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {puzzle.shapes.map((shape, shapeIdx) => {
              const isPlaced = placedPositions[shape.id] !== undefined;
              const isDragging = activeDragId === shape.id;
              const isSelected = selectedShapeId === shape.id;
              const coords = getRotatedShapeCoords(shape.id);

              return (
                <div
                  key={shape.id}
                  role="button"
                  tabIndex={isPlaced ? -1 : 0}
                  aria-disabled={isPlaced}
                  aria-pressed={isSelected}
                  aria-label={`Piece ${shapeIdx + 1} (${coords.length} cells)${isPlaced ? ", placed" : isSelected ? ", selected" : ""}`}
                  onKeyDown={(e) => {
                    if (isPlaced || isSolved) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      soundFx.playTap();
                      setSelectedShapeId((prev) => (prev === shape.id ? null : shape.id));
                    } else if (e.key.toLowerCase() === "r") {
                      e.preventDefault();
                      handleRotateShape(shape.id);
                    }
                  }}
                  onPointerDown={(e) => !isPlaced && handlePiecePointerDown(shape.id, e)}
                  className={`relative flex min-w-[84px] touch-none flex-col items-center justify-between rounded-2xl border-2 p-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    isDragging
                      ? "scale-105 border-brand bg-violet-50 shadow-lg ring-2 ring-brand"
                      : isSelected
                        ? "border-brand bg-violet-50/70 shadow-md ring-2 ring-brand/40"
                        : isPlaced
                          ? "cursor-not-allowed border-dashed border-slate-200 bg-slate-50/50 opacity-35"
                          : "cursor-grab border-slate-200 bg-white shadow-sm hover:border-brand active:cursor-grabbing"
                  }`}
                >
                  {!isPlaced && (
                    <button
                      type="button"
                      data-rotate-btn="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateShape(shape.id);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="self-end rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 hover:bg-brand hover:text-white"
                      aria-label={`Rotate piece ${shapeIdx + 1} 90 degrees`}
                      title="Rotate 90°"
                    >
                      ↻
                    </button>
                  )}
                  <div className="my-1.5 flex min-h-[54px] items-center justify-center">
                    <PolyominoPreview coords={coords} color={shape.color} cellPx={13} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isPlaced ? "Placed" : isSelected ? "Tap grid" : "Drag / Tap"}
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

function PolyominoPreview({
  coords,
  color,
  cellPx,
}: {
  coords: Coord[];
  color: string;
  cellPx: number;
}) {
  let maxR = 0;
  let maxC = 0;
  const set = new Set<string>();
  for (const [r, c] of coords) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
    set.add(`${r},${c}`);
  }
  const rows = maxR + 1;
  const cols = maxC + 1;

  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${cols}, ${cellPx}px)` }}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const filled = set.has(`${r},${c}`);
          return (
            <span
              key={`${r}-${c}`}
              className={filled ? "shadow-xs rounded-[3px]" : "opacity-0"}
              style={{
                width: cellPx,
                height: cellPx,
                backgroundColor: filled ? color : "transparent",
              }}
            />
          );
        }),
      )}
    </div>
  );
}
