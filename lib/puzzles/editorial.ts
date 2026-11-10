import { GameSlug } from "./types";

export interface GameEditorial {
  rules: string[];
  howToPlay: string[];
  strategies: string[];
  faqs: { question: string; answer: string }[];
}

export const GAME_EDITORIALS: Record<GameSlug, GameEditorial> = {
  queens: {
    rules: [
      "Every row must contain exactly one crown (♕).",
      "Every column must contain exactly one crown.",
      "Every colored region must contain exactly one crown.",
      "No two crowns may touch, not even diagonally.",
    ],
    howToPlay: [
      "Tap once on any empty square to place an ✕ marker, indicating that no crown can sit there.",
      "Tap a second time to place a Crown (♕).",
      "Tap a third time to clear the square back to empty.",
      "Right-click or long-press on mobile to place an ✕ directly.",
      "Use process of elimination to rule out squares that cannot legally hold a crown.",
    ],
    strategies: [
      "Scan single-square or constrained narrow regions first. If a region has only one or two valid cells, start your deduction there.",
      "When you place a crown, immediately place ✕ markers in all 8 adjacent squares, as well as the rest of the row, column, and colored region.",
      "Look for lines where a region only spans two cells. Even if you do not know which cell holds the crown, you can eliminate other cells in that same line.",
    ],
    faqs: [
      {
        question: "Can crowns be in adjacent squares if they are in different regions?",
        answer: "No. Crowns can never touch horizontally, vertically, or diagonally under any circumstance.",
      },
      {
        question: "How many crowns are needed to win?",
        answer: "The number of crowns always equals the board grid size (for example, a 5x5 board requires exactly 5 crowns).",
      },
      {
        question: "Is there only one unique solution?",
        answer: "Yes, every daily edition is handcrafted and mathematically verified to have exactly one unique solution.",
      },
    ],
  },
  tango: {
    rules: [
      "Fill every empty square with either a Sun (☀️) or a Moon (🌙).",
      "Each row and column must contain an equal number of Suns and Moons.",
      "No more than two identical symbols can appear consecutively in any row or column (no ☀️☀️☀️ or 🌙🌙🌙).",
      "Cells connected by an equals sign (=) must contain the exact same symbol.",
      "Cells connected by a cross (x) must contain opposite symbols.",
    ],
    howToPlay: [
      "Tap once on a square to place a Sun (☀️).",
      "Tap again to toggle to a Moon (🌙).",
      "Tap a third time to clear the square.",
      "Use equality and opposite clues along grid boundaries to deduce paired placements.",
    ],
    strategies: [
      "Search for adjacent pairs of identical symbols (e.g., ☀️☀️). The squares immediately before and after must be the opposite symbol (🌙).",
      "Look for 'sandwich' patterns (e.g. ☀️_☀️). The middle square must be the opposite symbol to avoid creating three-in-a-row.",
      "Count the symbols in nearly finished rows or columns. If a 4x4 row already has two Moons, all remaining cells in that row must be Suns.",
    ],
    faqs: [
      {
        question: "What does the = sign between two squares mean?",
        answer: "It means both squares must contain the identical symbol (both Suns or both Moons).",
      },
      {
        question: "What does the x sign between two squares mean?",
        answer: "It means the two squares must contain opposite symbols (one Sun and one Moon).",
      },
    ],
  },
  "mini-sudoku": {
    rules: [
      "Fill the grid with numbers from 1 up to the grid dimension (1 to 4 for 4x4, 1 to 6 for 6x6).",
      "Each row must contain every digit without repetition.",
      "Each column must contain every digit without repetition.",
      "Each outlined sub-box must contain every digit without repetition.",
    ],
    howToPlay: [
      "Select an empty cell on the board.",
      "Tap one of the number buttons on the on-screen keypad to place your candidate digit.",
      "Tap 'Clear' to remove an incorrect entry.",
      "Cells pre-filled in gray are fixed clues and cannot be modified.",
    ],
    strategies: [
      "Find rows, columns, or sub-boxes that are missing only one or two numbers.",
      "Cross-reference intersecting rows and columns to identify 'naked singles'—squares where only one number is legally allowed.",
    ],
    faqs: [
      {
        question: "How is Mini Sudoku different from standard 9x9 Sudoku?",
        answer: "Mini Sudoku uses a compact 4x4 or 6x6 grid, making it faster to solve while exercising the exact same logical deduction principles.",
      },
    ],
  },
  pinpoint: {
    rules: [
      "Deduce the secret unifying category by reading progressive clues.",
      "Clues are revealed one at a time, moving from cryptic to obvious.",
      "You have unlimited guesses, but solving with fewer clues demonstrates superior deduction.",
    ],
    howToPlay: [
      "Read the first revealed clue carefully.",
      "Type your category guess into the input field and submit.",
      "If incorrect, reveal the next clue or try another guess.",
      "When you deduce the common category, type it in to solve the puzzle.",
    ],
    strategies: [
      "Think abstractly about what noun or domain could connect all revealed words.",
      "Do not guess too narrowly; the solution is typically a well-known category or phrase.",
    ],
    faqs: [
      {
        question: "Are plurals accepted in Pinpoint?",
        answer: "Yes, both singular and plural forms (e.g. 'Planet' or 'Planets') are automatically accepted.",
      },
    ],
  },
  crossclimb: {
    rules: [
      "Arrange the word rungs into an ordered ladder from top to bottom.",
      "Each word must differ from its immediate neighbor by changing exactly one letter.",
      "Each rung corresponds to one of the trivia clues provided.",
    ],
    howToPlay: [
      "Drag and drop the word rungs to change their vertical order on the ladder.",
      "Read the clue on the right side of each rung to verify word meaning.",
      "When all adjacent words differ by exactly one letter in a continuous sequence, the ladder unlocks.",
    ],
    strategies: [
      "Identify the start and end anchors by checking which words have the fewest one-letter transformation neighbors.",
      "Look for words that share 3 out of 4 letters in common to pair them together.",
    ],
    faqs: [
      {
        question: "Can words be scrambled anagrams?",
        answer: "No, the letter positions must remain identical except for the single letter that changes.",
      },
    ],
  },
  patches: {
    rules: [
      "Fit all available geometric polyomino patches into the target board outline.",
      "Patches must not overlap with each other.",
      "Every square of the target silhouette must be completely covered.",
    ],
    howToPlay: [
      "Select a patch from the bottom inventory dock.",
      "Tap a target square on the board to place the selected piece.",
      "Continue placing remaining patches until the entire board is tiled.",
    ],
    strategies: [
      "Place the largest and most awkwardly shaped pieces into corners first.",
      "Avoid creating isolated 1-cell gaps that cannot be filled by remaining inventory shapes.",
    ],
    faqs: [
      {
        question: "Can pieces be rotated?",
        answer: "In this edition, pieces are presented in fixed orientations designed to assemble into the unique target silhouette.",
      },
    ],
  },
  zip: {
    rules: [
      "Draw a single continuous, non-branching path through the grid.",
      "The path must visit every numbered checkpoint in strict sequential order (1, 2, 3...).",
      "Movement is strictly horizontal or vertical between adjacent squares.",
    ],
    howToPlay: [
      "Tap checkpoint #1 to begin your path.",
      "Tap adjacent neighboring squares in sequence to extend your line toward checkpoint #2 and beyond.",
      "Tap the most recent square to undo or backtrack a step.",
    ],
    strategies: [
      "Plan the path mentally between consecutive checkpoints before drawing.",
      "Avoid boxing yourself into dead ends where you cannot navigate outward to the next checkpoint.",
    ],
    faqs: [
      {
        question: "Can I move diagonally in Zip?",
        answer: "No, all path steps must be orthogonal (up, down, left, right).",
      },
    ],
  },
  wend: {
    rules: [
      "Trace valid English words by connecting adjacent letters on a 4x4 grid.",
      "You can move in any of the 8 directions (horizontal, vertical, diagonal).",
      "You cannot use the exact same grid cell twice within a single word.",
      "Find at least the required minimum word threshold to solve the daily edition.",
    ],
    howToPlay: [
      "Tap a starting letter on the grid.",
      "Tap adjacent letters to spell out a word.",
      "Tap 'Submit' to validate your discovered word.",
      "Keep discovering words until the victory threshold is cleared.",
    ],
    strategies: [
      "Look for common prefixes (RE-, UN-, DE-) and suffixes (-ED, -ER, -ST).",
      "Scan corners for common vowels (A, E, O) that can branch into multiple consonantal roots.",
    ],
    faqs: [
      {
        question: "How long must words be?",
        answer: "Words must be at least 3 letters long to count toward your discovery score.",
      },
    ],
  },
};
