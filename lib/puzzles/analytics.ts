export function computeLongestUtcStreak(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;

  const uniqueSorted = Array.from(new Set(dateKeys))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();

  if (uniqueSorted.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueSorted.length; i++) {
    const prevMs = Date.parse(`${uniqueSorted[i - 1]}T00:00:00Z`);
    const currMs = Date.parse(`${uniqueSorted[i]}T00:00:00Z`);
    const diffDays = Math.round((currMs - prevMs) / 86400000);

    if (diffDays === 1) {
      current += 1;
      if (current > best) best = current;
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return best;
}

export function computeWinRate(solvedGames: number, totalGames: number): number {
  if (totalGames <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((solvedGames / totalGames) * 100)));
}
