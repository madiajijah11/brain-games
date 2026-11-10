"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
import Link from "next/link";
import { GameSlug, GAME_CATALOG, PuzzleSubmissionResult } from "@/lib/puzzles/types";
import { formatCountdown, getMillisecondsUntilNextUTCMidnight } from "@/lib/puzzles/daily-engine";
import { AdBanner } from "@/components/ads/ad-banner";
import { useMonetag } from "@/components/ads/monetag-hook";
import { soundFx } from "@/lib/audio/sound-fx";
import { copyShareText } from "@/lib/social/share-generator";

interface PuzzleShellProps {
  slug: GameSlug;
  issueNumber: number;
  initialMode?: "daily" | "practice";
  onUndo?: () => void;
  canUndo?: boolean;
  onReset?: () => void;
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
  onSubmit,
  isComplete,
  children,
}: PuzzleShellProps) {
  const meta = GAME_CATALOG.find((g) => g.slug === slug);
  const [startTime] = useState<number>(() => performance.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<PuzzleSubmissionResult | null>(null);
  const [error, setError] = useState<string>("");
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.isMuted());
  const [copiedToast, setCopiedToast] = useState<string>("");
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
    if (isComplete && !submissionResult && !isSubmitting) {
      soundFx.playVictory();
      setIsSubmitting(true);
      setError("");
      const finalDuration = Math.max(2000, Math.round(performance.now() - startTime));

      onSubmit(finalDuration)
        .then((res) => {
          if (res) {
            setSubmissionResult(res);
          }
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Failed to record puzzle completion.");
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  }, [isComplete, submissionResult, isSubmitting, onSubmit, startTime]);

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
    });

    if (res.success) {
      setCopiedToast("Copied to clipboard! 📋");
      setTimeout(() => setCopiedToast(""), 3000);
    } else {
      setCopiedToast("Failed to copy share card.");
      setTimeout(() => setCopiedToast(""), 3000);
    }
  }, [meta?.title, slug, issueNumber, elapsedMs, submissionResult?.streak]);

  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const formattedTimer = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-slate-500 hover:text-brand"
        >
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
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
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
          {onUndo && (
            <button
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl sm:p-8">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-3xl text-emerald-600">
              ✓
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-brand">
              PUZZLE #{submissionResult.issueNumber} COMPLETED
            </p>
            <h2 className="mt-1 text-2xl font-black">Well Solved!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Solved in {formattedTimer}
            </p>

            {/* Score / XP Grid */}
            <div className="my-6 grid grid-cols-2 gap-3">
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

            {/* 1-Click Viral Emoji Share Card Button */}
            <div className="mb-5">
              <button
                onClick={handleShareResult}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 py-3 text-sm font-black text-emerald-800 transition active:scale-98 hover:bg-emerald-100"
              >
                <span>Share Result</span>
                <span className="text-xs font-normal">📋</span>
              </button>
              {copiedToast && (
                <p className="mt-1.5 text-xs font-bold text-emerald-700 animate-in fade-in">
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
                  You are playing as a guest. Create a free account to lock in your daily streak and compete on the global leaderboard.
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
                className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-soft"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
