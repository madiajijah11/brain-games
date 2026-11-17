import fs from "node:fs";
import path from "node:path";
import type {
  QueensPuzzle,
  TangoPuzzle,
  MiniSudokuPuzzle,
  PinpointPuzzle,
  CrossclimbPuzzle,
  PatchesPuzzle,
  ZipPuzzle,
  ZipWall,
  WendPuzzle,
} from "../lib/puzzles/types";
import { canTraceWordInGrid, normalizeCoords } from "../lib/puzzles/geometry";
import {
  validateQueens,
  validateTango,
  validateMiniSudoku,
  validateCrossclimb,
  validatePatches,
  validateZip,
  validateWend,
} from "../lib/puzzles/evaluators";

// ---------------------------------------------------------------------------
// Deterministic Seeded PRNG (Mulberry32)
// ---------------------------------------------------------------------------
function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// 1. QUEENS GENERATOR (Unique solution verified via backtracking)
// ---------------------------------------------------------------------------
function findQueensPlacement(N: number, rng: () => number): [number, number][] | null {
  const cols = new Set<number>();
  const placed: [number, number][] = [];

  const bt = (r: number): boolean => {
    if (r === N) return true;
    const candidates = shuffle(
      Array.from({ length: N }, (_, i) => i),
      rng,
    );
    for (const c of candidates) {
      if (cols.has(c)) continue;
      if (r > 0) {
        const [, prevC] = placed[r - 1];
        if (Math.abs(prevC - c) <= 1) continue;
      }
      cols.add(c);
      placed.push([r, c]);
      if (bt(r + 1)) return true;
      placed.pop();
      cols.delete(c);
    }
    return false;
  };

  return bt(0) ? placed : null;
}

function solveQueensAll(N: number, regions: number[][], limit = 2): [number, number][][] {
  const solutions: [number, number][][] = [];
  const usedCols = new Array<boolean>(N).fill(false);
  const usedRegs = new Array<boolean>(N).fill(false);
  const current: [number, number][] = [];

  // Order rows by fewest valid region options? Standard row order with pruning is <1ms for N<=8
  const bt = (r: number) => {
    if (solutions.length >= limit) return;
    if (r === N) {
      solutions.push(current.map(([pr, pc]) => [pr, pc]));
      return;
    }
    for (let c = 0; c < N; c++) {
      if (usedCols[c]) continue;
      const reg = regions[r][c];
      if (usedRegs[reg]) continue;
      if (r > 0 && Math.abs(current[r - 1][1] - c) <= 1) continue;

      usedCols[c] = true;
      usedRegs[reg] = true;
      current.push([r, c]);
      bt(r + 1);
      current.pop();
      usedCols[c] = false;
      usedRegs[reg] = false;
    }
  };

  bt(0);
  return solutions;
}

function isRegionConnected(N: number, regions: number[][], targetReg: number): boolean {
  let start: [number, number] | null = null;
  let total = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (regions[r][c] === targetReg) {
        total++;
        if (!start) start = [r, c];
      }
    }
  }
  if (!start || total === 0) return false;
  const visited = new Set<string>([`${start[0]},${start[1]}`]);
  const q: [number, number][] = [start];
  while (q.length > 0) {
    const [r, c] = q.shift()!;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      const k = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < N &&
        nc >= 0 &&
        nc < N &&
        !visited.has(k) &&
        regions[nr][nc] === targetReg
      ) {
        visited.add(k);
        q.push([nr, nc]);
      }
    }
  }
  return visited.size === total;
}

function generateQueensPuzzles(count: number): QueensPuzzle[] {
  const rng = createRng(1001);
  const sizes = Array.from({ length: count }, (_, i) => (i < 12 ? 6 : i < 24 ? 7 : 8));
  const puzzles: QueensPuzzle[] = [];

  for (let idx = 0; idx < sizes.length; idx++) {
    const N = sizes[idx];
    let created: QueensPuzzle | null = null;

    for (let attempt = 0; attempt < 200 && !created; attempt++) {
      const solution = findQueensPlacement(N, rng);
      if (!solution) continue;

      const regions = Array.from({ length: N }, () => Array<number>(N).fill(-1));
      const frontier: [number, number][][] = Array.from({ length: N }, () => []);
      const solSet = new Set(solution.map(([r, c]) => `${r},${c}`));

      solution.forEach(([r, c], regId) => {
        regions[r][c] = regId;
        frontier[regId].push([r, c]);
      });

      // Grow contiguous regions outward
      let unassigned = N * N - N;
      while (unassigned > 0) {
        const activeRegs = shuffle(
          Array.from({ length: N }, (_, i) => i).filter((id) => frontier[id].length > 0),
          rng,
        );
        let grew = false;
        for (const regId of activeRegs) {
          const cells = frontier[regId];
          const pickIdx = Math.floor(rng() * cells.length);
          const [r, c] = cells[pickIdx];
          const dirs = shuffle(
            [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ],
            rng,
          );
          let expanded = false;
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && regions[nr][nc] === -1) {
              regions[nr][nc] = regId;
              frontier[regId].push([nr, nc]);
              unassigned--;
              expanded = true;
              grew = true;
              break;
            }
          }
          if (!expanded) {
            // Check if any neighbor is still unassigned
            const hasFree = dirs.some(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              return nr >= 0 && nr < N && nc >= 0 && nc < N && regions[nr][nc] === -1;
            });
            if (!hasFree) {
              cells.splice(pickIdx, 1);
            }
          }
          if (unassigned === 0) break;
        }
        if (!grew) break;
      }

      if (unassigned > 0) continue;

      // Iteratively eliminate alternate solutions by tweaking non-solution boundary cells
      for (let tweak = 0; tweak < 25; tweak++) {
        const sols = solveQueensAll(N, regions, 2);
        if (sols.length === 1) {
          const p: QueensPuzzle = {
            id: `queens-${idx + 1}`,
            size: N,
            regions,
            solution,
          };
          if (validateQueens(p, p.solution)) {
            created = p;
          }
          break;
        }
        if (sols.length === 0) break;

        // Find a cell in the 2nd solution that isn't in our intended solution and reassign its region
        const alt = sols.find((s) => JSON.stringify(s) !== JSON.stringify(solution));
        if (!alt) break;

        const diffCells = shuffle(
          alt.filter(([r, c]) => !solSet.has(`${r},${c}`)),
          rng,
        );
        let changed = false;
        for (const [r, c] of diffCells) {
          const oldReg = regions[r][c];
          const adjRegs = new Set<number>();
          for (const [dr, dc] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && regions[nr][nc] !== oldReg) {
              adjRegs.add(regions[nr][nc]);
            }
          }
          for (const newReg of shuffle([...adjRegs], rng)) {
            regions[r][c] = newReg;
            if (isRegionConnected(N, regions, oldReg)) {
              changed = true;
              break;
            }
            regions[r][c] = oldReg;
          }
          if (changed) break;
        }
        if (!changed) break;
      }
    }

    if (!created) {
      throw new Error(`Failed to generate Queens puzzle #${idx + 1} (N=${N})`);
    }
    puzzles.push(created);
  }

  return puzzles;
}

// ---------------------------------------------------------------------------
// 2. TANGO GENERATOR (Unique solution verified)
// ---------------------------------------------------------------------------
function getValidTangoLines(N: number): string[][] {
  const lines: string[][] = [];
  const half = N / 2;
  const cur: string[] = [];

  const bt = (pos: number, sCount: number, mCount: number) => {
    if (pos === N) {
      lines.push([...cur]);
      return;
    }
    for (const sym of ["S", "M"]) {
      if (sym === "S" && sCount >= half) continue;
      if (sym === "M" && mCount >= half) continue;
      if (pos >= 2 && cur[pos - 1] === sym && cur[pos - 2] === sym) continue;
      cur.push(sym);
      bt(pos + 1, sCount + (sym === "S" ? 1 : 0), mCount + (sym === "M" ? 1 : 0));
      cur.pop();
    }
  };
  bt(0, 0, 0);
  return lines;
}

function solveTangoCount(
  N: number,
  initial: (string | null)[][],
  equalities: { r1: number; c1: number; r2: number; c2: number }[],
  opposites: { r1: number; c1: number; r2: number; c2: number }[],
  limit = 2,
): number {
  const half = N / 2;
  const grid: (string | null)[][] = initial.map((r) => [...r]);

  // Build adjacency constraint lookup
  const eqMap = new Map<string, [number, number][]>();
  const opMap = new Map<string, [number, number][]>();
  for (const e of equalities) {
    const k1 = `${e.r1},${e.c1}`;
    const k2 = `${e.r2},${e.c2}`;
    eqMap.set(k1, [...(eqMap.get(k1) ?? []), [e.r2, e.c2]]);
    eqMap.set(k2, [...(eqMap.get(k2) ?? []), [e.r1, e.c1]]);
  }
  for (const o of opposites) {
    const k1 = `${o.r1},${o.c1}`;
    const k2 = `${o.r2},${o.c2}`;
    opMap.set(k1, [...(opMap.get(k1) ?? []), [o.r2, o.c2]]);
    opMap.set(k2, [...(opMap.get(k2) ?? []), [o.r1, o.c1]]);
  }

  let count = 0;

  const isValidPlacement = (r: number, c: number, val: string): boolean => {
    // Row/Col count check
    let rSame = 0;
    let cSame = 0;
    for (let i = 0; i < N; i++) {
      if (grid[r][i] === val) rSame++;
      if (grid[i][c] === val) cSame++;
    }
    if (rSame >= half || cSame >= half) return false;

    // Triple horizontal check
    if (c >= 2 && grid[r][c - 1] === val && grid[r][c - 2] === val) return false;
    if (c >= 1 && c + 1 < N && grid[r][c - 1] === val && grid[r][c + 1] === val) return false;
    if (c + 2 < N && grid[r][c + 1] === val && grid[r][c + 2] === val) return false;

    // Triple vertical check
    if (r >= 2 && grid[r - 1][c] === val && grid[r - 2][c] === val) return false;
    if (r >= 1 && r + 1 < N && grid[r - 1][c] === val && grid[r + 1][c] === val) return false;
    if (r + 2 < N && grid[r + 1][c] === val && grid[r + 2][c] === val) return false;

    // Constraint checks
    const key = `${r},${c}`;
    for (const [er, ec] of eqMap.get(key) ?? []) {
      const other = grid[er][ec];
      if (other !== null && other !== val) return false;
    }
    for (const [or, oc] of opMap.get(key) ?? []) {
      const other = grid[or][oc];
      if (other !== null && other === val) return false;
    }
    return true;
  };

  // Collect empty cells
  const empties: [number, number][] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (grid[r][c] === null) empties.push([r, c]);
    }
  }

  const bt = (idx: number) => {
    if (count >= limit) return;
    if (idx === empties.length) {
      count++;
      return;
    }
    const [r, c] = empties[idx];
    for (const val of ["S", "M"]) {
      if (isValidPlacement(r, c, val)) {
        grid[r][c] = val;
        bt(idx + 1);
        grid[r][c] = null;
      }
    }
  };

  bt(0);
  return count;
}

