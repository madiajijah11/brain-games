import {
  QueensPuzzle,
  TangoPuzzle,
  MiniSudokuPuzzle,
  PinpointPuzzle,
  CrossclimbPuzzle,
  PatchesPuzzle,
  ZipPuzzle,
  WendPuzzle,
  GameSlug,
  AnyPuzzleDefinition,
} from "./types";
import { coordsSignature, getAllRotations, hasWallBetween, canTraceWordInGrid } from "./geometry";

/**
 * Queens Validator:
 * - Exactly N crowns on an NxN board.
 * - Exactly 1 crown per row.
 * - Exactly 1 crown per column.
 * - Exactly 1 crown per color region.
 * - No two crowns touch horizontally, vertically, or diagonally.
 */
export function validateQueens(puzzle: QueensPuzzle, userCrowns: [number, number][]): boolean {
  const N = puzzle.size;
  if (!Array.isArray(userCrowns) || userCrowns.length !== N) return false;

  const rows = new Set<number>();
  const cols = new Set<number>();
  const regions = new Set<number>();

  for (let i = 0; i < userCrowns.length; i++) {
    const [r, c] = userCrowns[i];
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    if (rows.has(r) || cols.has(c)) return false;

    const reg = puzzle.regions[r]?.[c];
    if (reg === undefined || regions.has(reg)) return false;

    rows.add(r);
    cols.add(c);
    regions.add(reg);

    // Check adjacent 8 cells against previous crowns
    for (let j = 0; j < i; j++) {
      const [prevR, prevC] = userCrowns[j];
      const dR = Math.abs(r - prevR);
      const dC = Math.abs(c - prevC);
      if (dR <= 1 && dC <= 1) return false;
    }
  }

  return rows.size === N && cols.size === N && regions.size === N;
}

/**
 * Tango Validator:
 * - Grid filled completely with "S" (Sun) and "M" (Moon).
 * - Equal count of S and M in each row and column.
 * - No 3 identical symbols in a row or column (no SSS or MMM).
 * - Respects equality (=) and opposite (x) constraints.
 */
export function validateTango(puzzle: TangoPuzzle, grid: string[][]): boolean {
  const N = puzzle.size;
  if (!Array.isArray(grid) || grid.length !== N) return false;

  const half = N / 2;

  for (let r = 0; r < N; r++) {
    let sunCount = 0;
    let moonCount = 0;
    if (!Array.isArray(grid[r]) || grid[r].length !== N) return false;

    for (let c = 0; c < N; c++) {
      const val = grid[r][c];
      if (val === "S") sunCount++;
      else if (val === "M") moonCount++;
      else return false; // Incomplete

      // Check fixed clues from puzzle
      if (puzzle.initial[r][c] && puzzle.initial[r][c] !== val) return false;

      // Check max 2 consecutive horizontally
      if (c >= 2 && grid[r][c] === grid[r][c - 1] && grid[r][c] === grid[r][c - 2]) return false;
      // Check max 2 consecutive vertically
      if (r >= 2 && grid[r][c] === grid[r - 1][c] && grid[r][c] === grid[r - 2][c]) return false;
    }

    if (sunCount !== half || moonCount !== half) return false;
  }

  // Check column counts
  for (let c = 0; c < N; c++) {
    let sunCount = 0;
    let moonCount = 0;
    for (let r = 0; r < N; r++) {
      if (grid[r][c] === "S") sunCount++;
      else if (grid[r][c] === "M") moonCount++;
    }
    if (sunCount !== half || moonCount !== half) return false;
  }

  // Check equalities
  if (puzzle.equalities) {
    for (const eq of puzzle.equalities) {
      if (grid[eq.r1]?.[eq.c1] !== grid[eq.r2]?.[eq.c2]) return false;
    }
  }

  // Check opposites
  if (puzzle.opposites) {
    for (const op of puzzle.opposites) {
      if (grid[op.r1]?.[op.c1] === grid[op.r2]?.[op.c2]) return false;
    }
  }

  return true;
}

/**
 * Mini Sudoku Validator:
 * - 4x4 or 6x6 grid filled with 1..N.
 * - No duplicates in any row or column.
 * - No duplicates in any box.
 */
