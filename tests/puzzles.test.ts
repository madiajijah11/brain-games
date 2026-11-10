import { describe, expect, it } from "vitest";
import { getDailyEdition, getPuzzleIndexForIssue, formatCountdown } from "@/lib/puzzles/daily-engine";
import {
  validateQueens,
  validateTango,
  validateMiniSudoku,
  validatePinpoint,
  validateCrossclimb,
  validateZip,
  validateWend,
} from "@/lib/puzzles/evaluators";
import type {
  QueensPuzzle,
  TangoPuzzle,
  MiniSudokuPuzzle,
  PinpointPuzzle,
  CrossclimbPuzzle,
  ZipPuzzle,
  WendPuzzle,
} from "@/lib/puzzles/types";

describe("Daily Edition Engine", () => {
  it("calculates issue number deterministically from UTC epoch", () => {
    // 2026-01-01 is Day 1 (Issue 1)
    const day1 = new Date("2026-01-01T12:00:00Z");
    const ed1 = getDailyEdition("queens", day1);
    expect(ed1.issueNumber).toBe(1);
    expect(ed1.dateKey).toBe("2026-01-01");

    // 2026-01-10 is Day 10 (Issue 10)
    const day10 = new Date("2026-01-10T05:00:00Z");
    const ed10 = getDailyEdition("tango", day10);
    expect(ed10.issueNumber).toBe(10);
    expect(ed10.dateKey).toBe("2026-01-10");
  });

  it("maps issue number to puzzle pool index cleanly", () => {
    expect(getPuzzleIndexForIssue(1, 30)).toBe(0);
    expect(getPuzzleIndexForIssue(30, 30)).toBe(29);
    expect(getPuzzleIndexForIssue(31, 30)).toBe(0);
  });

  it("formats countdown strings properly", () => {
    const ms = 3600000 + 120000 + 45000; // 1h 2m 45s
    expect(formatCountdown(ms)).toBe("01h 02m 45s");
  });
});

describe("Queens Solution Evaluator", () => {
  const sampleQueens: QueensPuzzle = {
    id: "q-test",
    size: 4,
    regions: [
      [0, 0, 1, 1],
      [0, 2, 2, 1],
      [3, 2, 2, 1],
      [3, 3, 3, 3],
    ],
    solution: [
      [0, 1],
      [1, 3],
      [2, 0],
      [3, 2],
    ],
  };

  it("accepts valid crown placements (1 per row/col/region, no touch)", () => {
    expect(validateQueens(sampleQueens, sampleQueens.solution)).toBe(true);
  });

  it("rejects crowns touching diagonally or orthogonally", () => {
    const invalidCrowns: [number, number][] = [
      [0, 1],
      [1, 2], // Touches [0, 1] diagonally
      [2, 0],
      [3, 3],
    ];
    expect(validateQueens(sampleQueens, invalidCrowns)).toBe(false);
  });

  it("rejects crowns sharing the same region or column", () => {
    const sameColCrowns: [number, number][] = [
      [0, 0],
      [1, 0], // Same column 0
      [2, 2],
      [3, 3],
    ];
    expect(validateQueens(sampleQueens, sameColCrowns)).toBe(false);
  });
});

describe("Tango Solution Evaluator", () => {
  const sampleTango: TangoPuzzle = {
    id: "t-test",
    size: 4,
    initial: [
      ["S", null, null, null],
      [null, null, "M", null],
      [null, "S", null, null],
      [null, null, null, "M"],
    ],
    equalities: [{ r1: 0, c1: 1, r2: 0, c2: 2 }],
    solution: [
      ["S", "M", "M", "S"],
      ["M", "S", "M", "S"],
      ["M", "S", "S", "M"],
      ["S", "M", "S", "M"],
    ],
  };

  it("validates equal suns/moons and no 3-in-a-row", () => {
    expect(validateTango(sampleTango, sampleTango.solution)).toBe(true);
  });

  it("rejects 3 identical consecutive symbols", () => {
    const threeSuns = [
      ["S", "S", "S", "M"], // 3 suns in row 0
      ["M", "M", "S", "S"],
      ["M", "S", "M", "S"],
      ["S", "M", "M", "S"],
    ];
    expect(validateTango(sampleTango, threeSuns)).toBe(false);
  });
});

