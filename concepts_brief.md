# LinkedIn-Style 8-Game Daily Puzzle Suite Architecture with SEO & Monetization

* **Author:** MexL
* **Date:** 2026-11-10

## Overview

Brain Games will transform from a generic 4-game text multiple-choice quiz into an 8-game daily puzzle suite inspired directly by LinkedIn Games:
1. **Queens** (Constraint grid: place one crown per row, column, and color region without adjacent crowns).
2. **Tango** (Binary grid: fill grid with suns and moons adhering to balance and max-consecutive constraints).
3. **Mini Sudoku** (Spatial deduction: fill a 4x4 or 6x6 grid with unique digits per row, column, and box).
4. **Pinpoint** (Clue deduction: unlock progressive clues to guess a common secret category).
5. **Crossclimb** (Word ladder: solve trivia clues by swapping one letter at a time to form an ordered ladder).
6. **Patches** (Spatial tiling: fit geometric polyomino patches into a designated board outline).
7. **Zip** (Path finding: draw a single unbroken line connecting numerical or colored nodes).
8. **Wend** (Word weave: trace a continuous path through an adjacent letter grid to construct valid words).

The platform introduces a **Daily Scarcity & Edition Engine** (`#IssueNumber`) linked to global UTC calendar days. Each game can be played once per day for official XP, streaks, and global leaderboard rankings. Once completed, the official daily slot locks with a celebration and summary card, while offering an unranked **Practice Mode** for unlimited replays that awards zero XP and does not affect competitive metrics.

To maximize search visibility and commercial viability, the architecture incorporates:
* **Guest Play & SEO Accessibility**: Games are publicly playable without login. Crawlers (Googlebot) and guests have full access to daily puzzles, accompanied by rich editorial content (rules, tutorials, strategies, Schema.org JSON-LD).
* **Monetization Layer**: Primary integration for **Google AdSense** (content-rich layouts passing thin-content audits) with secondary fallback for **Monetag** (interstitial / vignette transitions), designed to prevent accidental clicks and preserve tactile puzzle UX.

---

## Analysis

### 1. Contrarian / YAGNI Lens
* **Finding**: Building 8 bespoke interactive puzzle engines simultaneously introduces high implementation complexity across 8 distinct canvas/grid interactions, touch gestures, and board state machines.
* **Resolution**: Standardize on a unified **Cell/Grid State Engine** across the grid-based games (Queens, Tango, Mini Sudoku, Patches, Zip, Wend). Each game shares common interaction primitives: tap/click, drag-selection, cell-state cycling (`none` -> `mark` -> `exclude`), undo/redo history stacks, and sound/haptic triggers. Pinpoint and Crossclimb share a common progressive reveal/input state machine. This prevents writing 8 disjoint frontend architectures.

### 2. Cost, Quota & Performance Economics Lens
* **Finding**: Generating complex spatial puzzles procedurally on serverless functions at runtime risks timeouts, CPU quota spikes, and potential generation of unsolvable board configurations.
* **Resolution**: Use a **Pre-validated Deterministic Calendar Registry**:
  * Puzzles are pre-generated, verified for unique solvability offline, and committed as static JSON seed files inside the repository (`data/puzzles/[slug].json`).
  * Puzzles map deterministically to the daily edition number via an offset formula from an epoch date:
    `issueNumber = Math.floor((Date.now() - EPOCH_MS) / 86400000) + 1`
    `puzzleIndex = (issueNumber - 1) % puzzlePool.length`
  * Serving a daily puzzle requires zero database query overhead and sub-1ms execution time.

### 3. SEO & Guest Access Architecture
* **Finding**: The prior middleware redirected all unauthenticated requests on `/games/*` to `/login`. This completely blocks Googlebot indexing and causes immediate Google AdSense rejection due to "Site Behind Login / Thin Content".
* **Resolution**:
  * **Public Game Routes**: Remove `/games/*` from the middleware's auth redirect guard. Anyone (guests, bots) can play today's puzzle immediately.
  * **Guest Conversion Loop**: Guests play freely. Upon victory, a conversion card displays their elapsed time and offers: *"Sign in or register to save your streak, earn XP, and join the global leaderboard"*. If they log in or register, their completed game is retroactively credited.
  * **Semantic Search Content**: Each game page couples the interactive canvas with rich, server-rendered editorial sections:
    - Detailed Game Rules & Mechanics.
    - "How to Play" tutorial and step-by-step example.
    - Advanced solving strategies and tips.
    - FAQ accordion.
  * **Structured Data**: Embed Schema.org JSON-LD (`WebApplication`, `Game`, and `FAQPage`) with dynamic edition metadata (e.g. `Queens #924`).

### 4. Monetization & Ad Placement Architecture
* **Finding**: Ad banners placed near active touch zones or full-screen popups during gameplay cause misclicks, player frustration, and AdSense accidental-click policy violations.
* **Resolution**:
  * **Primary Network (Google AdSense)**:
    - High text-to-canvas ratio on all game pages to guarantee passing the "Valuable Content" policy.
    - Fixed-dimension ad slots to prevent Cumulative Layout Shift (CLS):
      - Desktop: 300x250 or 300x600 sticky sidebar banner.
      - Mobile: 320x50 or responsive banner placed strictly *below* the game board, outside the finger-touch zone.
      - Game-End Banner: Displayed inside the post-game summary modal only after the puzzle is solved.
  * **Secondary Network (Monetag)**:
    - Configured for manual user-initiated transitions only (e.g., when a player clicks "Start Practice Mode" after completing the daily game).
    - Never triggered during active puzzle-solving to protect player focus.

