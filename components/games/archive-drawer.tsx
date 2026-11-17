"use client";

import { useState } from "react";
import Link from "next/link";
import { GAME_CATALOG, GameSlug } from "@/lib/puzzles/types";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";

export function ArchiveDrawerButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSlug>("queens");

  // Generate list of the last 14 calendar dates
  const pastDates = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - idx);
    const edition = getDailyEdition(selectedGame, d);
    return {
      dateText: d.toISOString().slice(0, 10),
      issueNumber: edition.issueNumber,
      isToday: idx === 0,
    };
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-brand hover:text-brand"
      >
        📅 Historical Archive
      </button>

      {isOpen && (
        <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 duration-200">
          <div className="flex h-full w-full max-w-md flex-col justify-between overflow-y-auto bg-white p-6 shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-brand">
                    PRACTICE ARCHIVE
                  </p>
                  <h2 className="text-2xl font-black">Past Puzzle Editions</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Game Selector Pills */}
              <div className="my-5 flex flex-wrap gap-1.5">
                {GAME_CATALOG.map((g) => (
                  <button
                    key={g.slug}
                    onClick={() => setSelectedGame(g.slug)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      selectedGame === g.slug
                        ? "bg-brand text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>

              {/* List of past editions */}
              <div className="space-y-2">
                {pastDates.map((item) => (
                  <Link
                    key={item.dateText}
                    href={
                      item.isToday
                        ? `/games/${selectedGame}`
                        : `/games/${selectedGame}?issue=${item.issueNumber}&mode=practice`
                    }
                    onClick={() => setIsOpen(false)}
                    className="border-slate-150 group flex items-center justify-between rounded-xl border p-3.5 transition hover:border-brand hover:bg-violet-50/50"
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-800">
                        Edition #{item.issueNumber}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">{item.dateText}</span>
                    </div>
                    <span className="text-xs font-bold text-brand transition group-hover:translate-x-0.5">
                      {item.isToday ? "Play Today →" : "Practice →"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <p className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
              Past editions operate in unranked Practice Mode (0 XP awarded).
            </p>
          </div>
        </div>
      )}
    </>
  );
}