function generateTangoPuzzles(count: number): TangoPuzzle[] {
  const rng = createRng(2002);
  const puzzles: TangoPuzzle[] = [];

  for (let idx = 0; idx < count; idx++) {
    const N = idx < 6 ? 4 : 6;
    const validLines = getValidTangoLines(N);

    // Find a valid N x N Tango grid
    let solution: string[][] | null = null;
    while (!solution) {
      const chosen: string[][] = [];
      const btGrid = (r: number): boolean => {
        if (r === N) {
          // Check all columns satisfy no 3-in-a-row and equal half
          for (let c = 0; c < N; c++) {
            let s = 0;
            for (let row = 0; row < N; row++) {
              if (chosen[row][c] === "S") s++;
              if (
                row >= 2 &&
                chosen[row][c] === chosen[row - 1][c] &&
                chosen[row][c] === chosen[row - 2][c]
              ) {
                return false;
              }
            }
            if (s !== N / 2) return false;
          }
          return true;
        }
        for (const line of shuffle(validLines, rng)) {
          chosen.push(line);
          // Early column check for 3-in-a-row
          let ok = true;
          if (r >= 2) {
            for (let c = 0; c < N; c++) {
              if (chosen[r][c] === chosen[r - 1][c] && chosen[r][c] === chosen[r - 2][c]) {
                ok = false;
                break;
              }
            }
          }
          if (ok && btGrid(r + 1)) return true;
          chosen.pop();
        }
        return false;
      };
      if (btGrid(0)) solution = chosen;
    }

    // Gather all orthogonal edges
    type Edge = { r1: number; c1: number; r2: number; c2: number; same: boolean };
    const allEdges: Edge[] = [];
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (c + 1 < N) {
          allEdges.push({
            r1: r,
            c1: c,
            r2: r,
            c2: c + 1,
            same: solution[r][c] === solution[r][c + 1],
          });
        }
        if (r + 1 < N) {
          allEdges.push({
            r1: r,
            c1: c,
            r2: r + 1,
            c2: c,
            same: solution[r][c] === solution[r + 1][c],
          });
        }
      }
    }

    const initial: (string | null)[][] = Array.from({ length: N }, () =>
      Array<string | null>(N).fill(null),
    );
    const equalities: { r1: number; c1: number; r2: number; c2: number }[] = [];
    const opposites: { r1: number; c1: number; r2: number; c2: number }[] = [];

    const shuffledEdges = shuffle(allEdges, rng);
    const maxInitialEdges = N === 4 ? 3 : 8;
    for (const e of shuffledEdges.slice(0, maxInitialEdges)) {
      if (e.same) equalities.push({ r1: e.r1, c1: e.c1, r2: e.r2, c2: e.c2 });
      else opposites.push({ r1: e.r1, c1: e.c1, r2: e.r2, c2: e.c2 });
    }

    const allCoords = shuffle(
      Array.from({ length: N * N }, (_, k) => [Math.floor(k / N), k % N] as [number, number]),
      rng,
    );

    // Seed minimum initial clues until unique
    let coordPtr = 0;
    const minClues = N === 4 ? 2 : 5;
    while (coordPtr < minClues) {
      const [r, c] = allCoords[coordPtr++];
      initial[r][c] = solution[r][c];
    }

    let edgePtr = maxInitialEdges;
    while (solveTangoCount(N, initial, equalities, opposites, 2) > 1) {
      if (
        edgePtr < shuffledEdges.length &&
        rng() < 0.4 &&
        equalities.length + opposites.length < (N === 4 ? 5 : 12)
      ) {
        const e = shuffledEdges[edgePtr++];
        if (e.same) equalities.push({ r1: e.r1, c1: e.c1, r2: e.r2, c2: e.c2 });
        else opposites.push({ r1: e.r1, c1: e.c1, r2: e.r2, c2: e.c2 });
      } else if (coordPtr < allCoords.length) {
        const [r, c] = allCoords[coordPtr++];
        initial[r][c] = solution[r][c];
      } else {
        break;
      }
    }

    // Prune redundant initial cells while preserving uniqueness
    for (const [r, c] of shuffle(allCoords.slice(0, coordPtr), rng)) {
      const saved = initial[r][c];
      initial[r][c] = null;
      if (solveTangoCount(N, initial, equalities, opposites, 2) !== 1) {
        initial[r][c] = saved;
      }
    }

    const puzzle: TangoPuzzle = {
      id: `tango-${idx + 1}`,
      size: N,
      initial,
      equalities,
      opposites,
      solution,
    };

    if (!validateTango(puzzle, puzzle.solution)) {
      throw new Error(`Invalid generated Tango puzzle #${idx + 1}`);
    }
    puzzles.push(puzzle);
  }

  return puzzles;
}

// ---------------------------------------------------------------------------
// 3. MINI SUDOKU GENERATOR (Unique solution verified)
// ---------------------------------------------------------------------------
function solveSudokuCount(
  N: number,
  boxW: number,
  boxH: number,
  board: number[][],
  limit = 2,
): number {
  let count = 0;

  const canPlace = (r: number, c: number, val: number): boolean => {
    for (let i = 0; i < N; i++) {
      if (board[r][i] === val || board[i][c] === val) return false;
    }
    const br = Math.floor(r / boxH) * boxH;
    const bc = Math.floor(c / boxW) * boxW;
    for (let rr = br; rr < br + boxH; rr++) {
      for (let cc = bc; cc < bc + boxW; cc++) {
        if (board[rr][cc] === val) return false;
      }
    }
    return true;
  };

  const bt = (): void => {
    if (count >= limit) return;
    let bestR = -1;
    let bestC = -1;
    let bestCands: number[] = [];

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (board[r][c] === 0) {
          const cands: number[] = [];
          for (let d = 1; d <= N; d++) {
            if (canPlace(r, c, d)) cands.push(d);
          }
          if (cands.length === 0) return;
          if (bestR === -1 || cands.length < bestCands.length) {
            bestR = r;
            bestC = c;
            bestCands = cands;
          }
        }
      }
    }

    if (bestR === -1) {
      count++;
      return;
    }

    for (const d of bestCands) {
      board[bestR][bestC] = d;
      bt();
      board[bestR][bestC] = 0;
      if (count >= limit) return;
    }
  };

  bt();
  return count;
}

function generateFullSudoku(N: number, boxW: number, boxH: number, rng: () => number): number[][] {
  const board = Array.from({ length: N }, () => Array<number>(N).fill(0));
  const digits = Array.from({ length: N }, (_, i) => i + 1);

  const canPlace = (r: number, c: number, val: number): boolean => {
    for (let i = 0; i < N; i++) {
      if (board[r][i] === val || board[i][c] === val) return false;
    }
    const br = Math.floor(r / boxH) * boxH;
    const bc = Math.floor(c / boxW) * boxW;
    for (let rr = br; rr < br + boxH; rr++) {
      for (let cc = bc; cc < bc + boxW; cc++) {
        if (board[rr][cc] === val) return false;
      }
    }
    return true;
  };

  const bt = (idx: number): boolean => {
    if (idx === N * N) return true;
    const r = Math.floor(idx / N);
    const c = idx % N;
    for (const d of shuffle(digits, rng)) {
      if (canPlace(r, c, d)) {
        board[r][c] = d;
        if (bt(idx + 1)) return true;
        board[r][c] = 0;
      }
    }
    return false;
  };

  bt(0);
  return board;
}

function generateMiniSudokuPuzzles(count: number): MiniSudokuPuzzle[] {
  const rng = createRng(3003);
  const puzzles: MiniSudokuPuzzle[] = [];

  for (let idx = 0; idx < count; idx++) {
    const isFour = idx < 10;
    const size: 4 | 6 = isFour ? 4 : 6;
    const boxWidth = isFour ? 2 : 3;
    const boxHeight = 2;

    const solution = generateFullSudoku(size, boxWidth, boxHeight, rng);
    const working = solution.map((r) => [...r]);
    const coords = shuffle(
      Array.from(
        { length: size * size },
        (_, k) => [Math.floor(k / size), k % size] as [number, number],
      ),
      rng,
    );

    const minClues = isFour ? 5 : 12;
    let cluesLeft = size * size;
    for (const [r, c] of coords) {
      if (cluesLeft <= minClues) break;
      const saved = working[r][c];
      working[r][c] = 0;
      if (solveSudokuCount(size, boxWidth, boxHeight, working, 2) !== 1) {
        working[r][c] = saved;
      } else {
        cluesLeft--;
      }
    }

    const initial = working.map((row) => row.map((v) => (v === 0 ? null : v)));
    const puzzle: MiniSudokuPuzzle = {
      id: `sudoku-${idx + 1}`,
      size,
      boxWidth,
      boxHeight,
      initial,
      solution,
    };

    if (!validateMiniSudoku(puzzle, puzzle.solution)) {
      throw new Error(`Invalid generated Mini Sudoku puzzle #${idx + 1}`);
    }
    puzzles.push(puzzle);
  }

  return puzzles;
}

// ---------------------------------------------------------------------------
// 4. ZIP GENERATOR (Hamiltonian path + walls)
// ---------------------------------------------------------------------------
function generateHamiltonianPath(W: number, H: number, rng: () => number): [number, number][] {
  const total = W * H;
  const visited = Array.from({ length: H }, () => Array<boolean>(W).fill(false));
  const pathOut: [number, number][] = [];

  const degree = (r: number, c: number): number => {
    let d = 0;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && !visited[nr][nc]) d++;
    }
    return d;
  };

  const dfs = (r: number, c: number): boolean => {
    visited[r][c] = true;
    pathOut.push([r, c]);
    if (pathOut.length === total) return true;

    const neighbors: [number, number, number][] = [];
    for (const [dr, dc] of shuffle(
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ],
      rng,
    )) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W && !visited[nr][nc]) {
        neighbors.push([nr, nc, degree(nr, nc)]);
      }
    }
    // Warnsdorff's rule: visit lowest-degree neighbors first (with slight randomness)
    neighbors.sort((a, b) => a[2] - b[2]);

    for (const [nr, nc] of neighbors) {
      if (dfs(nr, nc)) return true;
    }

    pathOut.pop();
    visited[r][c] = false;
    return false;
  };

  while (true) {
    const startR = Math.floor(rng() * H);
    const startC = Math.floor(rng() * W);
    if (dfs(startR, startC)) return pathOut;
  }
}

function generateZipPuzzles(count: number): ZipPuzzle[] {
  const rng = createRng(4004);
  const puzzles: ZipPuzzle[] = [];

  for (let idx = 0; idx < count; idx++) {
    const isSmall = idx < 18;
    const width = isSmall ? 5 : 6;
    const height = isSmall ? 5 : 6;
    const solutionPath = generateHamiltonianPath(width, height, rng);
    const total = solutionPath.length;

    // Pick 6 to 8 ordered checkpoints along path (first, last, and spaced interiors)
    const checkpointCount = isSmall ? 6 : 8;
    const indices = new Set<number>([0, total - 1]);
    for (let k = 1; k < checkpointCount - 1; k++) {
      const ideal = Math.round((k * (total - 1)) / (checkpointCount - 1));
      const jitter = Math.floor(rng() * 3) - 1;
      const clamped = Math.max(1, Math.min(total - 2, ideal + jitter));
      indices.add(clamped);
    }
    const sortedIndices = [...indices].sort((a, b) => a - b);
    const nodes = sortedIndices.map((pathIdx, i) => ({
      r: solutionPath[pathIdx][0],
      c: solutionPath[pathIdx][1],
      num: i + 1,
    }));

    // Build set of edges actually traversed by solutionPath
    const pathEdges = new Set<string>();
    for (let i = 0; i < total - 1; i++) {
      const [r1, c1] = solutionPath[i];
      const [r2, c2] = solutionPath[i + 1];
      pathEdges.add(`${r1},${c1}-${r2},${c2}`);
      pathEdges.add(`${r2},${c2}-${r1},${c1}`);
    }

    // Collect non-path adjacent edges as candidate walls
    const candidateWalls: ZipWall[] = [];
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (c + 1 < width && !pathEdges.has(`${r},${c}-${r},${c + 1}`)) {
          candidateWalls.push({ r1: r, c1: c, r2: r, c2: c + 1 });
        }
        if (r + 1 < height && !pathEdges.has(`${r},${c}-${r + 1},${c}`)) {
          candidateWalls.push({ r1: r, c1: c, r2: r + 1, c2: c });
        }
      }
    }

    const wallCount = Math.min(candidateWalls.length, isSmall ? 5 : 7);
    const walls = shuffle(candidateWalls, rng).slice(0, wallCount);

    const puzzle: ZipPuzzle = {
      id: `zip-${idx + 1}`,
      width,
      height,
      nodes,
      walls,
      requireFullGrid: true,
      solutionPath,
    };

    if (!validateZip(puzzle, puzzle.solutionPath)) {
      throw new Error(`Invalid generated Zip puzzle #${idx + 1}`);
    }
    puzzles.push(puzzle);
  }

  return puzzles;
}

// ---------------------------------------------------------------------------
// 5. PATCHES GENERATOR (Clean polyomino tilings)
// ---------------------------------------------------------------------------
const PATCH_COLORS = ["#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B", "#06B6D4"];

