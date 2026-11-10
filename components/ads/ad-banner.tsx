"use client";

import { useEffect, useRef } from "react";

interface AdBannerProps {
  slotType: "bottom" | "sidebar" | "modal";
  slotId?: string;
  className?: string;
}

export function AdBanner({ slotType, slotId, className = "" }: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    try {
      // @ts-expect-error - adsbygoogle is populated by external AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Ignore adsbygoogle errors in local dev or adblock environments
    }
  }, [clientId]);

  // Specific pre-allocated dimensions to guarantee 0 CLS (Cumulative Layout Shift)
  const slotStyles = {
    bottom: "min-h-[60px] sm:min-h-[90px] w-full max-w-3xl",
    sidebar: "min-h-[250px] lg:min-h-[600px] w-full max-w-[300px]",
    modal: "min-h-[100px] w-full max-w-md",
  }[slotType];

  if (!clientId || clientId.trim() === "") {
    // In dev / preview without ad configuration, render an inert container maintaining exact space
    return (
      <aside
        aria-label="Advertisement placeholder"
        className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${slotStyles} ${className}`}
      >
        <span>Sponsored Area</span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Advertisement"
      className={`overflow-hidden rounded-2xl bg-white shadow-soft ${slotStyles} ${className}`}
    >
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId || "default"}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
