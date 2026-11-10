"use client";

import { useCallback } from "react";

export function useMonetag() {
  const tagId = process.env.NEXT_PUBLIC_MONETAG_TAG_ID;

  const triggerPracticeTransition = useCallback(() => {
    if (!tagId || tagId.trim() === "") {
      // In dev or preview without Monetag, execute cleanly with zero errors
      return;
    }

    try {
      // If Monetag interstitial function is mounted on window, trigger it safely
      // @ts-expect-error - monetag custom event / function
      if (typeof window !== "undefined" && typeof window.showMonetagInterstitial === "function") {
        // @ts-expect-error - external handler
        window.showMonetagInterstitial();
      }
    } catch {
      // Silent failure to avoid blocking user gameplay
    }
  }, [tagId]);

  return { triggerPracticeTransition };
}
