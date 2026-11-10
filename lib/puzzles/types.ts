export type GameSlug =
  | "queens"
  | "tango"
  | "mini-sudoku"
  | "pinpoint"
  | "crossclimb"
  | "patches"
  | "zip"
  | "wend";

export interface GameCatalogItem {
  slug: GameSlug;
  title: string;
  subtitle: string;
  category: "LOGIC" | "NUMERICAL" | "VERBAL" | "SPATIAL" | "COGNITIVE SPEED" | "TRIVIA & WORDS";
  description: string;
  icon: string;
  accentColor: string;
  estimatedMinutes: string;
}

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    slug: "queens",
    title: "Queens",
    subtitle: "Crown each region",
    category: "LOGIC",
    description: "Place one crown per row, column, and color region without crowns touching.",
    icon: "♕",
    accentColor: "bg-purple-100 text-purple-700 border-purple-200",
    estimatedMinutes: "3 min",
  },
  {
    slug: "tango",
    title: "Tango",
    subtitle: "Harmonize the grid",
    category: "LOGIC",
    description: "Fill the grid with suns and moons adhering to balance and equality constraints.",
    icon: "◑",
    accentColor: "bg-amber-100 text-amber-700 border-amber-200",
    estimatedMinutes: "3 min",
  },
  {
    slug: "mini-sudoku",
    title: "Mini Sudoku",
    subtitle: "The classic game, made mini",
    category: "NUMERICAL",
    description: "Fill a 4x4 or 6x6 grid with unique digits per row, column, and box.",
    icon: "⊞",
    accentColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    estimatedMinutes: "4 min",
  },
  {
    slug: "pinpoint",
    title: "Pinpoint",
    subtitle: "Guess the category",
    category: "VERBAL",
    description: "Unlock progressive clues one by one to deduce the hidden secret category.",
    icon: "◎",
    accentColor: "bg-blue-100 text-blue-700 border-blue-200",
    estimatedMinutes: "2 min",
  },
  {
    slug: "crossclimb",
    title: "Crossclimb",
    subtitle: "Unlock a trivia ladder",
    category: "TRIVIA & WORDS",
    description: "Solve trivia clues by changing one letter at a time to form an ordered word ladder.",
    icon: "☲",
    accentColor: "bg-rose-100 text-rose-700 border-rose-200",
    estimatedMinutes: "4 min",
  },
  {
    slug: "patches",
    title: "Patches",
    subtitle: "Piece it together",
    category: "SPATIAL",
    description: "Fit geometric polyomino patches into a designated target board outline.",
    icon: "▨",
    accentColor: "bg-orange-100 text-orange-700 border-orange-200",
    estimatedMinutes: "3 min",
  },
  {
    slug: "zip",
    title: "Zip",
    subtitle: "Connect the path",
    category: "COGNITIVE SPEED",
    description: "Draw a single unbroken line connecting numbered checkpoints in numerical order.",
    icon: "⌇",
    accentColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    estimatedMinutes: "2 min",
  },
  {
    slug: "wend",
    title: "Wend",
    subtitle: "Weave through words",
    category: "VERBAL",
    description: "Trace an adjacent 8-directional path through a letter grid to discover valid words.",
    icon: "✢",
    accentColor: "bg-teal-100 text-teal-700 border-teal-200",
    estimatedMinutes: "3 min",
  },
];

export interface DailyEditionInfo {
  slug: GameSlug;
  issueNumber: number;
  dateKey: string;
}

// -------------------------------------------------------------
// Puzzle Schemas per Game Type
// -------------------------------------------------------------

export interface QueensPuzzle {
  id: string;
  size: number;
  regions: number[][]; // grid of region IDs (0..size-1)
  solution: [number, number][]; // [row, col] coordinates of crowns
}

export interface TangoPuzzle {
  id: string;
  size: number;
  initial: (string | null)[][]; // "S" (Sun), "M" (Moon), or null
  equalities?: { r1: number; c1: number; r2: number; c2: number }[];
  opposites?: { r1: number; c1: number; r2: number; c2: number }[];
  solution: string[][]; // "S" | "M"
}

export interface MiniSudokuPuzzle {
  id: string;
  size: 4 | 6;
  boxWidth: number;
  boxHeight: number;
  initial: (number | null)[][];
  solution: number[][];
}

export interface PinpointPuzzle {
  id: string;
  category: string;
  clues: string[]; // 5 ordered clues
  acceptedAnswers: string[]; // case-insensitive alternatives
}

export interface CrossclimbPuzzle {
  id: string;
  rungs: {
    clue: string;
    word: string;
  }[];
}

export interface PatchesPuzzle {
  id: string;
  boardWidth: number;
  boardHeight: number;
  targetMask: boolean[][]; // true = cell must be filled
  shapes: {
    id: string;
    coords: [number, number][]; // relative [row, col]
    color: string;
  }[];
}

export interface ZipPuzzle {
  id: string;
  width: number;
  height: number;
  nodes: { r: number; c: number; num: number }[]; // numbered checkpoints 1..N
  solutionPath: [number, number][];
}

export interface WendPuzzle {
  id: string;
  grid: string[][]; // 4x4 letters
  minWordsToWin: number;
  targetWords: string[]; // valid words reachable in grid
}

export type AnyPuzzleDefinition =
  | QueensPuzzle
  | TangoPuzzle
  | MiniSudokuPuzzle
  | PinpointPuzzle
  | CrossclimbPuzzle
  | PatchesPuzzle
  | ZipPuzzle
  | WendPuzzle;

export interface PuzzleSubmissionPayload {
  slug: GameSlug;
  issueNumber: number;
  durationMs: number;
  mode: "daily" | "practice";
  solution: unknown;
}

export interface PuzzleSubmissionResult {
  valid: boolean;
  score: number;
  xpEarned: number;
  streak: number;
  mode: "daily" | "practice";
  issueNumber: number;
  completedAt: string;
  message?: string;
}
