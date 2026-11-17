import { describe, expect, it } from "vitest";
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
  WendPuzzle,
} from "@/lib/puzzles/types";
import {
  validateQueens,
  validateTango,
  validateMiniSudoku,
  validatePinpoint,
  validateCrossclimb,
  validatePatches,
  validateZip,
  validateWend,
} from "@/lib/puzzles/evaluators";
import { canTraceWordInGrid, rotateCoords } from "@/lib/puzzles/geometry";

function loadBank<T>(fileName: string): T[] {
  const fullPath = path.join(process.cwd(), "data", "puzzles", fileName);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T[];
}

describe("Curated Puzzle Banks Verification (36+ per game)", () => {
  it("verifies all Queens puzzles have valid regions and passing solutions", () => {
    const bank = loadBank<QueensPuzzle>("queens.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      expect(validateQueens(p, p.solution)).toBe(true);
    }
  });

  it("verifies all Tango puzzles pass equalities, opposites, and balance", () => {
    const bank = loadBank<TangoPuzzle>("tango.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      expect(validateTango(p, p.solution)).toBe(true);
    }
  });

  it("verifies all Mini Sudoku puzzles have valid unique solutions", () => {
    const bank = loadBank<MiniSudokuPuzzle>("mini-sudoku.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      expect(validateMiniSudoku(p, p.solution)).toBe(true);
    }
  });

  it("verifies all Pinpoint puzzles have 5 clues and match their category", () => {
    const bank = loadBank<PinpointPuzzle>("pinpoint.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      expect(p.clues).toHaveLength(5);
      expect(validatePinpoint(p, p.category)).toBe(true);
      expect(validatePinpoint(p, p.acceptedAnswers[0])).toBe(true);
    }
  });

  it("verifies all Crossclimb ladders step by exactly 1 letter", () => {
    const bank = loadBank<CrossclimbPuzzle>("crossclimb.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      const words = p.rungs.map((r) => r.word);
      expect(validateCrossclimb(p, words)).toBe(true);
    }
  });

  it("verifies all Patches puzzles have valid polyomino shapes matching target mask count", () => {
    const bank = loadBank<PatchesPuzzle>("patches.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      const maskCount = p.targetMask.flat().filter(Boolean).length;
      const shapeCellCount = p.shapes.reduce((sum, s) => sum + s.coords.length, 0);
      expect(shapeCellCount).toBe(maskCount);
      expect(rotateCoords(p.shapes[0].coords, 4)).toEqual(rotateCoords(p.shapes[0].coords, 0));
      // Should reject incomplete placement
      expect(validatePatches(p, [])).toBe(false);
    }
  });

  it("verifies all Zip puzzles are Hamiltonian full-grid paths respecting walls and order", () => {
    const bank = loadBank<ZipPuzzle>("zip.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      expect(validateZip(p, p.solutionPath)).toBe(true);
      expect(p.solutionPath).toHaveLength(p.width * p.height);
    }
  });

  it("verifies all Wend puzzles have traceable target words and meet threshold", () => {
    const bank = loadBank<WendPuzzle>("wend.json");
    expect(bank.length).toBeGreaterThanOrEqual(30);
    for (const p of bank) {
      expect(p.targetWords.length).toBeGreaterThanOrEqual(p.minWordsToWin);
      for (const word of p.targetWords) {
        expect(canTraceWordInGrid(p.grid, word)).toBe(true);
      }
      expect(validateWend(p, p.targetWords.slice(0, p.minWordsToWin))).toBe(true);
    }
  });
});
