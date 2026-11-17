export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GAME_CATALOG } from "@/lib/puzzles/types";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";
import { computeLongestUtcStreak, computeWinRate } from "@/lib/puzzles/analytics";
import { levelForXp } from "@/lib/games";
import { ProgressRing } from "@/components/shared/progress-ring";
import { StatsModalButton } from "@/components/profile/stats-modal";
import { ArchiveDrawerButton } from "@/components/games/archive-drawer";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);

  const [
    user,
    sessions,
    topUsersCount,
    completions,
    sessionAgg,
    solvedGamesCount,
    allCompletionDays,
    groupedByGame,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.gameSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.user.count({ where: { competitiveXp: { gt: 0 } } }),
    prisma.dailyGameCompletion.findMany({
      where: {
        userId: session.user.id,
        dateKey: today,
      },
    }),
    prisma.gameSession.aggregate({
      where: { userId: session.user.id },
      _count: true,
      _avg: { durationMs: true },
      _min: { durationMs: true },
    }),
    prisma.gameSession.count({
      where: {
        userId: session.user.id,
        score: { gte: 100 },
      },
    }),
    prisma.dailyGameCompletion.findMany({
      where: { userId: session.user.id },
      select: { dateKey: true },
      distinct: ["dateKey"],
    }),
    prisma.gameSession.groupBy({
      by: ["gameSlug"],
      where: {
        userId: session.user.id,
        score: { gte: 100 },
      },
      _count: true,
      _min: { durationMs: true },
    }),
  ]);

  const level = levelForXp(user.totalXp);
  const nextThreshold =
    [
      { name: "Beginner", min: 0 },
      { name: "Thinker", min: 500 },
      { name: "Strategist", min: 1500 },
      { name: "Mastermind", min: 3500 },
      { name: "Genius", min: 7000 },
    ].find((x) => x.min > user.totalXp)?.min ?? 10000;

  const completedSlugSet = new Set(completions.map((c) => c.gameSlug));

  const totalGamesCount = sessionAgg._count;
  const avgDurationMs = sessionAgg._avg.durationMs ? Math.round(sessionAgg._avg.durationMs) : 0;
  const fastestDurationMs = sessionAgg._min.durationMs ?? 0;
  const computedLongest = computeLongestUtcStreak(allCompletionDays.map((d) => d.dateKey));

  const bestByGame = groupedByGame
    .map((entry) => {
      const meta = GAME_CATALOG.find((g) => g.slug === entry.gameSlug);
      return {
        slug: entry.gameSlug,
        title: meta?.title || entry.gameSlug,
        icon: meta?.icon || "◆",
        solvedCount: entry._count,
        fastestMs: entry._min.durationMs ?? 0,
      };
    })
    .sort((a, b) => b.solvedCount - a.solvedCount);

  const statsPayload = {
    totalGames: totalGamesCount,
    solvedGames: solvedGamesCount,
    winRate: computeWinRate(solvedGamesCount, totalGamesCount),
    currentStreak: user.streak,
    longestStreak: Math.max(user.streak, computedLongest),
    avgDurationMs,
    fastestDurationMs,
    bestByGame,
  };

  return (
    <div className="space-y-8">
      {/* Header Profile Greeting & Action Buttons */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-brand">
            YOUR BRAIN SPACE
          </p>
          <h1 className="mt-1 text-3xl font-black">Good to see you, {user.name.split(" ")[0]}.</h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete today&apos;s 8 editions to train all cognitive regions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatsModalButton stats={statsPayload} />
          <ArchiveDrawerButton />
          <Link
            href="/leaderboard"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-brand hover:text-brand"
          >
            Leaderboard →
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total XP",
            value: user.totalXp.toLocaleString(),
            sub: "Lifetime progress",
            color: "text-brand",
          },
          {
            label: "Current Level",
            value: level.name,
            sub: `${Math.max(0, nextThreshold - user.totalXp)} XP to next tier`,
            color: "text-slate-900",
          },
          {
            label: "Day Streak",
            value: `${user.streak} days`,
            sub: "Keep your habit alive",
            color: "text-orange-600",
          },
          {
            label: "Today's Solved",
            value: `${completions.length} / 8`,
            sub: "Editions completed today",
            color: "text-emerald-600",
            ring: true,
          },
        ].map((s) => (
          <div key={s.label} className="relative rounded-2xl bg-white p-5 shadow-soft">
            {s.ring && (
              <div className="absolute right-4 top-4">
                <ProgressRing completed={completions.length} total={8} size={36} />
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
            <p className={`mt-2 text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* 8-Game LinkedIn-Style Daily Edition Grid */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black">Daily Puzzle Suite</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Prep your mind and compare results. 1 official scored edition per day.
            </p>
          </div>
          <span className="hidden text-xs font-bold text-emerald-600 sm:inline">
            ✓ 100 XP per solved edition
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_CATALOG.map((g) => {
            const edition = getDailyEdition(g.slug);
            const isCompletedToday = completedSlugSet.has(g.slug);

            return (
              <Link
                key={g.slug}
                href={`/games/${g.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl text-xl font-black ${g.accentColor}`}
                    >
                      {g.icon}
                    </span>
                    {isCompletedToday ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700">
                        ✓ Solved
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                        #{edition.issueNumber}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-black text-slate-900 transition group-hover:text-brand">
                    {g.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-bold text-slate-400">{g.subtitle}</p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {g.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="font-medium text-slate-400">{g.estimatedMinutes}</span>
                  <span
                    className={`font-bold transition group-hover:translate-x-1 ${
                      isCompletedToday ? "text-slate-500" : "text-brand"
                    }`}
                  >
                    {isCompletedToday ? "Practice →" : "Play now →"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Progress & Milestone Overview */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-2xl bg-[#1D2140] p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-200">
            DAILY STREAK BONUS
          </p>
          <h2 className="mt-2 text-2xl font-black">Build a lasting cognitive habit</h2>
          <p className="mt-2 max-w-md text-sm text-violet-100/70">
            {completions.length >= 8
              ? "Incredible work! You have cleared all 8 puzzle editions for today. Come back tomorrow for new challenges."
              : `You have solved ${completions.length} of 8 daily editions today. Clear them all to maximize your competitive rank.`}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <p className="text-sm font-bold">Level Progression</p>
          <p className="mt-3 text-3xl font-black">
            {Math.min(100, Math.round((user.totalXp / nextThreshold) * 100))}%
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand"
              style={{
                width: `${Math.min(100, (user.totalXp / nextThreshold) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Current Tier: <strong className="text-slate-800">{level.name}</strong>
          </p>
          <p className="mt-4 text-xs text-slate-400">
            {topUsersCount} players actively ranked on leaderboard
          </p>
        </div>
      </section>

      {/* Recent Activity Feed */}
      <section className="rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="font-black">Recent Activity</h2>
        {sessions.length ? (
          <div className="mt-4 divide-y divide-slate-100">
            {sessions.map((s) => {
              const gameMatch = GAME_CATALOG.find((g) => g.slug === s.gameSlug);
              return (
                <div key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {gameMatch?.title || s.gameSlug}
                    </span>
                    {s.issueNumber && (
                      <span className="text-xs font-semibold text-slate-400">#{s.issueNumber}</span>
                    )}
                    {s.mode === "practice" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        Practice
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-slate-500">
                    +{s.xpEarned} XP · {(s.durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No games played yet. Pick a puzzle edition above to begin!
          </p>
        )}
      </section>
    </div>
  );
}
