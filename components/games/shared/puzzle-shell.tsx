"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GameSlug, GAME_CATALOG, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { formatCountdown, getMillisecondsUntilNextUTCMidnight } from "@/lib/puzzles/daily-engine";
import { AdBanner } from "@/components/ads/ad-banner";
import { useMonetag } from "@/components/ads/monetag-hook";
import { soundFx } from "@/lib/audio/sound-fx";
import { copyShareText, copyChallengeText, formatTime } from "@/lib/social/share-generator";
import { GAME_EDITORIALS } from "@/lib/puzzles/editorial";
import { usePuzzleContext } from "@/components/games/shared/puzzle-context";
import { DAILY_PROGRESS_EVENT } from "@/components/shared/header-daily-progress";

interface PuzzleShellProps {
  slug: GameSlug;
  issueNumber: number;
  initialMode?: "daily" | "practice";
  onUndo?: () => void;
  canUndo?: boolean;
  onReset?: () => void;
  onHint?: () => void;
  hintsUsed?: number;
  solveSummary?: string;
  onSubmit: (durationMs: number) => Promise<PuzzleSubmissionResult | null>;
  isComplete: boolean;
  children: (helpers: { durationMs: number; isSubmitting: boolean }) => ReactNode;
}

export function PuzzleShell({
  slug,
  issueNumber,
  initialMode = "daily",
  onUndo,
  canUndo = false,
  onReset,
  onHint,
  hintsUsed = 0,
  solveSummary,
  onSubmit,
  isComplete,
  children,
}: PuzzleShellProps) {
  const metaIndex = GAME_CATALOG.findIndex((g) => g.slug === slug);
  const meta = metaIndex >= 0 ? GAME_CATALOG[metaIndex] : undefined;
  const nextGame = GAME_CATALOG[(Math.max(0, metaIndex) + 1) % GAME_CATALOG.length];
  const editorial = GAME_EDITORIALS[slug];
  const [startTime] = useState<number>(() => performance.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<PuzzleSubmissionResult | null>(null);
  const [error, setError] = useState<string>("");
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.isMuted());
  const [copiedToast, setCopiedToast] = useState<string>("");
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const router = useRouter();
  const { challenge, playerName } = usePuzzleContext();
  const { triggerPracticeTransition } = useMonetag();

  // Monotonic timer
  useEffect(() => {
    if (isComplete || submissionResult) return;
    const interval = setInterval(() => {
      setElapsedMs(Math.round(performance.now() - startTime));
    }, 250);
    return () => clearInterval(interval);
  }, [startTime, isComplete, submissionResult]);

  // UTC countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      setTimeUntilReset(formatCountdown(getMillisecondsUntilNextUTCMidnight()));
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle victory completion trigger
  useEffect(() => {
    if (!isComplete || submissionResult) return;
    let cancelled = false;
    const finalDuration = Math.max(2000, Math.round(performance.now() - startTime));

    const timer = setTimeout(async () => {
      if (cancelled) return;
      soundFx.playVictory();
      setIsSubmitting(true);
      setError("");
      try {
        const res = await onSubmit(finalDuration);
        if (!cancelled && res) {
          setSubmissionResult(res);
          if (typeof res.todayCompletedCount === "number") {
            window.dispatchEvent(
              new CustomEvent(DAILY_PROGRESS_EVENT, {
                detail: { todayCompletedCount: res.todayCompletedCount },
              }),
            );
          }
          router.refresh();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to record puzzle completion.");
        }
      } finally {
        if (!cancelled) {
          setIsSubmitting(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isComplete, submissionResult, onSubmit, startTime, router]);

  const handleToggleSound = useCallback(() => {
    const nextMuted = soundFx.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundFx.playTap();
    }
  }, []);

  const handleShareResult = useCallback(async () => {
    soundFx.playTap();
    const res = await copyShareText({
      title: meta?.title || slug,
      slug,
      issueNumber,
      durationMs: elapsedMs,
      streak: submissionResult?.streak,
      hintsUsed,
      solveSummary,
      fasterThanPct: submissionResult?.fasterThanPct,
    });

    if (res.success) {
      setCopiedToast("Result card copied! 📋");
      setTimeout(() => setCopiedToast(""), 3000);
    } else {
      setCopiedToast("Failed to copy share card.");
      setTimeout(() => setCopiedToast(""), 3000);
    }
  }, [
    meta?.title,
    slug,
    issueNumber,
    elapsedMs,
    submissionResult?.streak,
    submissionResult?.fasterThanPct,
    hintsUsed,
    solveSummary,
  ]);

  const handleCopyChallenge = useCallback(async () => {
    soundFx.playTap();
    const res = await copyChallengeText({
      title: meta?.title || slug,
      slug,
      issueNumber,
      durationMs: elapsedMs,
      challenger: playerName,
    });

    if (res.success) {
      setCopiedToast("Challenge link copied! Send it to a friend ⚔️");
      setTimeout(() => setCopiedToast(""), 3500);
    } else {
      setCopiedToast("Failed to copy challenge link.");
      setTimeout(() => setCopiedToast(""), 3000);
    }
  }, [meta?.title, slug, issueNumber, elapsedMs, playerName]);

  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const formattedTimer = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-brand">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            Next edition in: {timeUntilReset}
          </span>
          {initialMode === "practice" && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              Practice Mode
            </span>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest text-brand">
              {meta?.category || "DAILY PUZZLE"}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-700">
              #{issueNumber}
            </span>
          </div>
          <h1 className="mt-1 text-3xl font-black">{meta?.title || slug}</h1>
          <p className="mt-1 text-sm text-slate-500">{meta?.subtitle}</p>
        </div>

        {/* Live Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* How to Play Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              soundFx.playTap();
              setShowHelp(true);
            }}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 shadow-sm hover:border-brand hover:text-brand"
            title="How to play"
            aria-label="How to play"
          >
            ?
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            title={isMuted ? "Unmute audio" : "Mute audio"}
            aria-label={isMuted ? "Unmute sound effects" : "Mute sound effects"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm font-bold text-slate-700 shadow-sm">
            ⏱ {formattedTimer}
          </div>
          {onHint && (
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                onHint();
              }}
              disabled={isComplete || isSubmitting}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-sm hover:bg-amber-100 disabled:opacity-40"
              title="Get a smart hint"
            >
              💡 Hint{hintsUsed > 0 ? ` (${hintsUsed})` : ""}
            </button>
          )}
          {onUndo && (
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                onUndo();
              }}
              disabled={!canUndo || isComplete || isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
              title="Undo last move"
            >
              ↩ Undo
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={() => {
                soundFx.playTap();
                onReset();
              }}
              disabled={isComplete || isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
              title="Reset board"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {challenge && !submissionResult && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-900">
          <span>
            ⚔️ Challenge from <strong>{challenge.challenger}</strong>: Beat{" "}
            <span className="font-mono font-black">{formatTime(challenge.targetMs)}</span> on #
            {issueNumber}
          </span>
          <span
            className={`font-mono font-black ${
              elapsedMs <= challenge.targetMs ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            Target {formatTime(challenge.targetMs)}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Interactive Board Surface */}
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-soft sm:p-8">
        {children({ durationMs: elapsedMs, isSubmitting })}
      </div>

      {/* Completion Modal */}
      {submissionResult && (
        <div className="animate-in fade-in fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm duration-200">
          <div className="flex min-h-full items-center justify-center py-2">
            <div className="w-full max-w-md rounded-3xl bg-white p-5 text-center shadow-xl sm:p-6">
              <div className="mx-auto mb-2.5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
                ✓
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-brand">
                PUZZLE #{submissionResult.issueNumber} COMPLETED
              </p>
              <h2 className="mt-1 text-2xl font-black">Well Solved!</h2>
              <p className="mt-0.5 text-sm text-slate-500">Solved in {formattedTimer}</p>

              {submissionResult.fasterThanPct !== undefined && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                  <span>⚡ Faster than {submissionResult.fasterThanPct}% of players today</span>
                  {submissionResult.todayFinishers && submissionResult.todayFinishers > 1 && (
                    <span className="text-indigo-400">
                      ({submissionResult.todayFinishers} total)
                    </span>
                  )}
                </div>
              )}

              {challenge && (
                <div
                  className={`mt-4 rounded-2xl border p-3 text-xs font-bold ${
                    elapsedMs < challenge.targetMs
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : elapsedMs === challenge.targetMs
                        ? "border-sky-200 bg-sky-50 text-sky-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {elapsedMs < challenge.targetMs
                    ? `🏆 You beat ${challenge.challenger}'s ${formatTime(challenge.targetMs)} by ${formatTime(
                        challenge.targetMs - elapsedMs,
                      )}!`
                    : elapsedMs === challenge.targetMs
                      ? `🤝 Exact tie with ${challenge.challenger} at ${formatTime(challenge.targetMs)}!`
                      : `⏱ ${challenge.challenger} finished in ${formatTime(
                          challenge.targetMs,
                        )} (${formatTime(elapsedMs - challenge.targetMs)} faster).`}
                </div>
              )}

              {/* Score / XP Grid */}
              <div className="my-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-violet-50 p-4">
                  <strong className="block text-2xl text-brand">
                    +{submissionResult.xpEarned}
                  </strong>
                  <span className="text-xs text-slate-500">XP Earned</span>
                </div>
                <div className="rounded-2xl bg-orange-50 p-4">
                  <strong className="block text-2xl text-orange-600">
                    {submissionResult.streak > 0 ? `${submissionResult.streak}d` : "—"}
                  </strong>
                  <span className="text-xs text-slate-500">Daily Streak</span>
                </div>
              </div>

              {/* 1-Click Share & Challenge Link Buttons */}
              <div className="mb-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleShareResult}
                    className="active:scale-98 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-emerald-500 bg-emerald-50 py-2.5 text-xs font-black text-emerald-800 transition hover:bg-emerald-100 sm:text-sm"
                  >
                    <span>Share Result</span>
                    <span>📋</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyChallenge}
                    className="active:scale-98 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-indigo-500 bg-indigo-50 py-2.5 text-xs font-black text-indigo-800 transition hover:bg-indigo-100 sm:text-sm"
                  >
                    <span>Challenge Friend</span>
                    <span>⚔️</span>
                  </button>
                </div>
                {copiedToast && (
                  <p className="animate-in fade-in mt-2 text-xs font-bold text-emerald-700">
                    {copiedToast}
                  </p>
                )}
              </div>

              {/* Guest Conversion Card */}
              {"isGuest" in submissionResult && Boolean(submissionResult.isGuest) && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-left">
                  <p className="text-sm font-bold text-amber-900">
                    Save your progress & join the leaderboard
                  </p>
                  <p className="mt-1 text-xs text-amber-800/80">
                    You are playing as a guest. Create a free account to lock in your daily streak
                    and compete on the global leaderboard.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/register?callbackUrl=/games/${slug}`}
                      className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm"
                    >
                      Create Free Account
                    </Link>
                    <Link
                      href={`/login?callbackUrl=/games/${slug}`}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              )}

              {/* Modal AdBanner (CLS Safe) */}
              <div className="my-4">
                <AdBanner slotType="modal" className="mx-auto" />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Link
                  href={`/games/${nextGame.slug}`}
                  className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-soft hover:brightness-105"
                >
                  Next Puzzle: {nextGame.title} →
                </Link>
                <button
                  onClick={() => {
                    soundFx.playTap();
                    triggerPracticeTransition();
                    window.location.reload();
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Replay in Practice Mode
                </button>
                <Link
                  href="/dashboard"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How to Play Modal */}
      {showHelp && editorial && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-brand">
                  HOW TO PLAY
                </p>
                <h2 className="text-xl font-black text-slate-900">{meta?.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Rules
                </h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
                  {editorial.rules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Controls
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed">
                  {editorial.howToPlay.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow-soft"
            >
              Got it, let&apos;s play
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
