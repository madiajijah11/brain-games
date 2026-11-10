import { GameSlug, GAME_CATALOG, DailyEditionInfo } from "./types";

// Fixed anchor epoch: January 1, 2026 00:00:00 UTC
export const EPOCH_DATE = new Date("2026-01-01T00:00:00Z");

/**
 * Calculates deterministic #IssueNumber and calendar dateKey based on global UTC day
 */
export function getDailyEdition(slug: GameSlug, date = new Date()): DailyEditionInfo {
  const todayUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const epochUTC = EPOCH_DATE.getTime();
  const daysDifference = Math.max(0, Math.floor((todayUTC - epochUTC) / 86400000));
  const issueNumber = daysDifference + 1;
  const dateKey = new Date(todayUTC).toISOString().slice(0, 10);

  return {
    slug,
    issueNumber,
    dateKey,
  };
}

/**
 * Returns the index of the puzzle in a curated library of N items for a given issue number
 */
export function getPuzzleIndexForIssue(issueNumber: number, poolLength: number): number {
  if (poolLength <= 0) return 0;
  return (issueNumber - 1) % poolLength;
}

/**
 * Returns milliseconds until next UTC midnight (00:00:00 UTC)
 */
export function getMillisecondsUntilNextUTCMidnight(now = new Date()): number {
  const nextMidnightUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(0, nextMidnightUTC - now.getTime());
}

/**
 * Formats milliseconds into clean "Xh Ym Zs" countdown
 */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}h ${minutes
    .toString()
    .padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
}