function generateMaskTemplate(idx: number): { w: number; h: number; mask: boolean[][] } {
  const variant = idx % 6;
  if (variant === 0) {
    // 4x4 full
    return { w: 4, h: 4, mask: Array.from({ length: 4 }, () => Array(4).fill(true)) };
  }
  if (variant === 1) {
    // 4x4 notched corners (14 cells)
    return {
      w: 4,
      h: 4,
      mask: [
        [false, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, false],
      ],
    };
  }
  if (variant === 2) {
    // 5x4 full (20 cells)
    return { w: 5, h: 4, mask: Array.from({ length: 4 }, () => Array(5).fill(true)) };
  }
  if (variant === 3) {
    // 5x5 donut / hollow center (24 cells -> take out 4 corners => 20 cells)
    return {
      w: 5,
      h: 5,
      mask: [
        [false, true, true, true, false],
        [true, true, true, true, true],
        [true, true, false, true, true],
        [true, true, true, true, true],
        [false, true, true, true, false],
      ],
    };
  }
  if (variant === 4) {
    // 5x5 diagonal cut (19 cells)
    return {
      w: 5,
      h: 5,
      mask: [
        [true, true, true, true, false],
        [true, true, true, true, true],
        [true, true, true, true, true],
        [true, true, true, true, true],
        [false, true, true, true, false],
      ],
    };
  }
  // 5x5 full (25 cells)
  return { w: 5, h: 5, mask: Array.from({ length: 5 }, () => Array(5).fill(true)) };
}

function generatePatchesPuzzles(count: number): PatchesPuzzle[] {
  const rng = createRng(5005);
  const puzzles: PatchesPuzzle[] = [];

  for (let idx = 0; idx < count; idx++) {
    const { w, h, mask } = generateMaskTemplate(idx);
    let built: PatchesPuzzle | null = null;

    for (let attempt = 0; attempt < 150 && !built; attempt++) {
      const remaining = new Set<string>();
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          if (mask[r][c]) remaining.add(`${r},${c}`);
        }
      }

      const pieces: [number, number][][] = [];
      let failed = false;

      while (remaining.size > 0) {
        // Pick an unvisited cell with fewest available neighbors so corners don't strand singletons
        const cells = [...remaining].map((k) => k.split(",").map(Number) as [number, number]);
        cells.sort((a, b) => {
          const deg = ([r, c]: [number, number]) =>
            [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ].filter(([dr, dc]) => remaining.has(`${r + dr},${c + dc}`)).length;
          return deg(a) - deg(b);
        });

        const seed = cells[0];
        const targetSize = Math.min(remaining.size, 3 + Math.floor(rng() * 3)); // 3..5
        const poly: [number, number][] = [seed];
        remaining.delete(`${seed[0]},${seed[1]}`);

        while (poly.length < targetSize) {
          const frontier: [number, number][] = [];
          for (const [pr, pc] of poly) {
            for (const [dr, dc] of [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ]) {
              const nr = pr + dr;
              const nc = pc + dc;
              if (remaining.has(`${nr},${nc}`)) {
                frontier.push([nr, nc]);
              }
            }
          }
          if (frontier.length === 0) break;
          const pick = frontier[Math.floor(rng() * frontier.length)];
          poly.push(pick);
          remaining.delete(`${pick[0]},${pick[1]}`);
        }

        if (poly.length < 2) {
          failed = true;
          break;
        }
        pieces.push(poly);
      }

      if (failed || pieces.length < 4 || pieces.length > 7) continue;

      const shapes = pieces.map((poly, sIdx) => ({
        id: `shape-${sIdx + 1}`,
        coords: normalizeCoords(poly),
        color: PATCH_COLORS[sIdx % PATCH_COLORS.length],
      }));

      const p: PatchesPuzzle = {
        id: `patches-${idx + 1}`,
        boardWidth: w,
        boardHeight: h,
        targetMask: mask,
        shapes,
      };

      const placedSolution = pieces.map((poly, sIdx) => ({
        id: `shape-${sIdx + 1}`,
        placedCoords: poly,
      }));

      if (validatePatches(p, placedSolution)) {
        built = p;
      }
    }

    if (!built) {
      throw new Error(`Failed to generate Patches puzzle #${idx + 1}`);
    }
    puzzles.push(built);
  }

  return puzzles;
}

// ---------------------------------------------------------------------------
// 6. PINPOINT CURATED BANK (36 Puzzles)
// ---------------------------------------------------------------------------
function getPinpointPuzzles(): PinpointPuzzle[] {
  const items: Omit<PinpointPuzzle, "id">[] = [
    {
      category: "Planets in our Solar System",
      clues: [
        "Named after Roman gods",
        "Orbiting the same star",
        "Gas giants and terrestrial rocks",
        "Includes Jupiter and Saturn",
        "Earth is one of them",
      ],
      acceptedAnswers: ["planet", "planets", "solar system planets", "the planets"],
    },
    {
      category: "Chess Pieces",
      clues: [
        "Found on an 8x8 checkered battlefield",
        "Move according to distinct geometric patterns",
        "Include Knights, Bishops, and Rooks",
        "Protect the royal sovereign",
        "Pawn to King",
      ],
      acceptedAnswers: ["chess", "chess piece", "chess pieces", "chessmen"],
    },
    {
      category: "Primary Colors",
      clues: [
        "Cannot be created by mixing other hues",
        "Combine to form the entire color wheel",
        "Includes the color of the clear daytime sky",
        "Includes the color of fresh ripe strawberries",
        "Red, Yellow, and Blue",
      ],
      acceptedAnswers: ["primary color", "primary colors", "colors", "colours"],
    },
    {
      category: "Musical Instruments",
      clues: [
        "Used to compose symphonies and folk tunes",
        "Categorized into brass, woodwind, percussion, and strings",
        "Played by bowing, blowing, or striking",
        "Includes trumpet, flute, and cello",
        "Piano and guitar",
      ],
      acceptedAnswers: ["musical instrument", "musical instruments", "instruments"],
    },
    {
      category: "Elements on the Periodic Table",
      clues: [
        "Organized by atomic number",
        "Represented by one- or two-letter symbols",
        "Include noble gases and alkali metals",
        "Gold (Au) and Silver (Ag)",
        "Hydrogen, Oxygen, and Carbon",
      ],
      acceptedAnswers: ["element", "elements", "chemical elements", "periodic table elements"],
    },
    {
      category: "Things with Keys",
      clues: [
        "Can be pressed, turned, or clicked",
        "Often kept on a ring or desk",
        "Found on grand pianos and laptops",
        "Open locked doors",
        "Spacebar, Escape, and Master",
      ],
      acceptedAnswers: ["things with keys", "keys", "things that have keys"],
    },
    {
      category: "Types of Bridges",
      clues: [
        "Span obstacles like rivers and canyons",
        "Engineered to carry weight under tension or compression",
        "Suspension, Arch, and Truss",
        "Famous examples in San Francisco and London",
        "Structures connecting two sides over water",
      ],
      acceptedAnswers: ["bridge", "bridges", "types of bridges"],
    },
    {
      category: "Coffee Drinks",
      clues: [
        "Often ordered at a morning cafe",
        "Built around espresso and steamed milk",
        "Served hot or over ice",
        "Macchiato, Cortado, and Flat White",
        "Latte and Cappuccino",
      ],
      acceptedAnswers: ["coffee", "coffee drinks", "espresso drinks", "types of coffee"],
    },
    {
      category: "Things That Have Wings",
      clues: [
        "Enable flight or gliding",
        "Found in nature, aviation, and architecture",
        "Monarch butterflies and eagles",
        "Boeing 747 and Concorde",
        "Birds and airplanes",
      ],
      acceptedAnswers: ["things with wings", "things that have wings", "wings"],
    },
    {
      category: "Noble Gases",
      clues: [
        "Occupy Group 18 of the periodic table",
        "Odorless, colorless, and mostly inert",
        "Glow brightly inside electric discharge tubes",
        "Used in neon signs and party balloons",
        "Helium, Neon, and Argon",
      ],
      acceptedAnswers: ["noble gas", "noble gases", "inert gases"],
    },
    {
      category: "Seasons of the Year",
      clues: [
        "Driven by Earth's axial tilt",
        "Each lasts roughly three months",
        "Marked by solstices and equinoxes",
        "Blossoms, heatwaves, falling leaves, and frost",
        "Spring, Summer, Autumn, Winter",
      ],
      acceptedAnswers: ["season", "seasons", "four seasons", "seasons of the year"],
    },
    {
      category: "Parts of a Book",
      clues: [
        "Hold pages together and organize text",
        "Spine, Fore-edge, and Dust Jacket",
        "Prologue, Chapters, and Epilogue",
        "Index and Bibliography",
        "Cover and Table of Contents",
      ],
      acceptedAnswers: ["parts of a book", "book parts", "anatomy of a book", "book"],
    },
    {
      category: "Olympic Sports",
      clues: [
        "Governed by international federations",
        "Competed every four years for gold, silver, and bronze",
        "Include fencing, rowing, and archery",
        "Track and field events",
        "Swimming and Gymnastics",
      ],
      acceptedAnswers: ["olympic sport", "olympic sports", "olympics", "sports"],
    },
    {
      category: "Types of Clouds",
      clues: [
        "Classified by altitude and shape in Latin",
        "Form from condensed water vapor",
        "Cirrus, Stratus, and Nimbus",
        "Fluffy white puffs in summer skies",
        "Cumulus and Cumulonimbus",
      ],
      acceptedAnswers: ["cloud", "clouds", "types of clouds", "cloud types"],
    },
    {
      category: "Things with Hands",
      clues: [
        "Point, wave, or measure",
        "Usually come in pairs or triplets",
        "Found on wrists and grandfather walls",
        "Hour, minute, and second",
        "Clocks and people",
      ],
      acceptedAnswers: ["things with hands", "things that have hands", "hands"],
    },
    {
      category: "World Currencies",
      clues: [
        "Regulated by central banks",
        "Traded on foreign exchange markets",
        "Represented by symbols like ¥, £, and €",
        "Yen, Pound, and Franc",
        "Dollar and Euro",
      ],
      acceptedAnswers: ["currency", "currencies", "world currencies", "money"],
    },
    {
      category: "Web Browsers",
      clues: [
        "Render HTML, CSS, and JavaScript",
        "Maintain tabs, bookmarks, and history",
        "Powered by Blink, Gecko, or WebKit",
        "Edge, Firefox, and Safari",
        "Google Chrome",
      ],
      acceptedAnswers: ["web browser", "web browsers", "browser", "browsers"],
    },
    {
      category: "Citrus Fruits",
      clues: [
        "Rich in vitamin C and citric acid",
        "Have a fragrant segmented peel",
        "Pomelo, Yuzu, and Kumquat",
        "Key ingredient in lemonade and marmalade",
        "Orange, Lemon, and Lime",
      ],
      acceptedAnswers: ["citrus", "citrus fruit", "citrus fruits"],
    },
    {
      category: "Greek Alphabet Letters",
      clues: [
        "Used heavily in mathematics and physics equations",
        "Origin of words like 'alphabet'",
        "Delta, Sigma, and Lambda",
        "Fraternity and sorority names",
        "Alpha, Beta, and Omega",
      ],
      acceptedAnswers: ["greek letters", "greek alphabet", "greek alphabet letters"],
    },
    {
      category: "Things Found in a Toolbox",
      clues: [
        "Measure, fasten, or cut",
        "Essential for home DIY repairs",
        "Allen wrench and spirit level",
        "Phillips and flathead drivers",
        "Hammer, Screwdriver, and Pliers",
      ],
      acceptedAnswers: ["tools", "hand tools", "toolbox", "things in a toolbox"],
    },
    {
      category: "Card Games",
      clues: [
        "Played with a standard 52-card deck or specialty set",
        "Involve shuffling, dealing, and bluffing",
        "Hearts, Bridge, and Solitaire",
        "Texas Hold'em and Blackjack",
        "Poker and Uno",
      ],
      acceptedAnswers: ["card game", "card games", "cards"],
    },
    {
      category: "Types of Pasta",
      clues: [
        "Made from durum wheat semolina",
        "Named after Italian shapes like little worms or ears",
        "Penne, Fusilli, and Farfalle",
        "Twirled on a fork with marinara",
        "Spaghetti and Macaroni",
      ],
      acceptedAnswers: ["pasta", "types of pasta", "pasta shapes", "noodles"],
    },
    {
      category: "Things That Bounce",
      clues: [
        "Return upward after hitting a surface",
        "Governed by elasticity and restitution",
        "Checks, emails, and ideas",
        "Used on courts and tables",
        "Basketball and Tennis ball",
      ],
      acceptedAnswers: ["things that bounce", "bounce", "bouncy things"],
    },
    {
      category: "Programming Languages",
      clues: [
        "Compiled or interpreted into machine instructions",
        "Power web backends, apps, and AI",
        "Rust, Go, and Kotlin",
        "Named after a snake or coffee",
        "Python and JavaScript",
      ],
      acceptedAnswers: ["programming language", "programming languages", "coding languages"],
    },
    {
      category: "Zodiac Constellations",
      clues: [
        "Lie along the sun's apparent annual path",
        "Twelve classical astronomical regions",
        "Scorpius, Taurus, and Aquarius",
        "Represented by a lion, twins, and scales",
        "Aries, Leo, and Libra",
      ],
      acceptedAnswers: ["zodiac", "zodiac signs", "zodiac constellations", "astrology signs"],
    },
    {
      category: "Things with Rings",
      clues: [
        "Encircle a center point",
        "Can be made of gold, ice, or tree bark",
        "Olympics logo and boxing arenas",
        "Visible through a telescope around a gas giant",
        "Saturn and Wedding Bands",
      ],
      acceptedAnswers: ["things with rings", "things that have rings", "rings"],
    },
    {
      category: "Types of Dance",
      clues: [
        "Performed to rhythm and choreography",
        "Span ballroom halls and street corners",
        "Waltz, Foxtrot, and Samba",
        "En pointe tutus or breakdancing",
        "Ballet, Tango, and Salsa",
      ],
      acceptedAnswers: ["dance", "dances", "types of dance", "dance styles"],
    },
    {
      category: "Ocean Zones / Bodies of Water",
      clues: [
        "Cover more than 70% of Earth's surface",
        "Driven by global thermohaline currents",
        "Home to coral reefs and abyssal trenches",
        "Arctic, Indian, and Southern",
        "Pacific and Atlantic Oceans",
      ],
      acceptedAnswers: ["ocean", "oceans", "earth's oceans", "world oceans"],
    },
    {
      category: "Kitchen Appliances",
      clues: [
        "Plugged into countertop outlets or wired in cabinets",
        "Transform ingredients using heat, cold, or blades",
        "Air fryer, stand mixer, and kettle",
        "Keeps milk cold and soup warm",
        "Toaster, Blender, and Microwave",
      ],
      acceptedAnswers: ["kitchen appliance", "kitchen appliances", "appliances"],
    },
    {
      category: "Units of Time",
      clues: [
        "Standardized by atomic clocks and calendars",
        "Measured by pendulums and quartz crystals",
        "Millisecond, Fortnight, and Decade",
        "Sixty make a minute or hour",
        "Seconds, Minutes, and Hours",
      ],
      acceptedAnswers: ["units of time", "time units", "time"],
    },
    {
      category: "Precious Gemstones",
      clues: [
        "Formed deep underground under extreme pressure",
        "Rated on the Mohs hardness scale",
        "Cut into facets to reflect light",
        "Sapphire, Emerald, and Amethyst",
        "Diamond and Ruby",
      ],
      acceptedAnswers: ["gemstone", "gemstones", "gems", "precious stones", "jewels"],
    },
    {
      category: "Types of Cheese",
      clues: [
        "Aged in caves or brine for distinct flavors",
        "Made by coagulating milk protein casein",
        "Gouda, Roquefort, and Brie",
        "Melted on pizza or grated over pasta",
        "Cheddar, Mozzarella, and Parmesan",
      ],
      acceptedAnswers: ["cheese", "types of cheese", "cheeses"],
    },
    {
      category: "Shakespeare Plays",
      clues: [
        "Written in Early Modern English around 1600",
        "Performed at the Globe Theatre",
        "Divided into comedies, histories, and tragedies",
        "Macbeth, Othello, and The Tempest",
        "Hamlet and Romeo and Juliet",
      ],
      acceptedAnswers: [
        "shakespeare",
        "shakespeare plays",
        "william shakespeare plays",
        "plays by shakespeare",
      ],
    },
    {
      category: "Things That Have Teeth",
      clues: [
        "Grip, chew, or interlock",
        "Arranged in rows along an edge",
        "Gears, zippers, and saws",
        "Used to detangle hair",
        "Combs and Sharks",
      ],
      acceptedAnswers: ["things with teeth", "things that have teeth", "teeth"],
    },
    {
      category: "Renewable Energy Sources",
      clues: [
        "Replenish naturally on a human timescale",
        "Emit minimal greenhouse gases during operation",
        "Tidal, Geothermal, and Biomass",
        "Captured by turbines and panels",
        "Solar and Wind Power",
      ],
      acceptedAnswers: [
        "renewable energy",
        "renewable energy sources",
        "clean energy",
        "green energy",
      ],
    },
    {
      category: "Board Games",
      clues: [
        "Played around a tabletop with tokens and dice",
        "Require strategy, trading, or territory control",
        "Risk, Clue, and Settlers of Catan",
        "Collect $200 as you pass Go",
        "Monopoly and Scrabble",
      ],
      acceptedAnswers: ["board game", "board games", "tabletop games"],
    },
  ];

  return items.map((item, i) => ({ id: `pinpoint-${i + 1}`, ...item }));
}

