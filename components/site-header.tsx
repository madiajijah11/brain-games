import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDailyEdition } from "@/lib/puzzles/daily-engine";
import { HeaderDailyProgress } from "@/components/shared/header-daily-progress";
import { SignOutButton } from "@/components/auth/sign-out-button";

export async function SiteHeader() {
  const session = await auth();

  let todayCompletedCount = 0;
  if (session?.user?.id) {
    try {
      const { dateKey } = getDailyEdition("queens");
      todayCompletedCount = await prisma.dailyGameCompletion.count({
        where: {
          userId: session.user.id,
          dateKey,
        },
      });
    } catch {
      todayCompletedCount = 0;
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <Link
          href={session?.user ? "/dashboard" : "/"}
          prefetch={false}
          className="flex shrink-0 items-center gap-2 text-base font-black tracking-tight sm:text-lg"
          aria-label="Brain Games home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand text-white shadow-soft sm:h-9 sm:w-9">
            B
          </span>
          <span className="hidden min-[430px]:inline">
            brain<span className="text-brand">games</span>
          </span>
        </Link>

        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-600 sm:gap-4 sm:text-sm">
          <Link
            href={session?.user ? "/dashboard" : "/"}
            prefetch={false}
            className="hover:text-brand"
          >
            Puzzles
          </Link>
          <Link href="/leaderboard" className="hover:text-brand">
            Leaderboard
          </Link>

          {/* Daily 8/8 Progress Ring Tracker */}
          {session?.user && <HeaderDailyProgress initialCount={todayCompletedCount} />}

          {session?.user ? (
            <SignOutButton />
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full bg-brand px-3 py-1.5 text-white shadow-soft sm:px-4 sm:py-2"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
