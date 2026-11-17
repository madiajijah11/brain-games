"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { ZipPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateZip } from "@/lib/puzzles/evaluators";
import { hasWallBetween } from "@/lib/puzzles/geometry";
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
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [nudge, setNudge] = useState<string>("");
  const boardRef = useRef<HTMLDivElement | null>(null);

  const totalCells = puzzle.width * puzzle.height;
  const mustFillAll = puzzle.requireFullGrid ?? puzzle.solutionPath.length === totalCells;

  const sortedNodes = useMemo(
    () => [...puzzle.nodes].sort((a, b) => a.num - b.num),
    [puzzle.nodes],
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of sortedNodes) {
      map.set(`${n.r},${n.c}`, n.num);
    }
    return map;
  }, [sortedNodes]);

  const nextCheckpointNum = useMemo(() => {
    let idx = 0;
    for (const [r, c] of path) {
      const n = nodeMap.get(`${r},${c}`);
      if (n !== undefined && sortedNodes[idx] && n === sortedNodes[idx].num) {
        idx++;
      }
    }
    return sortedNodes[idx]?.num ?? null;
  }, [path, nodeMap, sortedNodes]);

  const resolveCellCoord = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
        return null;
      }

      const c = Math.min(
        puzzle.width - 1,
        Math.max(0, Math.floor((relX / rect.width) * puzzle.width)),
      );
      const r = Math.min(
        puzzle.height - 1,
        Math.max(0, Math.floor((relY / rect.height) * puzzle.height)),
      );
      return [r, c];
    },
    [puzzle.width, puzzle.height],
  );

  const handleCellEnter = useCallback(
    (r: number, c: number) => {
      if (isSolved) return;

      setPath((prev) => {
        if (prev.length === 0) {
          const startNode = sortedNodes[0];
          if (startNode && startNode.r === r && startNode.c === c) {
            soundFx.playStep(1);
            setNudge("");
            return [[r, c]];
          }
          setNudge("Start your path from checkpoint #1.");
          return prev;
        }

        const [lastR, lastC] = prev[prev.length - 1];
        if (lastR === r && lastC === c) return prev;

        const existingIdx = prev.findIndex(([pr, pc]) => pr === r && pc === c);
        if (existingIdx !== -1) {
          soundFx.playTap();
          setNudge("");
          return prev.slice(0, existingIdx + 1);
        }

        const dist = Math.abs(lastR - r) + Math.abs(lastC - c);
        if (dist !== 1) return prev;

        if (hasWallBetween(puzzle.walls, lastR, lastC, r, c)) {
          soundFx.playError();
          setNudge("Blocked by a barrier wall!");
          return prev;
        }

        const targetNodeNum = nodeMap.get(`${r},${c}`);
        if (targetNodeNum !== undefined && targetNodeNum !== nextCheckpointNum) {
          soundFx.playError();
          setNudge(
            nextCheckpointNum
              ? `Visit checkpoint #${nextCheckpointNum} before #${targetNodeNum}.`
              : "All checkpoints visited—fill remaining squares!",
          );
          return prev;
        }

        const next = [...prev, [r, c] as [number, number]];
        setNudge("");
        soundFx.playStep((next.length % 8) + 1);

        if (validateZip(puzzle, next)) {
          setIsSolved(true);
        } else if (
          mustFillAll &&
          targetNodeNum === sortedNodes[sortedNodes.length - 1]?.num &&
          next.length < totalCells
        ) {
          setNudge(
            `Cover all ${totalCells} cells before finishing (${next.length}/${totalCells}).`,
          );
        }

        return next;
      });
    },
    [isSolved, sortedNodes, puzzle, nodeMap, nextCheckpointNum, mustFillAll, totalCells],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isSolved) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      const coord = resolveCellCoord(e.clientX, e.clientY);
      if (coord) handleCellEnter(coord[0], coord[1]);
    },
    [isSolved, resolveCellCoord, handleCellEnter],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || isSolved) return;
      const coord = resolveCellCoord(e.clientX, e.clientY);
      if (coord) handleCellEnter(coord[0], coord[1]);
    },
    [isDragging, isSolved, resolveCellCoord, handleCellEnter],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleHint = useCallback(() => {
    if (isSolved) return;
    let matchLen = 0;
    while (
      matchLen < path.length &&
      matchLen < puzzle.solutionPath.length &&
      path[matchLen][0] === puzzle.solutionPath[matchLen][0] &&
      path[matchLen][1] === puzzle.solutionPath[matchLen][1]
    ) {
      matchLen++;
    }
    const targetLen = Math.min(puzzle.solutionPath.length, Math.max(2, matchLen + 2));
    const hintedPath = puzzle.solutionPath.slice(0, targetLen);
    setPath(hintedPath);
    setHintsUsed((n) => n + 1);
    setNudge("");
    soundFx.playStep(4);
    if (validateZip(puzzle, hintedPath)) {
      setIsSolved(true);
    }
  }, [isSolved, path, puzzle]);

  const handleUndo = useCallback(() => {
    if (isSolved || path.length === 0) return;
    setPath((prev) => prev.slice(0, -1));
    setNudge("");
  }, [isSolved, path.length]);

  const handleReset = useCallback(() => {
    setPath([]);
    setIsSolved(false);
    setNudge("");
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
    [issueNumber, initialMode, path],
  );

  const visitedSet = useMemo(() => new Set(path.map(([r, c]) => `${r},${c}`)), [path]);

  const svgPoints = path
    .map(([r, c]) => {
      const x = ((c + 0.5) / puzzle.width) * 100;
      const y = ((r + 0.5) / puzzle.height) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const headCoord = path.length > 0 ? path[path.length - 1] : null;

  return (
    <PuzzleShell
      slug="zip"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onUndo={handleUndo}
      canUndo={path.length > 0}
      onReset={handleReset}
      onHint={handleHint}
      hintsUsed={hintsUsed}
      solveSummary={`${puzzle.width}×${puzzle.height} full path`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex touch-none select-none flex-col items-center">
          <div className="mb-4 flex w-full max-w-[360px] items-center justify-between text-xs font-bold text-slate-500">
            <span>
              Checkpoints:{" "}
              <strong className="text-brand">
                {nextCheckpointNum ? `${nextCheckpointNum - 1}` : sortedNodes.length} /{" "}
                {sortedNodes.length}
              </strong>
            </span>
            {mustFillAll && (
              <span>
                Grid:{" "}
                <strong
                  className={path.length === totalCells ? "text-emerald-600" : "text-slate-700"}
                >
                  {path.length} / {totalCells}
                </strong>
              </span>
            )}
          </div>

          <div
            ref={boardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="relative grid cursor-crosshair touch-none overflow-hidden rounded-2xl border-[3px] border-slate-800 bg-slate-900 p-1.5 shadow-2xl"
            style={{
              gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
              width: "min(100%, 360px)",
              aspectRatio: `${puzzle.width}/${puzzle.height}`,
            }}
          >
            {Array.from({ length: puzzle.height }).map((_, r) =>
              Array.from({ length: puzzle.width }).map((_, c) => {
                const nodeNum = nodeMap.get(`${r},${c}`);
                const isVisited = visitedSet.has(`${r},${c}`);
                const isHead = headCoord?.[0] === r && headCoord?.[1] === c;
                const isNextTarget = nodeNum !== undefined && nodeNum === nextCheckpointNum;

                const wallRight =
                  c + 1 < puzzle.width && hasWallBetween(puzzle.walls, r, c, r, c + 1);
                const wallBottom =
                  r + 1 < puzzle.height && hasWallBetween(puzzle.walls, r, c, r + 1, c);

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`relative flex items-center justify-center border border-slate-800/80 transition-colors ${
                      isVisited ? "bg-indigo-950/60" : "bg-slate-800/50"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {wallRight && (
                      <div className="pointer-events-none absolute -right-[2px] bottom-0.5 top-0.5 z-30 w-[5px] rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                    )}
                    {wallBottom && (
                      <div className="pointer-events-none absolute -bottom-[2px] left-0.5 right-0.5 z-30 h-[5px] rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                    )}

                    {nodeNum !== undefined && (
                      <span
                        className={`z-20 grid place-items-center rounded-full font-black shadow-md transition-transform ${
                          puzzle.width >= 6 ? "h-7 w-7 text-xs" : "h-8 w-8 text-sm"
                        } ${
                          isVisited
                            ? "scale-105 bg-emerald-400 text-slate-950 ring-2 ring-emerald-200"
                            : isNextTarget
                              ? "animate-pulse bg-amber-400 text-slate-950 ring-2 ring-amber-200"
                              : "bg-slate-100 text-slate-900 ring-2 ring-slate-400"
                        }`}
                      >
                        {nodeNum}
                      </span>
                    )}

                    {isHead && nodeNum === undefined && (
                      <span className="z-20 h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                    )}
                  </div>
                );
              }),
            )}

            {path.length > 1 && (
              <svg
                className="pointer-events-none absolute inset-1.5 z-10 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)]"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#818CF8"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-35"
                />
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="7.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={svgPoints}
                  fill="none"
                  stroke="#E0E7FF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {nudge ? (
            <p className="mt-3 text-xs font-bold text-amber-600">{nudge}</p>
          ) : (
            <p className="mt-3 text-center text-xs text-slate-400">
              Drag from #1 through every number in order, filling all {totalCells} squares without
              crossing amber walls.
            </p>
          )}
        </div>
      )}
    </PuzzleShell>
  );
}