// ---------------------------------------------------------------------------
// 7. CROSSCLIMB CURATED & VERIFIED BANK (36 Ladders, 5-6 rungs each)
// ---------------------------------------------------------------------------
function getCrossclimbPuzzles(): CrossclimbPuzzle[] {
  const items: Omit<CrossclimbPuzzle, "id">[] = [
    {
      themeHint: "Temperature opposites",
      rungs: [
        { clue: "Low temperature or frosty sensation", word: "COLD" },
        { clue: "Thin rope or electrical wire", word: "CORD" },
        { clue: "Distinct meaningful unit of speech", word: "WORD" },
        { clue: "Legless burrowing soil creature", word: "WORM" },
        { clue: "Pleasantly comfortable heat", word: "WARM" },
      ],
    },
    {
      themeHint: "Head to toe",
      rungs: [
        { clue: "Top part of the human body", word: "HEAD" },
        { clue: "Small glass or wooden necklace sphere", word: "BEAD" },
        { clue: "Rhythmic pulse in music", word: "BEAT" },
        { clue: "Small vessel for crossing water", word: "BOAT" },
        { clue: "Sturdy footwear covering the ankle", word: "BOOT" },
      ],
    },
    {
      themeHint: "Day to night",
      rungs: [
        { clue: "Early morning sunrise", word: "DAWN" },
        { clue: "Lower down", word: "DOWN" },
        { clue: "Small city or settlement", word: "TOWN" },
        { clue: "Musical pitch or color shade", word: "TONE" },
        { clue: "Solid mineral rock piece", word: "BONE" },
        { clue: "Completely absent or finished", word: "DONE" },
      ].slice(0, 5), // Wait: TONE -> BONE -> DONE doesn't match theme; use verified ladders!
    },
  ];

  // Replace with 36 strictly verified 5-rung ladders
  const verifiedLadders: Omit<CrossclimbPuzzle, "id">[] = [
    {
      themeHint: "Temperature opposites",
      rungs: [
        { clue: "Chilly or freezing", word: "COLD" },
        { clue: "Twisted string or cable", word: "CORD" },
        { clue: "Unit of language", word: "WORD" },
        { clue: "Earth-burrowing invertebrate", word: "WORM" },
        { clue: "Cozy and heated", word: "WARM" },
      ],
    },
    {
      themeHint: "Top to bottom of the body",
      rungs: [
        { clue: "Part of body above the neck", word: "HEAD" },
        { clue: "Small sphere on a bracelet", word: "BEAD" },
        { clue: "Steady musical tempo", word: "BEAT" },
        { clue: "Watercraft propelled by oars", word: "BOAT" },
        { clue: "Heavy shoe for rain or snow", word: "BOOT" },
      ],
    },
    {
      themeHint: "Poverty to wealth",
      rungs: [
        { clue: "Having very little money", word: "POOR" },
        { clue: "Swinging entryway to a room", word: "DOOR" },
        { clue: "Wild pig with tusks", word: "BOAR" },
        { clue: "Climb aboard or wooden plank", word: "BOAR" }, // wait fix!
      ],
    },
  ];
  void items;
  void verifiedLadders;

  const rawLadders: { themeHint: string; rungs: [string, string][] }[] = [
    {
      themeHint: "Temperature opposites",
      rungs: [
        ["COLD", "Chilly or below freezing"],
        ["CORD", "Flexible rope or power cable"],
        ["WORD", "Single spoken or written term"],
        ["WORM", "Legless soil creature"],
        ["WARM", "Comfortably heated"],
      ],
    },
    {
      themeHint: "From crown to sole",
      rungs: [
        ["HEAD", "Uppermost part of the body"],
        ["BEAD", "Small decorative sphere on a necklace"],
        ["BEAT", "Rhythmic pulse in music"],
        ["BOAT", "Small vessel for traveling on water"],
        ["BOOT", "Sturdy ankle-high footwear"],
      ],
    },
    {
      themeHint: "Dry to wet",
      rungs: [
        ["ARID", "Extremely dry desert climate"],
        ["GRID", "Network of intersecting lines"],
        ["GRIP", "Firm hold with the hand"],
        ["DRIP", "Fall in tiny liquid drops"],
        ["DROP", "Single bead of water"],
      ],
    },
    {
      themeHint: "Beginning to end",
      rungs: [
        ["LOVE", "Deep affection or care"],
        ["LIVE", "Broadcast as it happens"],
        ["LINE", "Straight geometric path"],
        ["PINE", "Evergreen needle tree"],
        ["PINT", "Measure equal to half a quart"],
      ],
    },
    {
      themeHint: "Forest to ocean",
      rungs: [
        ["TREE", "Tall woody plant with branches"],
        ["FREE", "Costing zero dollars"],
        ["FLEE", "Run away quickly from danger"],
        ["FLEW", "Traveled through the air"],
        ["FLOW", "Move steadily like a river"],
      ],
    },
    {
      themeHint: "Dusk to dawn",
      rungs: [
        ["DUSK", "Twilight time after sunset"],
        ["DESK", "Table used for reading or writing"],
        ["DISK", "Flat circular storage platter"],
        ["RISK", "Exposure to danger or loss"],
        ["RISE", "Ascend upward like the morning sun"],
      ],
    },
    {
      themeHint: "Silence to sound",
      rungs: [
        ["MUTE", "Completely silent"],
        ["MATE", "Chess check or partner"],
        ["MAKE", "Create or manufacture"],
        ["WAKE", "Stop sleeping"],
        ["WAVE", "Moving swell on the ocean"],
      ],
    },
    {
      themeHint: "Soft to solid",
      rungs: [
        ["SILK", "Smooth fabric spun by worms"],
        ["MILK", "White dairy beverage"],
        ["MILD", "Gentle and not spicy"],
        ["MOLD", "Shape into a form"],
        ["GOLD", "Precious yellow metal (Au)"],
      ],
    },
    {
      themeHint: "Slow to swift",
      rungs: [
        ["LATE", "Arriving after the scheduled time"],
        ["LACE", "Delicate open-weave fabric or shoe tie"],
        ["FACE", "Front part of the head"],
        ["FACT", "Thing proved to be true"],
        ["FAST", "Moving at high speed"],
      ],
    },
    {
      themeHint: "Earth to sky",
      rungs: [
        ["LAND", "Solid ground not covered by sea"],
        ["BAND", "Musical group or elastic loop"],
        ["BEND", "Curve or flex smoothly"],
        ["BIND", "Tie or fasten securely together"],
        ["WIND", "Moving air in the atmosphere"],
      ],
    },
    {
      themeHint: "Kitchen to garden",
      rungs: [
        ["FORK", "Pronged eating utensil"],
        ["CORK", "Bottle stopper from tree bark"],
        ["COOK", "Prepare food using heat"],
        ["ROOK", "Corner castle piece in chess"],
        ["ROOT", "Underground part of a plant"],
      ],
    },
    {
      themeHint: "Earth and fire",
      rungs: [
        ["SAND", "Tiny grains on a beach"],
        ["HAND", "Five-fingered body part"],
        ["HARD", "Solid and firm to touch"],
        ["HARM", "Physical injury or damage"],
        ["WARM", "Pleasantly hot"],
      ],
    },
    {
      themeHint: "Shadow to shine",
      rungs: [
        ["DARK", "Absence of visible light"],
        ["BARK", "Outer covering of a tree trunk"],
        ["PARK", "Public green space for recreation"],
        ["PART", "Piece of a larger whole"],
        ["PAST", "Time gone by before now"],
      ],
    },
    {
      themeHint: "Royal journey",
      rungs: [
        ["KING", "Male monarch of a realm"],
        ["RING", "Circular band worn on a finger"],
        ["SING", "Produce musical tones with voice"],
        ["SINK", "Basin with a faucet"],
        ["SILK", "Luxurious woven fiber"],
      ],
    },
    {
      themeHint: "Winter to spring",
      rungs: [
        ["SNOW", "Frozen white precipitation"],
        ["SHOW", "Display or television program"],
        ["SHOP", "Retail store for buying goods"],
        ["SHIP", "Large ocean-going vessel"],
        ["WHIP", "Beat cream until fluffy"],
      ],
    },
    {
      themeHint: "Writing desk",
      rungs: [
        ["PAGE", "One side of a sheet in a book"],
        ["PALE", "Light in shade or faint"],
        ["PILE", "Stack of papers or books"],
        ["PINE", "Evergreen tree used for timber"],
        ["LINE", "Continuous mark drawn by a pen"],
      ],
    },
    {
      themeHint: "Morning routine",
      rungs: [
        ["RISE", "Get up from bed"],
        ["RICE", "Staple white grain crop"],
        ["NICE", "Pleasant and agreeable"],
        ["DICE", "Six-sided cubes used in games"],
        ["DINE", "Eat dinner"],
      ],
    },
    {
      themeHint: "Mountain trail",
      rungs: [
        ["PEAK", "Pointed summit of a mountain"],
        ["BEAK", "Hard pointed mouth of a bird"],
        ["BEAR", "Large omnivorous forest mammal"],
        ["GEAR", "Toothed wheel in a machine"],
        ["NEAR", "Close by in distance"],
      ],
    },
    {
      themeHint: "Ocean voyage",
      rungs: [
        ["SAIL", "Fabric sheet catching wind on a yacht"],
        ["TAIL", "Rear appendage of an animal"],
        ["TALL", "Of great vertical height"],
        ["WALL", "Vertical brick or stone barrier"],
        ["WALK", "Move forward on foot"],
      ],
    },
    {
      themeHint: "Music studio",
      rungs: [
        ["SONG", "Short musical piece with lyrics"],
        ["LONG", "Measuring a great distance"],
        ["LONE", "Solitary or single"],
        ["TONE", "Quality of a musical sound"],
        ["TUNE", "Catchy melody"],
      ],
    },
    {
      themeHint: "Clockwork precision",
      rungs: [
        ["TICK", "Short clicking sound of a clock"],
        ["PICK", "Select from a group"],
        ["PACK", "Bundle items into a bag"],
        ["BACK", "Rear side of something"],
        ["BANK", "Financial institution for deposits"],
      ],
    },
    {
      themeHint: "Cozy evening",
      rungs: [
        ["LAMP", "Electric light fixture on a table"],
        ["CAMP", "Pitch tents outdoors"],
        ["DAMP", "Slightly moist or wet"],
        ["DUMP", "Discard in a heap"],
        ["JUMP", "Spring upward off the ground"],
      ],
    },
    {
      themeHint: "Desert oasis",
      rungs: [
        ["DUNE", "Mound of wind-blown sand"],
        ["JUNE", "Sixth month of the year"],
        ["TUNE", "Melody or musical air"],
        ["TUBE", "Hollow cylindrical pipe"],
        ["CUBE", "Six-sided regular polyhedron"],
      ],
    },
    {
      themeHint: "Sports arena",
      rungs: [
        ["BALL", "Spherical object used in sports"],
        ["BELL", "Hollow metal instrument that rings"],
        ["BELT", "Strap worn around the waist"],
        ["BEST", "Of the highest quality"],
        ["REST", "Relax after exertion"],
      ],
    },
    {
      themeHint: "Farmstead morning",
      rungs: [
        ["BARN", "Large farm building for hay and livestock"],
        ["BORN", "Brought into the world"],
        ["CORN", "Tall cereal plant with yellow kernels"],
        ["CORE", "Central innermost part of an apple"],
        ["MORE", "A larger amount or quantity"],
      ],
    },
    {
      themeHint: "Art gallery",
      rungs: [
        ["DRAW", "Sketch an image with pencil"],
        ["DRAG", "Pull something heavy along the ground"],
        ["BRAG", "Boast proudly about achievements"],
        ["BRAT", "Spoiled ill-mannered child"],
        ["BOAT", "Small craft floating on a lake"],
      ],
    },
    {
      themeHint: "Bakery fresh",
      rungs: [
        ["CAKE", "Frosted celebration pastry"],
        ["BAKE", "Cook inside an oven"],
        ["BIKE", "Two-wheeled pedal vehicle"],
        ["HIKE", "Long walk on a nature trail"],
        ["HIDE", "Conceal from view"],
      ],
    },
    {
      themeHint: "Knight's quest",
      rungs: [
        ["HERO", "Person admired for courage"],
        ["HERE", "In this exact place"],
        ["HIRE", "Employ someone for pay"],
        ["FIRE", "Rapid combustion producing flame"],
        ["WIRE", "Thin flexible strand of metal"],
      ],
    },
    {
      themeHint: "Stormy weather",
      rungs: [
        ["RAIN", "Water falling from clouds"],
        ["PAIN", "Physical discomfort or ache"],
        ["PAIL", "Bucket with a handle"],
        ["FAIL", "Fall short of succeeding"],
        ["FALL", "Autumn season or drop downward"],
      ],
    },
    {
      themeHint: "Mystery solver",
      rungs: [
        ["HINT", "Subtle clue helping solve a puzzle"],
        ["MINT", "Aromatic herb or coin factory"],
        ["MIST", "Light morning fog near the ground"],
        ["LIST", "Ordered series of written items"],
        ["LOST", "Unable to find the way"],
      ],
    },
    {
      themeHint: "City transit",
      rungs: [
        ["ROAD", "Paved route for vehicles"],
        ["LOAD", "Heavy cargo carried by a truck"],
        ["LOAF", "Baked block of bread"],
        ["LEAF", "Green blade growing on a branch"],
        ["LEAP", "Spring forward in a big jump"],
      ],
    },
    {
      themeHint: "Night sky",
      rungs: [
        ["MOON", "Earth's natural rocky satellite"],
        ["SOON", "In a very short time"],
        ["SOOT", "Black powdery residue from smoke"],
        ["FOOT", "Unit equal to twelve inches"],
        ["FORT", "Strong defensive military building"],
      ],
    },
    {
      themeHint: "Campfire tale",
      rungs: [
        ["WOOD", "Hard fibrous material from trees"],
        ["GOOD", "Morally right or high quality"],
        ["HOOD", "Covering for the head on a jacket"],
        ["HOLD", "Grasp firmly in your hands"],
        ["BOLD", "Fearless and daring"],
      ],
    },
    {
      themeHint: "Deep sea dive",
      rungs: [
        ["FISH", "Gill-breathing aquatic animal"],
        ["WISH", "Hope strongly for something"],
        ["WASH", "Clean using soap and water"],
        ["CASH", "Physical paper and coin money"],
        ["CAST", "Throw a fishing line into water"],
      ],
    },
    {
      themeHint: "Chess strategy",
      rungs: [
        ["MOVE", "Shift a piece to another square"],
        ["MORE", "A greater quantity or degree"],
        ["WORE", "Had clothing on the body"],
        ["WORK", "Mental or physical effort"],
        ["FORK", "Simultaneous attack on two pieces"],
      ],
    },
    {
      themeHint: "Morning brew",
      rungs: [
        ["BEAN", "Roasted seed used to brew coffee"],
        ["MEAN", "Signify or intend"],
        ["MEAT", "Animal flesh eaten as food"],
        ["HEAT", "Thermal energy used for boiling"],
        ["NEAT", "Tidy and well organized"],
      ],
    },
  ];

  // Auto-fix any ladder where two steps weren't 1 letter apart before emitting
  const fixedLadders: CrossclimbPuzzle[] = [];
  const validOneDiff = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let diffs = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diffs++;
    return diffs === 1;
  };

  for (let i = 0; i < rawLadders.length; i++) {
    const item = rawLadders[i];
    const rungs = item.rungs.map(([word, clue]) => ({ word, clue }));
    const p: CrossclimbPuzzle = {
      id: `crossclimb-${i + 1}`,
      themeHint: item.themeHint,
      rungs,
    };
    const ok = rungs.every(
      (r, idx) => idx === rungs.length - 1 || validOneDiff(r.word, rungs[idx + 1].word),
    );
    if (!ok) {
      // Log exact mismatch so we fix it cleanly right here
      const badAt = rungs.findIndex(
        (r, idx) => idx < rungs.length - 1 && !validOneDiff(r.word, rungs[idx + 1].word),
      );
      throw new Error(
        `Crossclimb #${i + 1} (${item.themeHint}) invalid transition at ${badAt}: ${rungs[badAt]?.word} -> ${rungs[badAt + 1]?.word}`,
      );
    }
    if (
      !validateCrossclimb(
        p,
        rungs.map((r) => r.word),
      )
    ) {
      throw new Error(`Crossclimb #${i + 1} failed validateCrossclimb`);
    }
    fixedLadders.push(p);
  }

  return fixedLadders;
}

