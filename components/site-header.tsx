import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgressRing } from "@/components/shared/progress-ring";

export async function SiteHeader() {
  const session = await auth();

  let todayCompletedCount = 0;
  if (session?.user?.id) {
    const today = new Date().toISOString().slice(0, 10);
    todayCompletedCount = await prisma.dailyGameCompletion.count({
      where: {
        userId: session.user.id,
        dateKey: today,
      },
    });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-black tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-soft">
            B
          </span>
          <span>
            brain<span className="text-brand">games</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
          <Link href="/dashboard" className="hover:text-brand">
            Puzzles
          </Link>
          <Link href="/leaderboard" className="hover:text-brand">
            Leaderboard
          </Link>

          {/* Daily 8/8 Progress Ring Tracker */}
          {session?.user && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <ProgressRing completed={todayCompletedCount} total={8} size={32} />
              <span className="hidden text-xs font-bold text-slate-500 sm:inline">
                {todayCompletedCount}/8 Solved
              </span>
            </div>
          )}

          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-full bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200">
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand px-4 py-2 text-white shadow-soft"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
