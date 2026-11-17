"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { CrossclimbPuzzle, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { validateCrossclimb } from "@/lib/puzzles/evaluators";
import { PuzzleShell } from "@/components/games/shared/puzzle-shell";
import { soundFx } from "@/lib/audio/sound-fx";

function isOneLetterApart(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs++;
  }
  return diffs === 1;
}

interface MiddleItem {
  originalIndex: number;
  clue: string;
  targetWord: string;
  guess: string;
  solved: boolean;
}

export function CrossclimbBoard({
  puzzle,
  issueNumber,
  initialMode = "daily",
}: {
  puzzle: CrossclimbPuzzle;
  issueNumber: number;
  initialMode?: "daily" | "practice";
}) {
  const N = puzzle.rungs.length;
  const wordLen = puzzle.rungs[0]?.word.length ?? 4;

  // Middle rungs (indices 1..N-2) start scrambled & blank to guess from clues
  const [middleRungs, setMiddleRungs] = useState<MiddleItem[]>(() => {
    const mids = puzzle.rungs.slice(1, N - 1).map((r, i) => ({
      originalIndex: i + 1,
      clue: r.clue,
      targetWord: r.word.toUpperCase(),
      guess: "",
      solved: false,
    }));
    // Deterministic scramble based on issueNumber so SSR & client match cleanly
    return mids
      .map((m, i) => ({ m, key: (i * 7 + issueNumber) % 13 }))
      .sort((a, b) => a.key - b.key)
      .map((x) => x.m);
  });

  const [topGuess, setTopGuess] = useState<string>("");
  const [bottomGuess, setBottomGuess] = useState<string>("");
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allMiddleSolved = useMemo(() => middleRungs.every((m) => m.solved), [middleRungs]);

  // Check if middle rungs form a valid 1-letter-apart chain
  const middleChainValid = useMemo(() => {
    if (!allMiddleSolved) return false;
    for (let i = 0; i < middleRungs.length - 1; i++) {
      if (!isOneLetterApart(middleRungs[i].targetWord, middleRungs[i + 1].targetWord)) {
        return false;
      }
    }
    return true;
  }, [allMiddleSolved, middleRungs]);

  const topRung = puzzle.rungs[0];
  const bottomRung = puzzle.rungs[N - 1];

  const checkFinalVictory = useCallback(
    (topVal: string, bottomVal: string, mids: MiddleItem[]) => {
      if (!mids.every((m) => m.solved)) return;
      const candidate = [
        topVal.toUpperCase(),
        ...mids.map((m) => m.targetWord),
        bottomVal.toUpperCase(),
      ];
      if (validateCrossclimb(puzzle, candidate)) {
        setIsSolved(true);
      }
    },
    [puzzle],
  );

  const handleMiddleGuessChange = useCallback(
    (idx: number, raw: string) => {
      if (isSolved) return;
      const clean = raw
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase()
        .slice(0, wordLen);
      setMiddleRungs((prev) =>
        prev.map((item, i) => {
          if (i !== idx || item.solved) return item;
          const matched = clean === item.targetWord;
          if (matched) {
            soundFx.playStep(3);
          } else {
            soundFx.playTap();
          }
          return { ...item, guess: clean, solved: matched };
        }),
      );
    },
    [isSolved, wordLen],
  );

  const moveMiddleRung = useCallback(
    (idx: number, dir: -1 | 1) => {
      if (isSolved) return;
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= middleRungs.length) return;
      soundFx.playTap();
      setMiddleRungs((prev) => {
        const next = [...prev];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        checkFinalVictory(topGuess, bottomGuess, next);
        return next;
      });
    },
    [isSolved, middleRungs.length, topGuess, bottomGuess, checkFinalVictory],
  );

  const handleEndGuessChange = useCallback(
    (which: "top" | "bottom", raw: string) => {
      if (isSolved || !middleChainValid) return;
      const clean = raw
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase()
        .slice(0, wordLen);
      soundFx.playTap();
      if (which === "top") {
        setTopGuess(clean);
        checkFinalVictory(clean, bottomGuess, middleRungs);
      } else {
        setBottomGuess(clean);
        checkFinalVictory(topGuess, clean, middleRungs);
      }
    },
    [isSolved, middleChainValid, wordLen, bottomGuess, topGuess, middleRungs, checkFinalVictory],
  );

  const handleHint = useCallback(() => {
    if (isSolved) return;
    // Reveal one unguessed rung's word (prefer first unsolved middle rung, else top/bottom)
    const unsolvedIdx = middleRungs.findIndex((m) => !m.solved);
    if (unsolvedIdx !== -1) {
      soundFx.playStep(4);
      setHintsUsed((n) => n + 1);
      setMiddleRungs((prev) =>
        prev.map((m, i) => (i === unsolvedIdx ? { ...m, guess: m.targetWord, solved: true } : m)),
      );
      return;
    }

    if (middleChainValid) {
      if (topGuess !== topRung.word.toUpperCase() && topGuess !== bottomRung.word.toUpperCase()) {
        // Pick whichever end connects to middleRungs[0]
        const firstMid = middleRungs[0].targetWord;
        const matchWord = isOneLetterApart(topRung.word.toUpperCase(), firstMid)
          ? topRung.word.toUpperCase()
          : bottomRung.word.toUpperCase();
        setTopGuess(matchWord);
        setHintsUsed((n) => n + 1);
        soundFx.playStep(4);
        checkFinalVictory(matchWord, bottomGuess, middleRungs);
        return;
      }
      const lastMid = middleRungs[middleRungs.length - 1].targetWord;
      const matchWord = isOneLetterApart(bottomRung.word.toUpperCase(), lastMid)
        ? bottomRung.word.toUpperCase()
        : topRung.word.toUpperCase();
      setBottomGuess(matchWord);
      setHintsUsed((n) => n + 1);
      soundFx.playStep(5);
      checkFinalVictory(topGuess, matchWord, middleRungs);
    }
  }, [
    isSolved,
    middleRungs,
    middleChainValid,
    topGuess,
    bottomGuess,
    topRung,
    bottomRung,
    checkFinalVictory,
  ]);

  const handleReset = useCallback(() => {
    setMiddleRungs((prev) => prev.map((m) => ({ ...m, guess: "", solved: false })));
    setTopGuess("");
    setBottomGuess("");
    setIsSolved(false);
  }, []);

  const submitSolution = useCallback(
    async (durationMs: number): Promise<PuzzleSubmissionResult | null> => {
      const finalWords = [
        topGuess.toUpperCase(),
        ...middleRungs.map((m) => m.targetWord),
        bottomGuess.toUpperCase(),
      ];
      const res = await fetch("/api/puzzles/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "crossclimb",
          issueNumber,
          durationMs,
          mode: initialMode,
          solution: finalWords,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      return data;
    },
    [topGuess, bottomGuess, middleRungs, issueNumber, initialMode],
  );

  // Determine which end clue matches top vs bottom once middle chain is ordered
  const firstMidWord = middleRungs[0]?.targetWord ?? "";
  const topUsesRung0 =
    !middleChainValid || isOneLetterApart(topRung.word.toUpperCase(), firstMidWord);
  const activeTopClue = topUsesRung0 ? topRung.clue : bottomRung.clue;
  const activeBottomClue = topUsesRung0 ? bottomRung.clue : topRung.clue;

  return (
    <PuzzleShell
      slug="crossclimb"
      issueNumber={issueNumber}
      initialMode={initialMode}
      onReset={handleReset}
      onHint={handleHint}
      hintsUsed={hintsUsed}
      solveSummary={`${N}-rung ladder unlocked`}
      onSubmit={submitSolution}
      isComplete={isSolved}
    >
      {() => (
        <div className="flex flex-col items-center">
          <div className="mb-4 text-center text-xs font-bold text-slate-500">
            {!allMiddleSolved
              ? "Step 1: Solve the middle clues, then order them 1 letter apart."
              : !middleChainValid
                ? "Step 2: Use ▲ / ▼ to arrange the words so each step changes by 1 letter."
                : "Final Step: Unlock the Top & Bottom rungs to complete the ladder!"}
          </div>

          {puzzle.themeHint && (
            <div className="mb-4 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
              Top + Bottom Clue: {puzzle.themeHint}
            </div>
          )}

          <div className="w-full max-w-md space-y-2">
            {/* TOP RUNG (Locked until middle chain is valid) */}
            <div
              className={`rounded-2xl border p-3.5 transition-all ${
                middleChainValid
                  ? isSolved
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-rose-200 bg-rose-50/40 shadow-sm"
                  : "border-dashed border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                  Top
                </span>
                {middleChainValid ? (
                  <input
                    type="text"
                    value={topGuess}
                    disabled={isSolved}
                    maxLength={wordLen}
                    onChange={(e) => handleEndGuessChange("top", e.target.value)}
                    placeholder={`${wordLen} letters`}
                    className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-center font-mono text-base font-black uppercase tracking-[0.25em] text-slate-900 outline-none focus:border-brand"
                  />
                ) : (
                  <span className="font-mono text-sm font-bold tracking-widest text-slate-400">
                    🔒 LOCKED
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {middleChainValid ? activeTopClue : "Complete & order middle rungs to unlock"}
              </p>
            </div>

            {/* MIDDLE RUNGS */}
            {middleRungs.map((item, idx) => {
              const prevLinkOk =
                idx > 0 &&
                item.solved &&
                middleRungs[idx - 1].solved &&
                isOneLetterApart(middleRungs[idx - 1].targetWord, item.targetWord);

              return (
                <div key={item.originalIndex}>
                  {idx > 0 && allMiddleSolved && (
                    <div className="my-1 flex justify-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                          prevLinkOk
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {prevLinkOk ? "✓ 1-letter link" : "↕ Reorder needed"}
                      </span>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl border p-3.5 transition-all ${
                      item.solved
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-slate-200 bg-white shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0 || isSolved}
                            onClick={() => moveMiddleRung(idx, -1)}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 hover:bg-brand hover:text-white disabled:opacity-30"
                            aria-label="Move rung up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === middleRungs.length - 1 || isSolved}
                            onClick={() => moveMiddleRung(idx, 1)}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-600 hover:bg-brand hover:text-white disabled:opacity-30"
                            aria-label="Move rung down"
                          >
                            ▼
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-slate-600">{item.clue}</p>
                      </div>

                      {item.solved ? (
                        <div className="flex shrink-0 items-center gap-1 font-mono text-base font-black text-emerald-800">
                          {item.targetWord.split("").map((ch, ci) => (
                            <span
                              key={ci}
                              className="grid h-8 w-7 place-items-center rounded-lg bg-emerald-200/70"
                            >
                              {ch}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <input
                          ref={(el) => {
                            inputRefs.current[`mid-${idx}`] = el;
                          }}
                          type="text"
                          value={item.guess}
                          maxLength={wordLen}
                          onChange={(e) => handleMiddleGuessChange(idx, e.target.value)}
                          placeholder={`${wordLen} letters`}
                          className="w-28 shrink-0 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-center font-mono text-sm font-black uppercase tracking-[0.2em] text-slate-900 outline-none focus:border-brand focus:bg-white"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* BOTTOM RUNG */}
            <div
              className={`rounded-2xl border p-3.5 transition-all ${
                middleChainValid
                  ? isSolved
                    ? "border-emerald-300 bg-emerald-50/70"
                    : "border-rose-200 bg-rose-50/40 shadow-sm"
                  : "border-dashed border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
                  Bottom
                </span>
                {middleChainValid ? (
                  <input
                    type="text"
                    value={bottomGuess}
                    disabled={isSolved}
                    maxLength={wordLen}
                    onChange={(e) => handleEndGuessChange("bottom", e.target.value)}
                    placeholder={`${wordLen} letters`}
                    className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-center font-mono text-base font-black uppercase tracking-[0.25em] text-slate-900 outline-none focus:border-brand"
                  />
                ) : (
                  <span className="font-mono text-sm font-bold tracking-widest text-slate-400">
                    🔒 LOCKED
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {middleChainValid ? activeBottomClue : "Complete & order middle rungs to unlock"}
              </p>
            </div>
          </div>
        </div>
      )}
    </PuzzleShell>
  );
}