// ---------------------------------------------------------------------------
// 8. WEND GENERATOR (4x4 grids verified with 8-directional word DFS)
// ---------------------------------------------------------------------------
const WEND_DICT_RAW = `
ABLE ACID ACRE AGED AIDE ARCH AREA ARMY ARTS ATOM AUNT AUTO AWAY AXIS BABY BACK BAIL BAIT BAKE BALD BALL BALM BAND BANE BANG BANK BARE BARK BARN BASE BASH BASK BASS BATH BEAD BEAK BEAM BEAN BEAR BEAT BECK BEEF BEEN BEER BELL BELT BEND BENT BERG BEST BETA BIAS BIDE BIKE BILE BILL BIND BIRD BITE BLAB BLAD BLAM BLAT BLED BLEW BLIP BLOB BLOC BLOG BLOT BLOW BLUE BLUR BOAR BOAT BODE BODY BOIL BOLD BOLT BOMB BOND BONE BOOK BOOM BOON BOOT BORE BORN BOSS BOTH BOUT BOWL BRAG BRAN BRAT BRAY BRED BREW BRIE BRIG BRIM BRIN BRIT BROW BUCK BUFF BULB BULK BULL BUMP BUNK BUNT BUOY BURN BURP BURR BURY BUSH BUSY BUZZ BYTE CAFE CAGE CAKE CALF CALL CALM CAME CAMP CANE CANT CAPE CARD CARE CARL CARP CART CASE CASH CASK CAST CATS CAVE CELL CENT CHAT CHEF CHEM CHEW CHIC CHIN CHIP CHOP CHOW CHUG CHUM CITE CITY CLAD CLAM CLAN CLAP CLAW CLAY CLEF CLEW CLIP CLOD CLOG CLOP CLOT CLUB CLUE COAL COAT COAX COBB CODE COED COIL COIN COLD COLE COLT COMA COMB COME CONE COOK COOL COOP COPE COPY CORD CORE CORK CORN COST COSY COVE COWL COZY CRAB CRAG CRAM CRAN CRAP CRAW CREW CRIB CRIM CROP CROW CRUD CRUX CUBE CUFF CULL CULT CURB CURD CURE CURL CURT CUSP CUTE CYAN DACE DADA DAME DAMP DARE DARK DARN DART DASH DATA DATE DAWN DAYS DAZE DEAD DEAF DEAL DEAN DEAR DEBT DECK DEED DEEM DEEP DEER DEFY DELI DELL DEMO DENT DENY DESK DEWY DIAL DICE DIED DIET DIME DINE DING DINT DIRE DIRT DISC DISH DISK DIVE DOCK DOER DOES DOFF DOLE DOLL DOME DONE DOOM DOOR DOPE DORM DOSE DOTE DOTH DOUG DOUR DOVE DOWN DOZE DRAB DRAG DRAM DRAW DRAY DREW DRIP DROP DRUB DRUG DRUM DUAL DUCK DUCT DUDE DUEL DUET DUKE DULL DULY DUMB DUMP DUNE DUNG DUNK DUSK DUST DUTY DYAD DYED DYER EACH EARL EARN EARS EASE EAST EASY EATS ECHO ECRU EDDY EDGE EDGY EDIT EELS EGAD EGGS EGIS EGRET ELSE EMIR EMIT ENDS ENVY EPIC ERGO ETCH EURO EVEN EVER EVIL EXAM EXEC EXIT EXPO EYED EYES FACE FACT FADE FAIL FAIN FAIR FAKE FALL FAME FANG FARE FARM FAST FATE FAUN FAWN FAZE FEAR FEAT FEED FEEL FEES FEET FELL FELT FEND FERN FEST FEUD FIAT FIBS FIEF FIFE FILE FILL FILM FIND FINE FINK FINN FIRE FIRM FISH FIST FIVE FIXE FIZZ FLAB FLAG FLAK FLAM FLAN FLAP FLAT FLAW FLAX FLAY FLEA FLED FLEE FLEW FLEX FLIP FLIT FLOE FLOG FLOP FLOW FLUB FLUE FLUX FOAL FOAM FOBS FOCI FOES FOGS FOGY FOIL FOLD FOLK FOND FONT FOOD FOOL FOOT FORD FORE FORK FORM FORT FOUL FOUR FOWL FRAY FREE FRET FRIG FRIT FROG FROM FUEL FULL FUME FUND FUNK FURL FURY FUSE FUSS FUZE FUZZ GAFF GAGE GAIN GAIT GALA GALE GALL GAME GAMP GANG GAPE GARB GASH GASP GATE GAVE GAWK GAZE GEAR GEEK GEES GELD GELT GEMS GENE GENT GERM GETS GHEE GIFT GILD GILL GILT GIMP GIRD GIRL GIRT GIVE GLAD GLEE GLEN GLIB GLIM GLOB GLOM GLOP GLOW GLUE GLUM GLUT GNAR GNAT GNAW GOAD GOAL GOAT GODS GOES GOLD GOLF GONE GONG GOOD GOOF GOON GOOP GORE GORY GOSH GOTH GOUT GOWN GRAB GRAD GRAM GRAN GRAY GREW GREY GRID GRIG GRIM GRIN GRIP GRIT GROG GROK GROOM GROW GRUB GRUE GRUM GUAN GUAR GUCK GUDE GUFF GULF GULL GULP GUMS GUNK GURU GUSH GUST GUTS GUYS GYMS GYRE GYRO HACK HAFT HAIL HAIR HAKE HALE HALF HALL HALM HALO HALT HAME HAMS HAND HANG HANK HAPS HARD HARE HARK HARM HARP HART HASH HASP HAST HATE HATH HAUL HAVE HAWK HAZE HAZY HEAD HEAL HEAP HEAR HEAT HEED HEEL HEFT HEIR HELD HELL HELM HELP HEMP HEMS HENS HERB HERD HERE HERO HERS HEWN HICK HIDE HIGH HIKE HILL HILT HIND HINT HIRE HISN HISS HIST HITS HIVE HOAR HOAX HOBS HOCK HODS HOED HOER HOES HOGS HOLD HOLE HOLK HOLM HOLP HOLS HOLT HOLY HOME HOMO HONE HONK HOOD HOOF HOOK HOOP HOOT HOPE HOPS HORN HOSE HOST HOTS HOUR HOVE HOWE HOWF HOWK HOWL HOWS HUCK HUED HUES HUFF HUGE HUGS HULA HULK HULL HUMS HUMP HUNG HUNK HUNS HUNT HURL HURT HUSH HUSK HUTS HYMN HYPE HYPO IBEX ICED ICES ICON IDEA IDEM IDES IDLE IDLY IDOL IFFY IGLU IKON ILIA ILKS ILLS IMAM IMPI INCH INFO INKS INKY INNS INTO IONS IOTA IRIS IRKS IRON ISLE ISMS ITCH ITEM IVES JACK JADE JAGS JAIL JAKE JAMB JAMS JANE JAPE JARS JATO JAWS JAYS JAZZ JEAN JEEP JEER JEES JEEZ JEFE JELL JERK JEST JETS JEUX JIBE JIBS JIFF JIGS JILT JINK JINN JINX JIVE JOBS JOCK JOES JOEY JOGS JOHN JOIN JOKE JOKY JOLE JOLT JOSH JOSS JOTA JOTS JOUK JOWL JOWS JOYS JUDO JUGS JUJU JUKE JUMP JUNE JUNK JUPE JURA JURY JUST JUTE JUTS KALE KAME KAMI KANA KANE KAON KAPA KAPH KART KATA KATS KAVA KAYO KAYS KBAR KEAS KECK KEEL KEEN KEEP KEET KEFS KEGS KELP KELT KEMP KENO KENS KENT KEPI KEPS KEPT KERB KERF KERN KETO KEYS KHAF KHAN KHAT KHET KHIS KIBE KICK KIDS KIEF KIER KIFS KILL KILN KILO KILT KINA KIND KINE KING KINK KINO KINS KIPS KIRK KIRN KIRS KISS KIST KITE KITH KITS KIWI KNAP KNAR KNEE KNEW KNIT KNOB KNOP KNOT KNOW KNUR KOAN KOAS KOBS KOEL KOHL KOIS KOJI KOLA KOLO KOND KONK KOOK KOPH KOPS KORA KORE KORS KOTO KRIS KUDO KUDU KUES KUFI KUNA KUNE KURU KVAS KYAK KYAR KYAT KYES KYTE LABS LACE LACK LACS LACY LADE LADS LADY LAGS LAIC LAID LAIN LAIR LAKE LAKH LAKS LALL LAMA LAMB LAME LAMP LAMS LAND LANE LANG LANK LAPS LARD LARE LARK LARS LASE LASH LASS LAST LATE LATH LATS LAVA LAVE LAWS LAYE LAYS LAZE LAZY LEAD LEAF LEAK LEAL LEAN LEAP LEAR LEAS LEAT LECH LEED LEEK LEER LEES LEET LEFT LEGS LEHR LEIS LEKE LEKS LEKU LEND LENO LENS LENT LEPT LESS LEST LETS LEUD LEVA LEVO LEVY LEWD LEYS LIAR LIAS LIBS LICE LICH LICK LIDO LIDS LIED LIEN LIER LIES LIEU LIFE LIFT LIKE LILT LILY LIMA LIMB LIME LIMN LIMO LIMP LIMY LINE LING LINK LINN LINO LINS LINT LINY LION LIPA LIPE LIPS LIRE LIRI LISP LIST LITE LITS LITU LIVE LOAD LOAF LOAM LOAN LOBE LOBI LOBO LOBS LOCA LOCH LOCI LOCK LOCO LODE LOFT LOGE LOGO LOGS LOGY LOID LOIN LOLL LONE LONG LOOK LOOM LOON LOOP LOOR LOOS LOOT LOPE LOPS LORD LORE LORN LORY LOSE LOSS LOST LOTA LOTE LOTH LOTS LOUD LOUP LOUR LOUT LOVE LOWE LOWS LUAU LUBE LUCE LUCK LUDE LUDO LUES LUFF LUGE LUGS LULL LULU LUMP LUMS LUNA LUNE LUNG LUNK LUNT LUNY LURE LURK LUSH LUST LUTE LUTZ LUXE LWEI LYCH LYES LYNX LYRE LYSE MAAR MABE MACE MACH MACK MACS MADE MADS MAGE MAGI MAGS MAID MAIL MAIM MAIN MAIR MAKE MAKO MALE MALL MALM MALT MAMA MANA MAND MANE MANO MANS MANY MAPS MARA MARC MARE MARK MARL MARS MART MARY MASH MASK MASS MAST MATE MATH MATS MATT MAUD MAUL MAUN MAUT MAWN MAWS MAXI MAYA MAYO MAYS MAZE MAZY MEAD MEAL MEAN MEAT MECK MEDS MEED MEEK MEET MEGA MEGS MELD MELL MELO MELT MEME MEMO MEMS MEND MENO MENU MEOW MERC MERE MERK MERL MESA MESH MESS META METE METH METS MEWL MEWS MEZE MHOS MIBS MICA MICE MICK MICS MIDI MIDS MIEN MIFF MIGG MIGS MIKE MILD MILE MILK MILL MILO MILS MILT MIME MINA MIND MINE MING MINI MINK MINO MINT MINX MIRE MIRI MIRK MIRS MIRY MISE MISO MISS MIST MITE MITT MITY MIXT MOAN MOAS MOAT MOBS MOCK MOCS MODE MODI MODS MOGS MOIL MOJO MOKE MOLA MOLD MOLE MOLL MOLT MOLY MOME MOMI MOMS MONK MONO MONS MONY MOOD MOOL MOON MOOR MOOS MOOT MOPE MOPS MOPY MORA MORE MORN MORS MORT MOSH MOSK MOSS MOST MOTE MOTH MOTS MOTT MOUE MOVE MOWN MOWS MOXA MOZO MUCH MUCK MUDS MUFF MUGG MUGS MULE MULL MUMM MUMP MUMS MUMU MUNG MUNI MUNS MUON MURA MURE MURK MURR MUSE MUSH MUSK MUSO MUSS MUST MUTE MUTS MUTT MYCS MYNA MYTH NAAN NABE NABS NADA NAFF NAGS NAIF NAIL NAIR NAME NANA NANS NAOI NAOS NAPA NAPE NAPS NARC NARD NARK NARY NAVE NAVY NAYS NEAP NEAR NEAT NEBS NECK NEED NEEM NEEP NEGS NEIF NEMA NENE NEON NERD NERK NESH NEST NETS NETT NEUK NEUM NEVE NEVI NEWS NEWT NEXT NIBS NICE NICK NIDE NIDI NIGH NILL NILS NIMB NIMS NINE NIPA NIPS NISI NITE NITS NIXE NIXY NOAH NOBS NOCK NODE NODI NODS NOEL NOES NOGG NOGS NOIL NOIR NOLE NOLL NOLO NOMA NOME NOMS NONA NONE NOOK NOON NOPE NORI NORM NOSE NOSY NOTA NOTE NOUN NOUP NOUS NOWS NOWT NUBS NUDE NUKE NULL NUMB NUNS NURD NURL NURS NUTS NYAS NYED NYES OAFS OAKS OAKY OARS OAST OATH OATS OBAS OBES OBEY OBIA OBIS OBIT OBOE OBOL OCAS ODAS ODDS ODEA ODES ODIC ODOR ODYL OFAY OFFS OGAM OGEE OGLE OGRE OHED OHIA OHMS OILS OILY OINK OKAS OKAY OKEH OKES OKRA OLDS OLDY OLEA OLEO OLES OLIO OLLA OMEN OMER OMIT ONCE ONER ONES ONLY ONOS ONTO ONUS ONYX OOHS OOMS OONS OONT OOPS OOSE OOSY OOTS OOZE OOZY OPAL OPED OPEN OPES OPTS OPUS ORAD ORAL ORBS ORBY ORCA ORCS ORDO ORES ORGY ORLE ORRA ORTS ORYX ORZO OSAR OSES OSSA OTIC OTTO OUDS OUPH OURN OURS OUST OUTS OUZO OVAL OVEN OVER OVUM OWED OWES OWLS OWLY OWNS OWSE OXEN OXES OXID OXIM OYER OYES OYEZ PACE PACK PACS PACT PACY PADI PADS PAGE PAID PAIK PAIL PAIN PAIR PALE PALL PALM PALP PALS PALY PAMS PANE PANG PANS PANT PAPA PAPS PARA PARD PARE PARK PARR PARS PART PASE PASH PASS PAST PATE PATH PATS PATY PAVE PAWL PAWN PAWS PAYS PEAG PEAK PEAL PEAN PEAR PEAS PEAT PECH PECK PECS PEDS PEED PEEK PEEL PEEN PEEP PEER PEES PEGS PEHS PEIN PEKE PELA PELE PELF PELL PELT PEND PENE PENI PENK PENS PENT PEON PEPO PEPS PERE PERI PERK PERM PERP PERT PERV PESO PEST PETS PEWS PFFT PFUI PHAT PHEW PHIS PHIZ PHOH PHON PHOT PHUT PIAL PIAN PIAS PICA PICE PICK PICS PIED PIER PIES PIGS PIKA PIKE PIKI PILA PILE PILI PILL PILY PIMA PIMP PINA PINE PING PINK PINS PINT PINY PION PIPE PIPI PIPS PIPY PIRN PISH PISO PISS PITA PITH PITS PITY PIXY PLAN PLAT PLAY PLEA PLEB PLED PLEW PLEX PLIE PLOD PLOP PLOT PLOW PLOY PLUG PLUM PLUS POCK POCO PODS POEM POET POGY POIS POKE POKY POLE POLL POLO POLS POLY POME POMO POMP POMS POND PONE PONG PONS PONY POOD POOF POOH POOK POOL POON POOP POOR POOS POOT POPE POPS PORE PORK PORN PORT POSE POSH POST POSY POTS POUF POUR POUT POWS POXY PRAM PRAO PRAT PRAU PRAY PREE PREM PREP PREX PREY PRIG PRIM PROA PROB PROD PROF PROG PROM PROP PROS PROW PRYS PSIS PSST PTUI PUBS PUCE PUCK PUDS PUFF PUGH PUGS PUJA PUKE PULA PULE PULI PULK PULL PULP PULS PULU PULY PUMA PUMP PUNA PUNG PUNK PUNS PUNT PUNY PUPA PUPS PUPU PURE PURI PURL PURR PURS PUSH PUSS PUTS PUTT PUTZ PYAS PYES PYIC PYIN PYRE PYRO QADI QAID QATS QOPH QUAD QUAG QUAI QUAY QUEY QUID QUIN QUIP QUIT QUIZ QUOD RACE RACK RACY RADS RAFF RAGA RAGE RAGG RAGS RAIA RAID RAIL RAIN RAIS RAJA RAKE RAKI RAKU RALE RAMI RAMP RAMS RAND RANG RANI RANK RANT RAPE RAPS RAPT RARE RASE RASH RASP RATE RATH RATO RATS RAVE RAWS RAYA RAYS RAZE RAZZ READ REAL REAM REAP REAR REBS RECK RECS REDD REDE REDO REDS REED REEF REEK REEL REES REFS REFT REGS REIF REIN REIS REMS REND RENT REPO REPP REPS RESH REST RETE RETS REVS RHEA RHOS RHUS RIAL RIAS RIBS RICE RICH RICK RIDE RIDS RIFE RIFF RIFS RIFT RIGS RILE RILL RIME RIMS RIMY RIND RING RINK RINS RIOT RIPE RIPS RISE RISK RITE RITZ ROAD ROAM ROAN ROAR ROBE ROBS ROCK RODE RODS ROES ROIL ROLE ROLF ROLL ROME ROMP ROMS ROOD ROOF ROOK ROOM ROOT ROPE ROPY ROSE ROSY ROTA ROTE ROTI ROTL ROTO ROTS ROUE ROUP ROUT ROUX ROVE ROWS RUBE RUBS RUBY RUCK RUDD RUDE RUED RUER RUES RUFF RUGA RUGS RUIN RULE RULY RUMP RUMS RUNE RUNG RUNS RUNT RUSE RUSH RUSK RUST RUTH RUTS RYAHS RYAS RYES RYKE RYND RYOT SABE SABS SACK SACS SADE SADI SAFE SAGA SAGE SAGO SAGS SAGY SAID SAIL SAIN SAIR SAKE SAKI SALE SALL SALP SALS SALT SAME SAMP SAND SANE SANG SANK SANS SAPS SARD SARI SARK SASH SASS SATE SATI SAUL SAVE SAWN SAWS SAYS SCAB SCAD SCAG SCAM SCAN SCAR SCAT SCOP SCOT SCOW SCRY SCUD SCUM SCUP SCUT SEAL SEAM SEAR SEAS SEAT SECS SECT SEED SEEK SEEL SEEM SEEN SEEP SEER SEES SEGO SEGS SEIF SEIS SELF SELL SELS SEME SEMI SEND SENE SENT SEPT SERA SERE SERF SERS SETA SETS SETT SEWN SEWS SEXT SEXY SHAD SHAG SHAH SHAM SHAT SHAW SHAY SHEA SHED SHES SHEW SHIM SHIN SHIP SHIT SHIV SHMO SHOD SHOE SHOG SHOO SHOP SHOT SHOW SHRI SHUL SHUN SHUT SHWA SIAL SIBB SIBS SICE SICK SICS SIDE SIDH SIFT SIGH SIGN SIJO SIKA SIKE SILD SILK SILL SILO SILT SIMA SIMP SIMS SINE SING SINH SINK SINS SIPE SIPS SIRE SIRI SIRS SITE SITH SITS SIZE SIZY SKAG SKAS SKAT SKEE SKEG SKEP SKEW SKID SKIM SKIN SKIP SKIS SKIT SKUA SLAB SLAG SLAM SLAP SLAT SLAW SLAY SLED SLEW SLID SLIM SLIP SLIT SLOB SLOE SLOG SLOP SLOT SLOW SLUB SLUE SLUG SLUM SLUR SLUT SMEW SMIT SMOG SMUG SMUT SNAG SNAP SNAW SNED SNIB SNIP SNIT SNOB SNOG SNOT SNOW SNUB SNUG SNYE SOAK SOAP SOAR SOBS SOCA SOCK SODA SODS SOFA SOFT SOIL SOJA SOKE SOLA SOLD SOLE SOLI SOLO SOLS SOMA SOME SOMS SONE SONG SONS SOOK SOON SOOT SOPH SOPS SORA SORB SORD SORE SORI SORN SORT SOSS SOTH SOTS SOUK SOUL SOUP SOUR SOUS SOUT SOWN SOWS SOYA SOYS SPAE SPAM SPAN SPAR SPAS SPAT SPAY SPAZ SPEC SPED SPEW SPIC SPED SPIN SPIT SPIV SPOT SPRY SPUD SPUE SPUN SPUR SRIS STAB STAG STAR STAT STAW STAY STEM STEP STEW STEY STIR STOA STOB STOP STOT STOW STUB STUD STUM STUN STYE SUBA SUBS SUCH SUCK SUDS SUED SUER SUES SUET SUGH SUIT SULK SULU SUMO SUMP SUMS SUNG SUNK SUNN SUNS SUPE SUPS SUQS SURA SURD SURE SURF SUSS SWAB SWAG SWAM SWAN SWAP SWAT SWAY SWIG SWIM SWOB SWOP SWOT SWUM SYBO SYCE SYKE SYLI SYNC SYNE SYPH TABS TABU TACE TACH TACK TACO TACT TADS TAEL TAGS TAHA TAIL TAIN TAKE TALA TALC TALE TALI TALK TALL TAME TAMP TAMS TANG TANK TANS TAOS TAPA TAPE TAPS TARE TARN TARO TARP TARS TART TASK TASS TATE TATS TAUS TAUT TAVS TAWS TAXA TAXI TEAK TEAL TEAM TEAR TEAS TEAT TECH TEDS TEDY TEED TEEK TEEL TEEM TEEN TEES TEFF TEGG TEGS TEGU TEHR TEIL TELA TELD TELE TELL TELS TELT TEMP TEND TENE TENS TENT TEPA TERM TERN TEST TETH TETS TEWS TEXT THAE THAN THAT THAW THEE THEM THEN THEW THEY THIN THIO THIR THIS THOU THRO THRU THUD THUG THUS TICK TICS TIDE TIDY TIED TIER TIES TIFF TIFT TIGE TIGS TIKE TIKI TILE TILL TILS TILT TIME TINE TING TINK TINS TINT TINY TIPI TIPS TIRE TIRL TIRO TITR TITS TIVY TOAD TOBY TODS TODY TOEA TOED TOES TOFF TOFT TOFU TOGA TOGS TOIL TOIT TOKE TOLA TOLD TOLE TOLL TOLT TOLU TOMB TOME TOMS TONE TONG TONK TONS TONY TOOK TOOL TOOM TOON TOOT TOPE TOPH TOPI TOPO TOPS TORA TORC TORE TORI TORN TORO TORR TORS TORT TORY TOSH TOSS TOST TOTE TOTS TOUK TOUN TOUR TOUT TOWN TOWS TOWY TOYO TOYS TRAD TRAM TRAP TRAY TREE TREF TREK TRES TRET TREW TREY TRIG TRIM TRIO TRIP TROD TROG TROP TROT TROW TROY TRUE TRUG TSAR TSKS TUBA TUBE TUBS TUCK TUFA TUFF TUFT TUGS TUIS TULE TUMP TUNA TUNE TUNG TUNS TUPS TURD TURF TURK TURN TUSH TUSK TUTS TUTU TWAE TWAS TWAT TWEE TWIG TWIN TWIT TWOS TYEE TYER TYES TYIN TYKE TYNE TYPE TYPO TYPP TYPY TYRE TYRO TZAR UDAL UDON UDOS UGHS UKES ULAN ULNA ULUS ULVA UMBO UMPS UNCI UNCO UNDE UNDO UNDY UNIT UNTO UPAS UPBY UPDO UPON URBS URDS UREA URGE URNS URPS URSA URUS USED USER USES UTAS UTES UTIS VACS VAGI VAIL VAIN VAIR VALE VAMP VANE VANG VANS VARA VARS VARY VASA VASE VAST VATS VATU VAUS VAVS VAWS VEAL VEEP VEER VEES VEGA VEIL VEIN VELA VELD VENA VEND VENT VERA VERB VERT VERY VEST VETO VETS VEXT VIAE VIAL VIAS VIBE VIBS VICE VIDE VIDS VIED VIER VIES VIEW VIGA VIGS VILE VILL VIMS VINA VINE VINO VINY VIOL VIRE VIRL VISA VISE VITA VITE VIVA VIVE VIVO VIZY VOES VOID VOLE VOLT VOTE VOWS VROW VUGG VUGH VUGS VULN WAAC WABS WACK WADE WADI WADS WADY WAES WAFF WAFT WAGE WAGS WAIF WAIL WAIN WAIR WAIT WAKE WALE WALK WALL WALY WAME WAND WANE WANK WANS WANT WANY WAPS WARD WARE WARK WARM WARN WARP WARS WART WARY WASH WASP WAST WATS WATT WAUK WAUL WAUR WAVE WAVY WAWA WAWE WAWL WAWS WAXY WAYS WEAK WEAL WEAN WEAR WEBS WEDS WEED WEEK WEEL WEEN WEEP WEER WEES WEET WEFT WEIR WEKA WELD WELL WELT WEND WENS WENT WEPT WERE WERT WEST WETS WHAM WHAP WHAT WHEE WHEN WHET WHEW WHEY WHID WHIG WHIM WHIN WHIP WHIR WHIT WHIZ WHOA WHOM WHOP WHOT WHOW WHUP WHYS WICH WICK WIDE WIFE WIGS WILD WILE WILL WILT WILY WIMP WIND WINE WING WINK WINN WINO WINS WINY WIPE WIRE WIRY WISE WISH WISP WISS WIST WITE WITH WITS WIVE WOAD WOCK WOES WOGS WOKE WOKS WOLD WOLF WOMB WONK WONS WONT WOOD WOOF WOOL WOON WOOS WOOT WOPS WORD WORE WORK WORM WORN WORT WOST WOTS WOVE WOWF WOWS WRAN WRAP WREN WRIT WUSS WYCH WYES WYLE WYND WYNN WYNS WYTE XYST YACK YADS Yaff YAGI YAGS YAHS YAKS YALD YAMS YANG YANK YAPS YARD YARE YARN YAUD YAUP YAWL YAWN YAWP YAWS YAWY YAYS YBET YEAD YEAH YEAN YEAR YEAS YEBO YECH YEDE YEED YEGG YELD YELK YELL YELM YELP YENS YEPS YERD YERK YESK YEST YETI YETT YEUK YEWS YGOE YIDS YIKE YILL YINS YIPE YIPS YIRD YIRK YIRR YITE YLEM YLKE YOND YONI YONT YOOF YOOP YORE YORK YOUK YOUR YOWE YOWL YOWS YUAN YUCA YUCH YUCK YUFT YUGA YUGS YUKE YUKO YUKS YULE YUPS YURT YUTZ YWIS ZAGS ZANY ZAPS ZARF ZEAL ZEBU ZEDS ZEES ZEIN ZEKS ZELS ZEPS ZERK ZERO ZEST ZETA ZIGS ZILL ZINC ZINE ZING ZINS ZIPS ZITI ZITS ZOEA ZOIC ZONA ZONE ZONK ZOOM ZOON ZOOS ZORI ZOUK ZYME
ABOUT ABOVE ACTOR ACUTE ADMIT ADOPT ADULT AFTER AGAIN AGENT AGREE AHEAD ALARM ALBUM ALERT ALIKE ALIVE ALLOW ALONE ALONG ALTER AMONG ANGER ANGLE ANGRY APART APPLE APPLY ARENA ARGUE ARISE ARRAY ASIDE ASSET AUDIO AUDIT AVOID AWARD AWARE BADLY BAKER BASES BASIC BASIS BEACH BEGAN BEGIN BEGUN BEING BELOW BENCH BILLY BIRTH BLACK BLAME BLIND BLOCK BLOOD BOARD BOOST BOOTH BOUND BRAIN BRAND BREAD BREAK BREED BRIEF BRING BROAD BROKE BROWN BUILD BUILT BUYER CABLE CALIF CARRY CATCH CAUSE CHAIN CHAIR CHART CHASE CHEAP CHECK CHEST CHIEF CHILD CHINA CHOSE CIVIL CLAIM CLASS CLEAN CLEAR CLICK CLOCK CLOSE COACH COAST COULD COUNT COURT COVER CRAFT CRASH CREAM CRIME CROSS CROWD CROWN CURVE CYCLE DAILY DANCE DATED DEALT DEATH DEBUT DELAY DEPTH DOING DOUBT DOZEN DRAFT DRAMA DRAWN DREAM DRESS DRINK DRIVE DROVE DYING EAGER EARLY EARTH EIGHT ELITE EMPTY ENEMY ENJOY ENTER ENTRY EQUAL ERROR EVENT EVERY EXACT EXIST EXTRA FAITH FALSE FAULT FIBER FIELD FIFTH FIFTY FIGHT FINAL FIRST FIXED FLASH FLEET FLOOR FLUID FOCUS FORCE FORTH FORTY FORUM FOUND FRAME FRANK FRAUD FRESH FRONT FRUIT FULLY FUNNY GIANT GIVEN GLASS GLOBE GOING GRACE GRADE GRAND GRANT GRASS GREAT GREEN GROSS GROUP GROWN GUARD GUESS GUEST GUIDE HAPPY HARRY HEART HEAVY HENCE HENRY HORSE HOTEL HOUSE HUMAN IDEAL IMAGE INDEX INNER INPUT ISSUE JAPAN JIMMY JOINT JONES JUDGE KNOWN LABEL LARGE LASER LATER LAUGH LAYER LEARN LEASE LEAST LEAVE LEGAL LEVEL LEWIS LIGHT LIMIT LINKS LIVES LOCAL LOGIC LOOSE LOWER LUCKY LUNCH LYING MAGIC MAJOR MAKER MARCH MARIA MATCH MAYBE MAYOR MEANT MEDIA METAL MIGHT MINOR MINUS MIXED MODEL MONEY MONTH MORAL MOTOR MOUNT MOUSE MOUTH MOVIE MUSIC NEEDS NEVER NEWLY NIGHT NOISE NORTH NOTED NOVEL NURSE OCCUR OCEAN OFFER OFTEN ORDER OTHER OUGHT PAINT PAPER PARTY PEACE PETER PHASE PHONE PHOTO PIECE PILOT PITCH PLACE PLAIN PLANE PLANT PLATE POINT POUND POWER PRESS PRICE PRIDE PRIME PRINT PRIOR PRIZE PROOF PROUD PROVE QUEEN QUICK QUIET QUITE RADIO RAISE RANGE RAPID RATIO REACH REACT READY REFER RIGHT RIVAL RIVER ROBIN ROGER ROMAN ROUGH ROUND ROUTE ROYAL RURAL SCALE SCENE SCOPE SCORE SENSE SERVE SEVEN SHALL SHAPE SHARE SHARP SHEET SHELF SHELL SHIFT SHIRT SHOCK SHOOT SHORT SHOWN SIGHT SINCE SIXTH SIXTY SIZED SKILL SLEEP SLIDE SMALL SMART SMILE SMITH SMOKE SOLID SOLVE SORRY SOUND SOUTH SPACE SPARE SPEAK SPEED SPEND SPENT SPLIT SPOKE SPORT STAFF STAGE STAKE STAND START STATE STEAM STEEL STICK STILL STOCK STONE STOOD STORE STORM STORY STRIP STUCK STUDY STUFF STYLE SUGAR SUITE SUPER SWEET TABLE TAKEN TASTE TAXES TEACH TEETH TERMY THANK THEFT THEIR THEME THERE THESE THICK THING THINK THIRD THOSE THREE THREW THROW TIGHT TIMES TIRED TITLE TODAY TOPIC TOTAL TOUCH TOUGH TOWER TRACK TRADE TRAIN TREAT TREND TRIAL TRIED TRIES TRUCK TRULY TRUST TRUTH TWICE UNDER UNDUE UNION UNITY UNTIL UPPER UPSET URBAN USAGE USUAL VALID VALUE VIDEO VIRUS VISIT VITAL VOICE WASTE WATCH WATER WHEEL WHERE WHICH WHILE WHITE WHOLE WHOSE WOMAN WOMEN WORLD WORRY WORSE WORST WORTH WOULD WOUND WRITE WRONG WROTE YIELD YOUNG YOUTH
`;

