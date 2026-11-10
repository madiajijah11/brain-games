"use client";

import { useState, useCallback } from "react";
import { WendPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateWend } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";

export function WendBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: WendPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const [currentWord, setCurrentWord] = useState<string>("");
  const [selectedCoords, setSelectedCoords] = useState<[number, number][]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (isSolved) return;

      const char = puzzle.grid[r]?.[c];
      if (!char) return;

      // Check if tapping adjacent cell
      if (selectedCoords.length === 0) {
        setSelectedCoords([[r, c]]);
        setCurrentWord(char);
        return;
      }

      const [lastR, lastC] = selectedCoords[selectedCoords.length - 1];
      // Backtrack
      if (lastR === r && lastC === c) {
        setSelectedCoords((prev) => prev.slice(0, -1));
        setCurrentWord((prev) => prev.slice(0, -1));
        return;
      }

      // Check adjacency (8-directional)
      const dR = Math.abs(lastR - r);
      const dC = Math.abs(lastC - c);
      const isAlreadySelected = selectedCoords.some(([sr, sc]) => sr === r && sc === c);

      if (dR <= 1 && dC <= 1 && !isAlreadySelected) {
        setSelectedCoords((prev) => [...prev, [r, c]]);
        setCurrentWord((prev) => prev + char);
      }
    },
    [isSolved, puzzle.grid, selectedCoords]
  );

  const handleSubmitWord = useCallback(() => {
    if (!currentWord || isSolved) return;

    const wordUpper = currentWord.toUpperCase();
    const isTarget = puzzle.targetWords.some((w) => w.toUpperCase() === wordUpper);

    if (isTarget && !foundWords.includes(wordUpper)) {
      const nextFound = [...foundWords, wordUpper];
      setFoundWords(nextFound);
      setMessage(`Found "${wordUpper}"!`);

      if (validateWend(puzzle, nextFound)) {
        setIsSolved(true);
      }
    } else if (foundWords.includes(wordUpper)) {
      setMessage(`"${wordUpper}" was already found.`);
    } else {
      setMessage(`"${wordUpper}" is not in the puzzle's word bank.`);
    }

    setCurrentWord("");
    setSelectedCoords([]);
  }, [currentWord, isSolved, puzzle, foundWords]);

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
    [issueNumber, initialMode, foundWords]
  );

  return (
    <PuzzleShell
      slug="wend"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-xs font-bold text-slate-500">
            Weave through adjacent letters to discover words. Find at least {puzzle.minWordsToWin} words to solve.
          </div>

          {/* Active Word Display */}
          <div className="mb-4 flex h-11 w-full max-w-xs items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4">
            <span className="font-mono text-lg font-black tracking-widest text-brand">
              {currentWord || "…"}
            </span>
            <div className="flex gap-1">
              <button
                disabled={!currentWord}
                onClick={handleSubmitWord}
                className="rounded-lg bg-brand px-3 py-1 text-xs font-bold text-white shadow-sm disabled:opacity-40"
              >
                Submit
              </button>
              <button
                disabled={!currentWord}
                onClick={() => {
                  setCurrentWord("");
                  setSelectedCoords([]);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 4x4 Letter Grid */}
          <div
            className="grid grid-cols-4 gap-2 rounded-2xl border-2 border-slate-700 bg-slate-800 p-3 shadow-lg select-none"
            style={{ width: "min(100%, 320px)", aspectRatio: "1/1" }}
          >
            {puzzle.grid.map((row, r) =>
              row.map((char, c) => {
                const isSelected = selectedCoords.some(([sr, sc]) => sr === r && sc === c);

                return (
                  <button
                    key={`${r}-${c}`}
                    disabled={isSolved}
                    onClick={() => handleCellClick(r, c)}
                    className={`flex items-center justify-center rounded-xl text-xl font-black transition-all ${
                      isSelected
                        ? "bg-brand text-white shadow-md scale-95"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {char}
                  </button>
                );
              })
            )}
          </div>

          {message && (
            <p className="mt-3 text-xs font-bold text-slate-600">{message}</p>
          )}

          {/* Words Found Pill List */}
          <div className="mt-6 flex flex-wrap justify-center gap-1.5 text-xs">
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
