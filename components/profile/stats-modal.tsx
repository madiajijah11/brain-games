"use client";

import { useState } from "react";
import { formatTime } from "@/lib/social/share-generator";

interface GamePersonalBest {
  slug: string;
  title: string;
  icon: string;
  solvedCount: number;
  fastestMs: number;
}

interface StatsModalProps {
  stats: {
    totalGames: number;
    solvedGames?: number;
    winRate: number;
    currentStreak: number;
    longestStreak: number;
    avgDurationMs: number;
    fastestDurationMs: number;
    bestByGame?: GamePersonalBest[];
  };
}

export function StatsModalButton({ stats }: StatsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-brand hover:text-brand"
      >
        📊 Personal Analytics
      </button>

      {isOpen && (
        <div className="animate-in fade-in fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm duration-200">
          <div className="flex min-h-full items-center justify-center py-2">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand">
                    PLAYER PERFORMANCE
                  </p>
                  <h2 className="text-2xl font-black">Personal Statistics</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Close statistics"
                  className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="my-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase text-slate-400">Played</span>
                  <strong className="mt-1 block text-2xl font-black text-slate-800">
                    {stats.totalGames}
                  </strong>
                  <span className="text-[11px] text-slate-400">Total sessions</span>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <span className="text-xs font-bold uppercase text-emerald-600">Win Rate</span>
                  <strong className="mt-1 block text-2xl font-black text-emerald-700">
                    {stats.winRate}%
                  </strong>
                  <span className="text-[11px] text-emerald-600/70">
                    {stats.solvedGames !== undefined
                      ? `${stats.solvedGames}/${stats.totalGames} solved`
                      : "Puzzles solved"}
                  </span>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4">
                  <span className="text-xs font-bold uppercase text-orange-600">
                    Current Streak
                  </span>
                  <strong className="mt-1 block text-2xl font-black text-orange-600">
                    {stats.currentStreak}d
                  </strong>
                  <span className="text-[11px] text-orange-500/70">
                    Best: {stats.longestStreak}d
                  </span>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4">
                  <span className="text-xs font-bold uppercase text-brand">Avg Solve Time</span>
                  <strong className="mt-1 block text-2xl font-black text-brand">
                    {stats.avgDurationMs > 0 ? formatTime(stats.avgDurationMs) : "—"}
                  </strong>
                  <span className="text-[11px] text-violet-500/70">
                    Fastest:{" "}
                    {stats.fastestDurationMs > 0 ? formatTime(stats.fastestDurationMs) : "—"}
                  </span>
                </div>
              </div>

              {stats.bestByGame && stats.bestByGame.length > 0 && (
                <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Personal Bests by Puzzle
                  </p>
                  <div className="space-y-1.5">
                    {stats.bestByGame.map((item) => (
                      <div
                        key={item.slug}
                        className="flex items-center justify-between text-xs font-semibold text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span>{item.title}</span>
                          <span className="text-[11px] text-slate-400">({item.solvedCount}×)</span>
                        </span>
                        <span className="font-mono font-bold text-brand">
                          {item.fastestMs > 0 ? formatTime(item.fastestMs) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-soft"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