### 5. Migration & Backward Compatibility Lens
* **Finding**: The database schema currently stores `GameSession` with generic `score`, `correct`, and `total` fields designed for 5-question quizzes.
* **Resolution**:
  * Add `issueNumber Int?` and `mode String @default("daily")` (`daily` vs `practice`) to `GameSession`.
  * Add `DailyGameCompletion` table (`userId`, `gameSlug`, `dateKey`, `timeTakenMs`, `issueNumber`) with a unique constraint on `[userId, gameSlug, dateKey]` to enforce the 1-daily-ranked attempt limit per game.
  * Anonymous guest completions are held in browser `localStorage` and optionally claimed via a `/api/games/claim-guest` endpoint upon registration.
  * Existing player lifetime XP and streak records remain preserved.

### 6. Observability & SRE Debuggability Lens
* **Finding**: Direct-manipulation games submit complete board states (e.g., coordinates of crowns, binary cell assignments, or word sequences) rather than simple option keys.
* **Resolution**:
  * Server-side submission payload for each game must specify a typed board state object verified against a deterministic solution evaluator in `lib/puzzles/[slug]/evaluator.ts`.
  * If a submission fails verification, detailed evaluator mismatch data (e.g., invalid crown overlap at row 2, col 4) is logged to Vercel runtime logs with user context for fast diagnostic triage.

### 7. Long-Term Tech Debt & Maintenance Lens
* **Finding**: Hardcoding 8 games in a monolithic file will create code bloat and tight coupling.
* **Resolution**: Create a modular plugin directory structure:
  ```text
  data/puzzles/
    ├── queens.json
    ├── tango.json
    └── ...
  lib/puzzles/
    ├── types.ts              (Shared puzzle interfaces & issue calculation)
    ├── queens/               (Schema, data pool, solver validator)
    ├── tango/
    ├── mini-sudoku/
    ├── pinpoint/
    ├── crossclimb/
    ├── patches/
    ├── zip/
    └── wend/
  components/games/
    ├── shared/               (GridCell, Timer, UndoControls, WinCelebration)
    ├── queens-board.tsx
    ├── tango-board.tsx
    └── ...
  components/ads/
    ├── adsense-script.tsx    (Client script loader with publisher ID)
    ├── ad-banner.tsx         (Fixed-dimension CLS-safe banner wrapper)
    └── monetag-trigger.tsx   (Transition interstitial handler)
  ```

---

## Goals vs. Non-Goals

* **In-Scope Goals**:
  * Rebuild game catalog to support all 8 games: Queens, Tango, Mini Sudoku, Pinpoint, Crossclimb, Patches, Zip, and Wend.
  * Public Guest Play: Anyone can play the daily games without login; prompt account creation post-victory to save streaks and XP.
  * Implement the Daily Edition Engine (`#IssueNumber`) based on UTC day rollover.
  * Enforce Daily Scarcity: 1 ranked attempt per game per day; subsequent plays operate in Practice Mode (0 XP, unranked).
  * Build rich, accessible, direct-manipulation puzzle components with visual error feedback and undo/redo support.
  * Provide pre-curated, verified-solvable puzzle banks for each game.
  * Implement comprehensive SEO: Server-side editorial guides, rules, FAQs, dynamic metadata, OpenGraph cards, and Schema.org JSON-LD.
  * Implement AdSense-compliant responsive ad slots and Monetag transition hooks.

* **Out-of-Scope Non-Goals**:
  * Real-time synchronous multiplayer (head-to-head live battles).
  * User-generated puzzle editors or community publishing tools in this phase.
  * Intrusive popups or interstitial ads that interrupt active gameplay.

---

## Alternatives Weighed

* **Gated Game Routes (Require Login to Play)**:
  * *Reason for rejection*: Rejected by author. Blocks search engine crawlers from indexing game pages and guarantees Google AdSense rejection due to "Site Behind Login".
* **Procedural Runtime Puzzle Generation**:
  * *Reason for rejection*: High risk of generating unsolvable boards or performance timeouts in serverless functions. Pre-validated curated banks guarantee 100% solvability and instant load times.
* **Aggressive Monetization (Mid-Game Ads)**:
  * *Reason for rejection*: Rejected by author. High player abandonment, misclicks on touch screens, and AdSense policy penalties for accidental clicks.

---

## Key Decisions & Staging for Next Steps

1. **Architecture Scaffold**: Define shared `DailyPuzzleEngine`, edition calculator, and puzzle schemas for all 8 games.
2. **Guest Play & Route Unlocking**: Remove `/games/*` from middleware auth barrier, add guest state persistence and post-win signup conversion.
3. **Database Schema Update**: Add `DailyGameCompletion` model and update `GameSession` in `prisma/schema.prisma`.
4. **SEO & Editorial Content**: Add rich rules, strategies, FAQs, and Schema.org JSON-LD to every game route.
5. **Ad Infrastructure**: Create CLS-safe `AdBanner` components and script loaders configurable via environment variables (`NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_MONETAG_TAG_ID`).
6. **Game Implementation & Pre-curated Bank**: Build the 8 interactive game boards and populate initial puzzle libraries.