function generateWendPuzzles(count: number): WendPuzzle[] {
  const rng = createRng(8008);
  const dictWords = Array.from(
    new Set(
      WEND_DICT_RAW.split(/\s+/)
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w.length >= 4 && w.length <= 6 && /^[A-Z]+$/.test(w)),
    ),
  );
  const dictSet = new Set(dictWords);

  // Prefix set for fast DFS pruning
  const prefixes = new Set<string>();
  for (const w of dictWords) {
    for (let len = 1; len <= w.length; len++) {
      prefixes.add(w.slice(0, len));
    }
  }

  const findGridWords = (grid: string[][]): string[] => {
    const found = new Set<string>();
    const visited = Array.from({ length: 4 }, () => Array<boolean>(4).fill(false));

    const dfs = (r: number, c: number, current: string) => {
      if (!prefixes.has(current)) return;
      if (current.length >= 4 && dictSet.has(current)) {
        found.add(current);
      }
      if (current.length >= 6) return;

      visited[r][c] = true;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && !visited[nr][nc]) {
            dfs(nr, nc, current + grid[nr][nc]);
          }
        }
      }
      visited[r][c] = false;
    };

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        dfs(r, c, grid[r][c]);
      }
    }
    return [...found].sort((a, b) => b.length - a.length || a.localeCompare(b));
  };

  // Weighted letter pool biased toward Boggle-friendly English vowels & common consonants
  const LETTER_POOL =
    "EEEEEEEEAAAAARRRRRTTTTTSSSSSIIIIINNNNNOOOOLLLLDDDDCCCCMMMMPPPPBBBGGHHFFYYWWKV";
  const puzzles: WendPuzzle[] = [];

  for (let idx = 0; idx < count; idx++) {
    let bestGrid: string[][] | null = null;
    let bestWords: string[] = [];

    for (let attempt = 0; attempt < 60; attempt++) {
      const grid = Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => LETTER_POOL[Math.floor(rng() * LETTER_POOL.length)]),
      );

      // Seed 2 anchor 4-letter words on random walks so grid always feels rich
      for (let s = 0; s < 2; s++) {
        const w = dictWords[Math.floor(rng() * dictWords.length)].slice(0, 4);
        let r = Math.floor(rng() * 4);
        let c = Math.floor(rng() * 4);
        const used = new Set<string>([`${r},${c}`]);
        grid[r][c] = w[0];
        for (let k = 1; k < w.length; k++) {
          const opts: [number, number][] = [];
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && !used.has(`${nr},${nc}`)) {
                opts.push([nr, nc]);
              }
            }
          }
          if (opts.length === 0) break;
          const [nr, nc] = opts[Math.floor(rng() * opts.length)];
          r = nr;
          c = nc;
          used.add(`${r},${c}`);
          grid[r][c] = w[k];
        }
      }

      const words = findGridWords(grid);
      if (words.length > bestWords.length) {
        bestWords = words;
        bestGrid = grid;
      }
      if (words.length >= 18) break;
    }

    if (!bestGrid || bestWords.length < 8) {
      throw new Error(`Failed to generate rich Wend grid #${idx + 1} (found ${bestWords.length})`);
    }

    const targetWords = bestWords.slice(0, 35);
    const minWordsToWin = Math.min(6, Math.max(4, Math.floor(targetWords.length / 3)));

    const puzzle: WendPuzzle = {
      id: `wend-${idx + 1}`,
      grid: bestGrid,
      minWordsToWin,
      targetWords,
    };

    for (const w of targetWords) {
      if (!canTraceWordInGrid(puzzle.grid, w)) {
        throw new Error(`Wend #${idx + 1} word ${w} not traceable`);
      }
    }
    if (!validateWend(puzzle, targetWords.slice(0, minWordsToWin))) {
      throw new Error(`Wend #${idx + 1} failed validateWend`);
    }

    puzzles.push(puzzle);
  }

  return puzzles;
}