describe("Mini Sudoku Evaluator", () => {
  const sampleSudoku: MiniSudokuPuzzle = {
    id: "s-test",
    size: 4,
    boxWidth: 2,
    boxHeight: 2,
    initial: [
      [1, null, null, 4],
      [null, 2, 3, null],
      [null, 3, 2, null],
      [4, null, null, 1],
    ],
    solution: [
      [1, 3, 4, 4], // Duplicate 4 in row 0
      [4, 2, 3, 1],
      [3, 1, 2, 4],
      [2, 4, 1, 3],
    ],
  };

  const validSudokuSolution = [
    [1, 3, 4, 2],
    [4, 2, 3, 1],
    [3, 4, 2, 1], // wait: col 3 has two 1s -> make clean 4x4
    [2, 1, 1, 3],
  ];

  const cleanSolution = [
    [1, 3, 2, 4],
    [4, 2, 3, 1],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
  ];

  it("accepts a perfectly valid 4x4 sudoku solution", () => {
    const validSudoku: MiniSudokuPuzzle = {
      ...sampleSudoku,
      initial: [
        [1, null, null, 4],
        [null, 2, 3, null],
        [null, 4, 1, null],
        [2, null, null, 3],
      ],
      solution: cleanSolution,
    };
    expect(validateMiniSudoku(validSudoku, cleanSolution)).toBe(true);
  });
});

describe("Pinpoint & Crossclimb Evaluators", () => {
  it("validates pinpoint answers case-insensitively", () => {
    const puzzle: PinpointPuzzle = {
      id: "pp-1",
      category: "Planets",
      clues: ["Mars", "Venus", "Jupiter", "Saturn", "Mercury"],
      acceptedAnswers: ["planets", "solar system planets", "planet"],
    };

    expect(validatePinpoint(puzzle, "Planets")).toBe(true);
    expect(validatePinpoint(puzzle, "  planet ")).toBe(true);
    expect(validatePinpoint(puzzle, "Galaxies")).toBe(false);
  });

  it("validates crossclimb 1-letter word steps", () => {
    const puzzle: CrossclimbPuzzle = {
      id: "cc-1",
      rungs: [
        { clue: "Opposite of cold", word: "WARM" },
        { clue: "Insect with no legs", word: "WORM" },
        { clue: "Past tense of wear", word: "WORE" },
        { clue: "Trek or long walk", word: "HIRE" }, // wait: WORE -> MORE -> MARE
      ],
    };

    const validLadder = ["WARM", "WORM", "WORD", "LORD"];
    const validPuzzle: CrossclimbPuzzle = {
      id: "cc-valid",
      rungs: [
        { clue: "1", word: "WARM" },
        { clue: "2", word: "WORM" },
        { clue: "3", word: "WORD" },
        { clue: "4", word: "LORD" },
      ],
    };

    expect(validateCrossclimb(validPuzzle, validLadder)).toBe(true);
    expect(validateCrossclimb(validPuzzle, ["WARM", "WORD", "WORM", "LORD"])).toBe(false);
  });
});

describe("Zip & Wend Evaluators", () => {
  it("validates zip sequential continuous line", () => {
    const zip: ZipPuzzle = {
      id: "z-1",
      width: 3,
      height: 3,
      nodes: [
        { r: 0, c: 0, num: 1 },
        { r: 0, c: 2, num: 2 },
        { r: 2, c: 2, num: 3 },
      ],
      solutionPath: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
        [2, 2],
      ],
    };

    expect(validateZip(zip, zip.solutionPath)).toBe(true);

    // Broken continuity
    const brokenPath: [number, number][] = [
      [0, 0],
      [0, 2], // Skips [0, 1]
      [2, 2],
    ];
    expect(validateZip(zip, brokenPath)).toBe(false);
  });

  it("validates wend minimum word threshold", () => {
    const wend: WendPuzzle = {
      id: "w-1",
      grid: [
        ["C", "A", "T", "S"],
        ["O", "P", "E", "N"],
        ["R", "E", "A", "D"],
        ["S", "T", "A", "R"],
      ],
      minWordsToWin: 3,
      targetWords: ["CATS", "OPEN", "READ", "STAR", "CARE"],
    };

    expect(validateWend(wend, ["cats", "open", "read"])).toBe(true);
    expect(validateWend(wend, ["cats", "open"])).toBe(false); // Only 2 words
  });
});
