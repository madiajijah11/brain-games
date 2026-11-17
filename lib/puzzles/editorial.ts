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
        answer:
          "No. Crowns can never touch horizontally, vertically, or diagonally under any circumstance.",
      },
      {
        question: "How many crowns are needed to win?",
        answer:
          "The number of crowns always equals the board grid size (for example, a 5x5 board requires exactly 5 crowns).",
      },
      {
        question: "Is there only one unique solution?",
        answer:
          "Yes, every daily edition is handcrafted and mathematically verified to have exactly one unique solution.",
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
        answer:
          "It means both squares must contain the identical symbol (both Suns or both Moons).",
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
        answer:
          "Mini Sudoku uses a compact 4x4 or 6x6 grid, making it faster to solve while exercising the exact same logical deduction principles.",
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
        answer:
          "Yes, both singular and plural forms (e.g. 'Planet' or 'Planets') are automatically accepted.",
      },
    ],
  },
  crossclimb: {
    rules: [
      "Solve the middle trivia clues and arrange them so each rung differs by exactly one letter.",
      "Once the middle ladder is connected, unlock and solve the Top and Bottom rungs.",
      "Each adjacent pair of words from Top to Bottom must change by exactly one letter.",
    ],
    howToPlay: [
      "Type your 4-letter answer into each middle rung using its trivia clue.",
      "Use the ▲ / ▼ arrows to arrange solved rungs into a valid 1-letter-step chain.",
      "Type the final Top and Bottom words once they unlock to complete the ladder.",
    ],
    strategies: [
      "Identify anchor words by checking which words share 3 out of 4 letters in the same positions.",
      "Use the Top + Bottom theme clue once the middle rungs are ordered.",
    ],
    faqs: [
      {
        question: "Can words be scrambled anagrams?",
        answer:
          "No, the letter positions must remain identical except for the single letter that changes.",
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
      "Drag a patch from the dock onto the board, or tap a piece then tap a target square.",
      "Use the ↻ button on any unplaced piece to rotate it 90 degrees.",
      "Tap any placed piece on the board to return it to the dock.",
    ],
    strategies: [
      "Place the largest and most awkwardly shaped pieces into corners first.",
      "Avoid creating isolated 1-cell gaps that cannot be filled by remaining inventory shapes.",
    ],
    faqs: [
      {
        question: "Can pieces be rotated?",
        answer:
          "Yes! Tap the ↻ button on any piece in the dock to rotate it in 90-degree increments before placing.",
      },
    ],
  },
  zip: {
    rules: [
      "Draw a single continuous, non-branching path visiting every numbered checkpoint in order (1, 2, 3...).",
      "Your path must cover every single square on the grid.",
      "Movement is strictly horizontal or vertical and cannot cross amber barrier walls.",
    ],
    howToPlay: [
      "Press on checkpoint #1 and drag continuously through adjacent squares toward checkpoint #2 and beyond.",
      "Drag backward along your line to backtrack, or use Undo.",
      "Make sure every square on the grid is covered when reaching the final number.",
    ],
    strategies: [
      "Use barrier walls and corners to force deterministic turns before guessing open regions.",
      "Avoid cutting off pockets of unvisited cells that you cannot return to.",
    ],
    faqs: [
      {
        question: "Can I finish as soon as I hit the highest number?",
        answer: "Only if every square on the grid has been visited along your path.",
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
      "Swipe across adjacent letters on the grid to connect a word—releasing automatically submits it.",
      "You can also tap letters one by one and press Submit.",
      "Keep discovering words until the progress bar reaches 100%.",
    ],
    strategies: [
      "Look for common prefixes (RE-, UN-, DE-) and suffixes (-ED, -ER, -ST).",
      "Scan corners for common vowels (A, E, O) that can branch into multiple consonantal roots.",
    ],
    faqs: [
      {
        question: "How long must words be?",
        answer:
          "Words must be at least 4 letters long (or 3+ where supported) to count toward your discovery score.",
      },
    ],
  },
};