// ---------------------------------------------------------------------------
// MAIN ENTRYPOINT
// ---------------------------------------------------------------------------
function main() {
  const outDir = path.join(process.cwd(), "data", "puzzles");
  fs.mkdirSync(outDir, { recursive: true });

  const COUNT = 36;
  console.log(`Generating ${COUNT} verified puzzles per game...`);

  const queens = generateQueensPuzzles(COUNT);
  console.log(`✓ queens: ${queens.length}`);

  const tango = generateTangoPuzzles(COUNT);
  console.log(`✓ tango: ${tango.length}`);

  const miniSudoku = generateMiniSudokuPuzzles(COUNT);
  console.log(`✓ mini-sudoku: ${miniSudoku.length}`);

  const pinpoint = getPinpointPuzzles();
  console.log(`✓ pinpoint: ${pinpoint.length}`);

  const crossclimb = getCrossclimbPuzzles();
  console.log(`✓ crossclimb: ${crossclimb.length}`);

  const patches = generatePatchesPuzzles(COUNT);
  console.log(`✓ patches: ${patches.length}`);

  const zip = generateZipPuzzles(COUNT);
  console.log(`✓ zip: ${zip.length}`);

  const wend = generateWendPuzzles(COUNT);
  console.log(`✓ wend: ${wend.length}`);

  const files: [string, unknown][] = [
    ["queens.json", queens],
    ["tango.json", tango],
    ["mini-sudoku.json", miniSudoku],
    ["pinpoint.json", pinpoint],
    ["crossclimb.json", crossclimb],
    ["patches.json", patches],
    ["zip.json", zip],
    ["wend.json", wend],
  ];

  for (const [name, data] of files) {
    fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  console.log("All 8 puzzle banks generated & verified!");
}

main();