export function validateMiniSudoku(puzzle: MiniSudokuPuzzle, grid: number[][]): boolean {
  const N = puzzle.size;
  if (!Array.isArray(grid) || grid.length !== N) return false;

  for (let r = 0; r < N; r++) {
    const rowSet = new Set<number>();
    if (!Array.isArray(grid[r]) || grid[r].length !== N) return false;
    for (let c = 0; c < N; c++) {
      const val = grid[r][c];
      if (val < 1 || val > N || rowSet.has(val)) return false;
      if (puzzle.initial[r][c] && puzzle.initial[r][c] !== val) return false;
      rowSet.add(val);
    }
  }

  for (let c = 0; c < N; c++) {
    const colSet = new Set<number>();
    for (let r = 0; r < N; r++) {
      const val = grid[r][c];
      if (colSet.has(val)) return false;
      colSet.add(val);
    }
  }

  const { boxWidth, boxHeight } = puzzle;
  for (let br = 0; br < N; br += boxHeight) {
    for (let bc = 0; bc < N; bc += boxWidth) {
      const boxSet = new Set<number>();
      for (let r = br; r < br + boxHeight; r++) {
        for (let c = bc; c < bc + boxWidth; c++) {
          const val = grid[r][c];
          if (boxSet.has(val)) return false;
          boxSet.add(val);
        }
      }
    }
  }

  return true;
}

/**
 * Pinpoint Validator:
 * - Matches user guess against accepted answers / category (normalized, punctuation/article-tolerant).
 */
