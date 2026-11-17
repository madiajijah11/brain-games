export type Coord = [number, number];

/**
 * Shift coordinates so minimum row and col are 0, sorted deterministically.
 */
export function normalizeCoords(coords: Coord[]): Coord[] {
  if (coords.length === 0) return [];
  let minR = Infinity;
  let minC = Infinity;
  for (const [r, c] of coords) {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  }
  return coords
    .map(([r, c]): Coord => [r - minR, c - minC])
    .sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
}

/**
 * Rotate polyomino coordinates clockwise by `turns * 90` degrees and normalize to (0,0).
 */
export function rotateCoords(coords: Coord[], turns: number): Coord[] {
  const normalizedTurns = ((turns % 4) + 4) % 4;
  let current = coords.map(([r, c]): Coord => [r, c]);
  for (let t = 0; t < normalizedTurns; t++) {
    current = current.map(([r, c]): Coord => [c, -r]);
  }
  return normalizeCoords(current);
}

export function coordsSignature(coords: Coord[]): string {
  return normalizeCoords(coords)
    .map(([r, c]) => `${r},${c}`)
    .join("|");
}

export function getAllRotations(coords: Coord[]): Coord[][] {
  const seen = new Set<string>();
  const out: Coord[][] = [];
  for (let t = 0; t < 4; t++) {
    const rot = rotateCoords(coords, t);
    const sig = coordsSignature(rot);
    if (!seen.has(sig)) {
      seen.add(sig);
      out.push(rot);
    }
  }
  return out;
}

/**
 * Check whether two adjacent cells are blocked by a wall in Zip.
 */
export function hasWallBetween(
  walls: { r1: number; c1: number; r2: number; c2: number }[] | undefined,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
): boolean {
  if (!walls || walls.length === 0) return false;
  return walls.some(
    (w) =>
      (w.r1 === r1 && w.c1 === c1 && w.r2 === r2 && w.c2 === c2) ||
      (w.r1 === r2 && w.c1 === c2 && w.r2 === r1 && w.c2 === c1),
  );
}

/**
 * Verify if a word can be traced on an 8-directional letter grid without reusing a cell.
 */
export function canTraceWordInGrid(grid: string[][], rawWord: string): boolean {
  const word = rawWord.trim().toUpperCase();
  if (!word || !Array.isArray(grid) || grid.length === 0) return false;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const visited = Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));

  const dfs = (r: number, c: number, idx: number): boolean => {
    if (grid[r]?.[c]?.toUpperCase() !== word[idx]) return false;
    if (idx === word.length - 1) return true;

    visited[r][c] = true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          if (dfs(nr, nc, idx + 1)) {
            visited[r][c] = false;
            return true;
          }
        }
      }
    }
    visited[r][c] = false;
    return false;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }
  return false;
}
