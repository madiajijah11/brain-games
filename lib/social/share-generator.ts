export interface ShareCardPayload {
  title: string;
  slug: string;
  issueNumber: number;
  durationMs: number;
  streak?: number;
  hintsUsed?: number;
  solveSummary?: string;
  fasterThanPct?: number;
  isPerfect?: boolean;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function buildChallengeUrl(params: {
  slug: string;
  issueNumber: number;
  durationMs: number;
  challenger?: string;
  origin?: string;
}): string {
  const base =
    params.origin ||
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://brain-games-delta.vercel.app");
  const url = new URL(`/games/${params.slug}`, base);
  url.searchParams.set("issue", String(params.issueNumber));
  url.searchParams.set("targetMs", String(Math.max(2000, Math.round(params.durationMs))));
  const cleanName = (params.challenger || "").trim().slice(0, 24);
  if (cleanName) {
    url.searchParams.set("challenger", cleanName);
  }
  return url.toString();
}

export function generateShareText(payload: ShareCardPayload): string {
  const time = formatTime(payload.durationMs);
  const streakText = payload.streak && payload.streak > 0 ? ` | 🔥 ${payload.streak}d streak` : "";
  const hintText =
    payload.hintsUsed && payload.hintsUsed > 0
      ? `💡 ${payload.hintsUsed} hint${payload.hintsUsed > 1 ? "s" : ""}`
      : "✨ No hints";
  const speedBadge =
    payload.fasterThanPct !== undefined
      ? `⚡ Faster than ${payload.fasterThanPct}% today`
      : payload.durationMs < 60000
        ? "⚡ Lightning fast"
        : "🧠 Sharp solve";
  const summaryLine = payload.solveSummary ? `\n${payload.solveSummary}` : "";

  const shareOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://brain-games-delta.vercel.app";

  return `Brain Games — ${payload.title} #${payload.issueNumber}
⏱ ${time}${streakText} | ${hintText}
${speedBadge}${summaryLine}
🟩🟩🟩🟩🟩

Play today's edition:
${shareOrigin}/games/${payload.slug}`;
}

export function generateChallengeText(params: {
  title: string;
  slug: string;
  issueNumber: number;
  durationMs: number;
  challenger?: string;
  origin?: string;
}): string {
  const time = formatTime(params.durationMs);
  const link = buildChallengeUrl(params);
  return `⚔️ Think you can beat my ${time} on ${params.title} #${params.issueNumber}?\nTry it now: ${link}`;
}

async function copyWithFallback(
  text: string,
  shareMeta?: { title: string; url: string },
): Promise<{ success: boolean; method: "clipboard" | "share" | "fallback" }> {
  // 1. Try modern clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: "clipboard" };
    } catch {
      // Fall through to share or fallback
    }
  }

  // 2. Try native mobile Web Share API
  if (typeof navigator !== "undefined" && navigator.share && shareMeta) {
    try {
      await navigator.share({
        title: shareMeta.title,
        text,
        url: shareMeta.url,
      });
      return { success: true, method: "share" };
    } catch {
      // User cancelled or denied
    }
  }

  // 3. Fallback textarea copy
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) return { success: true, method: "fallback" };
    } catch {
      // Ignore
    }
  }

  return { success: false, method: "fallback" };
}

export async function copyShareText(
  payload: ShareCardPayload,
): Promise<{ success: boolean; method: "clipboard" | "share" | "fallback" }> {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://brain-games-delta.vercel.app";
  return copyWithFallback(generateShareText(payload), {
    title: `${payload.title} #${payload.issueNumber}`,
    url: `${origin}/games/${payload.slug}`,
  });
}

export async function copyChallengeText(params: {
  title: string;
  slug: string;
  issueNumber: number;
  durationMs: number;
  challenger?: string;
  origin?: string;
}): Promise<{ success: boolean; method: "clipboard" | "share" | "fallback" }> {
  return copyWithFallback(generateChallengeText(params), {
    title: `Beat my ${formatTime(params.durationMs)} on ${params.title} #${params.issueNumber}`,
    url: buildChallengeUrl(params),
  });
}
