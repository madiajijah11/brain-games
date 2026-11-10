"use client";

import { useState } from "react";
import { formatTime } from "@/lib/social/share-generator";

interface StatsModalProps {
  stats: {
    totalGames: number;
    winRate: number;
    currentStreak: number;
    longestStreak: number;
    avgDurationMs: number;
    fastestDurationMs: number;
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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
                className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="my-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold text-slate-400 uppercase">
                  Played
                </span>
                <strong className="mt-1 block text-2xl font-black text-slate-800">
                  {stats.totalGames}
                </strong>
                <span className="text-[11px] text-slate-400">Total sessions</span>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <span className="text-xs font-bold text-emerald-600 uppercase">
                  Win Rate
                </span>
                <strong className="mt-1 block text-2xl font-black text-emerald-700">
                  {stats.winRate}%
                </strong>
                <span className="text-[11px] text-emerald-600/70">Puzzles solved</span>
              </div>
              <div className="rounded-2xl bg-orange-50 p-4">
                <span className="text-xs font-bold text-orange-600 uppercase">
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
                <span className="text-xs font-bold text-brand uppercase">
                  Avg Solve Time
                </span>
                <strong className="mt-1 block text-2xl font-black text-brand">
                  {stats.avgDurationMs > 0 ? formatTime(stats.avgDurationMs) : "—"}
                </strong>
                <span className="text-[11px] text-violet-500/70">
                  Fastest: {stats.fastestDurationMs > 0 ? formatTime(stats.fastestDurationMs) : "—"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-soft"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