function normalizePinpointGuess(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['’".,!?-]/g, " ")
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validatePinpoint(puzzle: PinpointPuzzle, userGuess: string): boolean {
  if (typeof userGuess !== "string") return false;
  const normalized = normalizePinpointGuess(userGuess);
  if (!normalized) return false;

  const candidates = [puzzle.category, ...puzzle.acceptedAnswers].map(normalizePinpointGuess);
  return candidates.some((ans) => {
    if (!ans) return false;
    if (ans === normalized) return true;
    // Allow simple plural/singular equivalence for words >= 4 chars
    if (normalized.length >= 4 && `${normalized}s` === ans) return true;
    if (ans.length >= 4 && `${ans}s` === normalized) return true;
    return false;
  });
}

/**
 * Crossclimb Validator:
 * - Verifies user arranged words in valid order.
 * - Each adjacent word must differ by exactly 1 letter.
 */
export function validateCrossclimb(puzzle: CrossclimbPuzzle, userWords: string[]): boolean {
  if (!Array.isArray(userWords) || userWords.length !== puzzle.rungs.length) return false;

  const expectedWords = new Set(puzzle.rungs.map((r) => r.word.toUpperCase()));
  for (const w of userWords) {
    if (!expectedWords.has(w.toUpperCase())) return false;
  }

  // Check 1-letter diff between adjacent words
  for (let i = 0; i < userWords.length - 1; i++) {
    const w1 = userWords[i].toUpperCase();
    const w2 = userWords[i + 1].toUpperCase();
    if (w1.length !== w2.length) return false;

    let diffs = 0;
    for (let j = 0; j < w1.length; j++) {
      if (w1[j] !== w2[j]) diffs++;
    }
    if (diffs !== 1) return false;
  }

  return true;
}

/**
 * Patches Validator:
 * - Each puzzle shape ID used exactly once.
 * - Placed coordinates match one valid 90-degree rotation + translation of that shape.
 * - Placed polyomino coordinates match target board mask completely with 0 overlap.
 */
export function validatePatches(
  puzzle: PatchesPuzzle,
  placedShapes: { id: string; placedCoords: [number, number][] }[],
): boolean {
  if (!Array.isArray(placedShapes) || placedShapes.length !== puzzle.shapes.length) return false;

  const shapeById = new Map(puzzle.shapes.map((s) => [s.id, s]));
  const seenIds = new Set<string>();
  const covered = new Set<string>();

  for (const placed of placedShapes) {
    if (!placed || typeof placed.id !== "string" || !Array.isArray(placed.placedCoords)) {
      return false;
    }
    if (seenIds.has(placed.id)) return false;
    const def = shapeById.get(placed.id);
    if (!def) return false;
    seenIds.add(placed.id);

    if (placed.placedCoords.length !== def.coords.length) return false;
    const validSignatures = new Set(getAllRotations(def.coords).map(coordsSignature));
    if (!validSignatures.has(coordsSignature(placed.placedCoords))) return false;

    for (const [r, c] of placed.placedCoords) {
      if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
      if (r < 0 || r >= puzzle.boardHeight || c < 0 || c >= puzzle.boardWidth) return false;
      if (!puzzle.targetMask[r]?.[c]) return false; // Must be inside target mask
      const key = `${r},${c}`;
      if (covered.has(key)) return false; // No overlap
      covered.add(key);
    }
  }

  // Verify full target mask is covered
  let targetCount = 0;
  for (let r = 0; r < puzzle.boardHeight; r++) {
    for (let c = 0; c < puzzle.boardWidth; c++) {
      if (puzzle.targetMask[r][c]) targetCount++;
    }
  }

  return seenIds.size === puzzle.shapes.length && covered.size === targetCount;
}

/**
 * Zip Validator:
 * - Single continuous simple path (no cell visited twice).
 * - Adjacent orthogonal moves only, never crossing walls.
 * - Visits each node with num 1..N in exact chronological order.
 * - When requireFullGrid is true (default when solutionPath covers full grid), every cell must be visited.
 */
export function validateZip(puzzle: ZipPuzzle, userPath: [number, number][]): boolean {
  if (!Array.isArray(userPath) || userPath.length < puzzle.nodes.length) return false;

  const visited = new Set<string>();
  for (let i = 0; i < userPath.length; i++) {
    const step = userPath[i];
    if (!Array.isArray(step) || step.length !== 2) return false;
    const [r, c] = step;
    if (!Number.isInteger(r) || !Number.isInteger(c)) return false;
    if (r < 0 || r >= puzzle.height || c < 0 || c >= puzzle.width) return false;

    const key = `${r},${c}`;
    if (visited.has(key)) return false; // No self-intersection
    visited.add(key);

    if (i > 0) {
      const [prevR, prevC] = userPath[i - 1];
      const dist = Math.abs(prevR - r) + Math.abs(prevC - c);
      if (dist !== 1) return false; // Must be orthogonal neighbor
      if (hasWallBetween(puzzle.walls, prevR, prevC, r, c)) return false;
    }
  }

  const mustFillAll =
    puzzle.requireFullGrid ?? puzzle.solutionPath.length === puzzle.width * puzzle.height;
  if (mustFillAll && visited.size !== puzzle.width * puzzle.height) {
    return false;
  }

  // Verify node checkpoints appear in exact ascending order (1..N)
  const sortedNodes = [...puzzle.nodes].sort((a, b) => a.num - b.num);
  if (sortedNodes.length === 0) return false;

  // Must start at checkpoint 1
  const [startR, startC] = userPath[0];
  if (startR !== sortedNodes[0].r || startC !== sortedNodes[0].c) return false;

  // Must not step on a future checkpoint out of order
  const nodeNumAtCoord = new Map<string, number>();
  for (const n of sortedNodes) {
    nodeNumAtCoord.set(`${n.r},${n.c}`, n.num);
  }

  let nodeIdx = 0;
  for (const [r, c] of userPath) {
    const foundNum = nodeNumAtCoord.get(`${r},${c}`);
    if (foundNum !== undefined) {
      const expected = sortedNodes[nodeIdx];
      if (!expected || foundNum !== expected.num) {
        return false;
      }
      nodeIdx++;
    }
  }

  return nodeIdx === sortedNodes.length;
}

/**
 * Wend Validator:
 * - Checks found words against puzzle's target word list and confirms grid traceability.
 * - Must meet minWordsToWin threshold.
 */
export function validateWend(puzzle: WendPuzzle, foundWords: string[]): boolean {
  if (!Array.isArray(foundWords)) return false;
  const uniqueFound = new Set(foundWords.map((w) => w.toUpperCase().trim()));
  const validTargets = new Set(puzzle.targetWords.map((w) => w.toUpperCase().trim()));

  let validCount = 0;
  for (const word of uniqueFound) {
    if (validTargets.has(word) && canTraceWordInGrid(puzzle.grid, word)) {
      validCount++;
    }
  }

  return validCount >= puzzle.minWordsToWin;
}

/**
 * Master solution evaluator router
 */
export function evaluatePuzzleSolution(
  slug: GameSlug,
  puzzle: AnyPuzzleDefinition,
  userSolution: unknown,
): boolean {
  switch (slug) {
    case "queens":
      return validateQueens(puzzle as QueensPuzzle, userSolution as [number, number][]);
    case "tango":
      return validateTango(puzzle as TangoPuzzle, userSolution as string[][]);
    case "mini-sudoku":
      return validateMiniSudoku(puzzle as MiniSudokuPuzzle, userSolution as number[][]);
    case "pinpoint":
      return validatePinpoint(puzzle as PinpointPuzzle, userSolution as string);
    case "crossclimb":
      return validateCrossclimb(puzzle as CrossclimbPuzzle, userSolution as string[]);
    case "patches":
      return validatePatches(
        puzzle as PatchesPuzzle,
        userSolution as { id: string; placedCoords: [number, number][] }[],
      );
    case "zip":
      return validateZip(puzzle as ZipPuzzle, userSolution as [number, number][]);
    case "wend":
      return validateWend(puzzle as WendPuzzle, userSolution as string[]);
    default:
      return false;
  }
}
