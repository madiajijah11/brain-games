"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ProgressRing } from "@/components/shared/progress-ring";

export const DAILY_PROGRESS_EVENT = "brain-games:daily-progress";

export function HeaderDailyProgress({ initialCount }: { initialCount: number }) {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const pathname = usePathname();
  const count = liveCount ?? initialCount;

  useEffect(() => {
    const handleProgressEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ todayCompletedCount?: number }>).detail;
      if (typeof detail?.todayCompletedCount === "number") {
        setLiveCount(detail.todayCompletedCount);
      }
    };

    window.addEventListener(DAILY_PROGRESS_EVENT, handleProgressEvent);
    return () => window.removeEventListener(DAILY_PROGRESS_EVENT, handleProgressEvent);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshCount = () => {
      fetch("/api/puzzles/progress", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { todayCompletedCount?: number } | null) => {
          if (!cancelled && typeof data?.todayCompletedCount === "number") {
            setLiveCount(data.todayCompletedCount);
          }
        })
        .catch(() => {
          // Keep current count if offline or transient error
        });
    };

    refreshCount();
    window.addEventListener("pageshow", refreshCount);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", refreshCount);
    };
  }, [pathname]);

  return (
    <div className="flex items-center gap-2 border-l border-slate-200 pl-2 sm:pl-3">
      <ProgressRing completed={count} total={8} size={30} />
      <span className="hidden text-xs font-bold text-slate-500 sm:inline">{count}/8 Solved</span>
    </div>
  );
}
