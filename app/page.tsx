import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GAME_CATALOG } from "@/lib/puzzles/types";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();
  const sampleEdition = getDailyEdition("queens");

  let solvedSlugs = new Set<string>();
  if (session?.user?.id) {
    try {
      const completions = await prisma.dailyGameCompletion.findMany({
        where: {
          userId: session.user.id,
          dateKey: sampleEdition.dateKey,
        },
        select: { gameSlug: true },
      });
      solvedSlugs = new Set(completions.map((c) => c.gameSlug));
    } catch {
      // Safe fallback if DB is unreachable during static render
    }
  }

  const featuredGames = GAME_CATALOG.slice(0, 4);

  return (
    <div className="space-y-14 pb-8">
      {/* Hero Section */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-brand">
            <span>Daily Puzzle Suite</span>
            <span className="text-violet-400">•</span>
            <span>Edition #{sampleEdition.issueNumber}</span>
          </div>

          <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            Eight sharp puzzles.
            <br />
            <span className="text-brand">One daily habit.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            Play Queens, Tango, Mini Sudoku, Zip, Crossclimb, Pinpoint, Patches, and Wend—synced
            globally every day. Jump straight in as a guest or sign in to track streaks, speed
            percentiles, and challenge friends.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={session?.user?.id ? "/dashboard" : "/games/queens"}
              className="rounded-xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-soft transition hover:brightness-105 sm:text-base"
            >
              {session?.user?.id ? "Open your daily hub →" : "Play today's Queens →"}
            </Link>
            {!session?.user?.id && (
              <Link
                href="/register"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-brand hover:text-brand sm:text-base"
              >
                Save streaks free
              </Link>
            )}
            <Link
              href="/leaderboard"
              className="rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:text-base"
            >
              Leaderboard
            </Link>
          </div>

          <p className="mt-5 text-xs font-semibold text-slate-400">
            Logic · Spatial · Numerical · Verbal · Speed · 100% Free
          </p>
        </div>

        {/* Right Interactive Featured Daily Stack */}
        <div className="rounded-[2rem] bg-[#1D2140] p-6 text-white shadow-soft sm:p-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-violet-200">
              TODAY&apos;S FEATURED MIX
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-violet-100">
              #{sampleEdition.issueNumber} · Featured 4 of 8
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {featuredGames.map((g, i) => {
              const isSolved = solvedSlugs.has(g.slug);
              return (
                <Link
                  key={g.slug}
                  href={`/games/${g.slug}`}
                  className="group flex items-center gap-4 rounded-2xl bg-white/10 p-3.5 transition hover:bg-white/15"
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl font-black ${
                      i === 0
                        ? "bg-violet-400 text-slate-900"
                        : i === 1
                          ? "bg-amber-300 text-slate-900"
                          : i === 2
                            ? "bg-emerald-400 text-slate-900"
                            : "bg-sky-400 text-slate-900"
                    }`}
                  >
                    {g.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white">{g.title}</p>
                      {isSolved && (
                        <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                          ✓ Solved
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-violet-100/75">{g.subtitle}</p>
                  </div>
                  <span className="ml-auto text-lg text-violet-200 transition group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-violet-100/80">
            <span>Beat a friend&apos;s solve time with Challenge Links</span>
            <span className="font-bold text-amber-300">⚔️ 1-Click</span>
          </div>
        </div>
      </section>

      {/* Full 8-Game Daily Suite Grid */}
      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-brand">
              PLAY INSTANTLY — NO LOGIN REQUIRED
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
              All 8 Daily Brain Games
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            New global edition every day at 00:00 UTC
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_CATALOG.map((g) => {
            const edition = getDailyEdition(g.slug);
            const isSolved = solvedSlugs.has(g.slug);

            return (
              <Link
                key={g.slug}
                href={`/games/${g.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl border text-xl font-black ${g.accentColor}`}
                    >
                      {g.icon}
                    </span>
                    {isSolved ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
                        ✓ Solved
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                        #{edition.issueNumber}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {g.category}
                  </p>
                  <h3 className="mt-0.5 text-lg font-black text-slate-900 transition group-hover:text-brand">
                    {g.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{g.description}</p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="font-medium text-slate-400">{g.estimatedMinutes}</span>
                  <span className="font-bold text-brand transition group-hover:translate-x-1">
                    {isSolved ? "Practice →" : "Play now →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Value Pillars */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            badge: "TACTILE MECHANICS",
            title: "Built for fast solving",
            body: "Drag-to-X in Queens, continuous ribbon paths in Zip, pencil notes in Mini Sudoku, and swipe-to-weave in Wend.",
          },
          {
            badge: "SPEED & CHALLENGES",
            title: "Compare & challenge friends",
            body: "See how your solve time ranks against today's players and send a 1-click Challenge Link for friends to beat your clock.",
          },
          {
            badge: "ARCHIVE & HABITS",
            title: "Never miss a streak",
            body: "One official ranked run per edition each UTC day keeps leaderboards fair, with past editions open in Practice Mode.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-brand">
              {item.badge}
            </p>
            <h3 className="mt-2 text-base font-black text-slate-900">{item.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
