export interface ShareCardPayload {
  title: string;
  slug: string;
  issueNumber: number;
  durationMs: number;
  streak?: number;
  isPerfect?: boolean;
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function generateShareText(payload: ShareCardPayload): string {
  const time = formatTime(payload.durationMs);
  const streakText = payload.streak && payload.streak > 0 ? ` | 🔥 ${payload.streak}d streak` : "";
  const performancePills = payload.durationMs < 60000 ? "⚡ Lightning fast" : "🧠 Masterful solve";

  return `Brain Games — ${payload.title} #${payload.issueNumber}
⏱ ${time}${streakText}
${performancePills}
🟩🟩🟩🟩🟩

Play today's edition:
https://brain-games.vercel.app/games/${payload.slug}`;
}

export async function copyShareText(payload: ShareCardPayload): Promise<{ success: boolean; method: "clipboard" | "share" | "fallback" }> {
  const text = generateShareText(payload);

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
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `${payload.title} #${payload.issueNumber}`,
        text,
        url: `https://brain-games.vercel.app/games/${payload.slug}`,
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
