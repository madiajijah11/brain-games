# LinkedIn-Style 8-Game Daily Puzzle Suite Architecture with SEO & Monetization

*   **Author:** MexL
*   **Status:** Draft
*   **Date:** 2026-11-10

--------------------------------------------------------------------------------

## Overview

Brain Games will evolve from a generic 4-game multiple-choice quiz into an 8-game daily puzzle suite modeled after LinkedIn Games (Queens, Tango, Mini Sudoku, Pinpoint, Crossclimb, Patches, Zip, Wend). The platform introduces a daily scarcity model where puzzles are released as numbered daily editions (`#IssueNumber`) synchronized across all players via global UTC time.

To transition Brain Games into a sustainable commercial web product with strong organic discovery, the platform unifies direct-manipulation puzzle mechanics with a public-access SEO architecture and an AdSense/Monetag monetization layer:
1. **Direct-Manipulation Gameplay**: Replaces text buttons with interactive tactile mechanics (grid cell cycling, drag connections, word path tracing, and clue ladder deduction).
2. **Daily Scarcity & Practice Mode**: Exactly one ranked attempt per game per day counts toward streaks, lifetime XP, and global leaderboards. Subsequent plays operate in an unranked Practice Mode (0 XP).
3. **Public Guest Play & SEO Optimization**: Game pages are accessible without login so Googlebot can crawl and index them. Each game features comprehensive editorial content (rules, tutorials, strategies, FAQs) and Schema.org JSON-LD to qualify for search rich snippets and satisfy Google AdSense's "Valuable Content" policy.
4. **Non-Intrusive Monetization**: Primary responsive ad slots for Google AdSense with fixed dimensions to eliminate Cumulative Layout Shift (CLS), complemented by secondary user-initiated Monetag interstitials between game sessions.

## The Problem

The current Brain Games implementation suffers from three critical limitations that restrict engagement, retention, and monetization:

1. **Passive, Unengaging Mechanics**: The 4 existing games (Number Rush, Logic Grid, Memory Match, Word Connect) are implemented as identical 4-option multiple-choice text quizzes. They lack the spatial reasoning, tactile manipulation, and satisfaction characteristic of modern web puzzles (e.g., LinkedIn Queens, Tango, NYT Wordle/Connections).
2. **Absence of Daily Scarcity & Habit Loops**: Players can replay the same limited pool of 5 questions infinitely. Without a unified daily edition number, daily lockout, or streak milestones tied to a shared calendar puzzle, competitive scores are devalued, and there is no compelling trigger for players to return daily.
3. **Search Invisibility & Ad Ineligibility**: The existing authentication middleware redirects unauthenticated visitors from `/games/*` to `/login`. This blocks search engine crawlers from indexing puzzle pages and causes immediate Google AdSense application rejections under the "Site Behind Login / Thin Content" policy.

## Goals

*   **8 Specialized Puzzle Engines**: Implement interactive direct-manipulation engines for Queens, Tango, Mini Sudoku, Pinpoint, Crossclimb, Patches, Zip, and Wend.
*   **Universal Daily Edition Engine**: Compute deterministic global issue numbers (`#IssueNumber`) from a fixed UTC epoch so all players worldwide receive the same puzzle on any given calendar day.
*   **Daily Scarcity Enforcement**: Enforce a strict 1-ranked-completion limit per game per day in PostgreSQL (`DailyGameCompletion`), transitioning subsequent attempts into an unranked Practice Mode awarding 0 XP.
*   **Public Guest Access & Conversion**: Allow guest players and search bots to play daily puzzles without authentication, presenting an optional account creation/sign-in prompt after puzzle completion to claim streaks and leaderboard ranks.
*   **AdSense-Ready SEO & Editorial Footprint**: Server-render extensive educational content (game mechanics, step-by-step guides, strategies, and FAQs) alongside each game canvas, accompanied by dynamic OpenGraph metadata and Schema.org JSON-LD (`WebApplication`, `Game`, `FAQPage`).
*   **CLS-Safe Ad Infrastructure**: Implement non-disruptive Google AdSense responsive ad units with pre-allocated layout dimensions below the game board and in desktop sidebars, with secondary Monetag interstitial hooks triggered only on voluntary mode switches.

## Non-Goals

*   **Real-Time Synchronous Multiplayer**: No live head-to-head socket rooms or matchmaking; all competition remains asynchronous via global leaderboards and completion times.
*   **User-Generated Level Editors**: Puzzle authoring and publishing tools for public users are deferred to a future milestone.
*   **Intrusive Mid-Game Ads**: No interstitial or popup ads will interrupt active puzzle solving; all ads remain strictly peripheral or post-game.
*   **Native App Wrappers**: Focus is 100% on high-performance responsive web across mobile and desktop browsers.

## Open Questions

*   None; core scope, game selections, monetization priorities, and guest access models were finalized during the brainstorming phase.

--------------------------------------------------------------------------------

## Technical Plan

### 1. High-Level Architecture

```text
                                 ┌────────────────────────────────────────┐
                                 │       Public Request (User/Bot)        │
                                 └──────────────────┬─────────────────────┘
                                                    │
                                                    ▼
                                 ┌────────────────────────────────────────┐
                                 │     Next.js Edge Middleware            │
                                 │  - /login, /register: Guest Guard      │
                                 │  - /dashboard: Auth Protected          │
                                 │  - /games/*: PUBLIC ACCESS (Zero Lock) │
                                 └──────────────────┬─────────────────────┘
                                                    │
                                                    ▼
                                 ┌────────────────────────────────────────┐
                                 │     Game Page (Server Component)       │
                                 │  - Compute #IssueNumber (UTC Epoch)    │
                                 │  - Load Puzzle Definition (JSON Pool)  │
                                 │  - Render JSON-LD Schema.org           │
                                 │  - Render Editorial Strategy/Rules     │
                                 │  - Mount GameRunner + Ad Layout        │
                                 └──────────────────┬─────────────────────┘
                                                    │
                        ┌───────────────────────────┴───────────────────────────┐
                        ▼                                                       ▼
┌───────────────────────────────────────────────┐     ┌───────────────────────────────────────────────┐
│     Client Direct-Manipulation Canvas         │     │         AdSense & Monetag Ad Wrapper          │
│ - Shared Grid Engine (Queens, Tango, Sudoku)  │     │ - Pre-allocated fixed CSS slots (No CLS)      │
│ - Polyomino Engine (Patches)                  │     │ - Sidebar slot (Desktop 300x600/300x250)      │
│ - Path Tracer Engine (Zip, Wend)              │     │ - Below-board slot (Mobile/Tablet 320x50/auto)│
│ - Deduction Step Engine (Pinpoint, Crossclimb)│     │ - User-initiated Monetag practice interstitial│
└───────────────────────┬───────────────────────┘     └───────────────────────────────────────────────┘
                        │
                        ▼ (Solve Complete)
┌────────────────────────────────────────────────────────────────────────┐
│                        POST /api/puzzles/submit                        │
│  - Validate board against puzzle solution hash                         │
│  - If Guest: Return success, store unranked token in localStorage      │
│  - If Logged In: Check DailyGameCompletion (Unique dateKey + gameSlug) │
│    ├── First play: Award 100 XP + Streak, commit to database           │
│    └── Subsequent play: Mark mode="practice", award 0 XP               │
└────────────────────────────────────────────────────────────────────────┘
```

### 2. Daily Scarcity & Calendar Edition Engine

Every game edition is deterministic, globally synchronized across all players, and requires zero database overhead:
* **Epoch Reference**: `const EPOCH_DATE = new Date("2026-01-01T00:00:00Z");`
* **Issue Calculation**:
  ```typescript
  export function getDailyEdition(slug: string, date = new Date()) {
    const todayUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const epochUTC = EPOCH_DATE.getTime();
    const issueNumber = Math.max(1, Math.floor((todayUTC - epochUTC) / 86400000) + 1);
    const dateKey = new Date(todayUTC).toISOString().slice(0, 10);
    return { issueNumber, dateKey };
  }
  ```
* **Puzzle Retrieval**: Each game has a curated pool in `data/puzzles/[slug].json`. The puzzle index is resolved as `(issueNumber - 1) % pool.length`.

### 3. The 8 Interactive Game Engines & UI Architecture

All 8 games are rebuilt from scratch using clean SVG/DOM-based direct manipulation:

| Game Slug | Subtitle / Mechanic | Interaction Model | Board Primitives |
| :--- | :--- | :--- | :--- |
| **`queens`** | Crown each region | Tap cell: Cycle `Empty` -> `X` (Cross) -> `Crown`. Long press/right click = quick `X`. | 6x6 to 8x8 colored region grid. Constraint visualizer (red glow if crowns collide). |
| **`tango`** | Harmonize the grid | Tap cell: Cycle `Empty` -> `Sun` -> `Moon`. Equal constraint per row/col. | Grid with equal/opposite edge markers (`=`, `x`). Rule validator (no 3 identical consecutive). |
| **`mini-sudoku`** | The classic game, made mini | Tap cell + virtual numerical keypad (1–4 or 1–6). Notes toggle mode. | 4x4 (2x2 boxes) or 6x6 (2x3 boxes) grid with conflict highlighting. |
| **`pinpoint`** | Guess the category | 5 clue tiles reveal one-by-one. Text input with autocomplete/fuzzy match. | Flip-card clue stack + guess attempt pill tracker. |
| **`crossclimb`** | Unlock a trivia ladder | 5-step word ladder where adjacent words differ by 1 letter. Trivia clue per rung. | Interactive letter-tile ladder with draggable order or typed letter swaps. |
| **`patches`** | Piece it together | Drag & drop geometric polyomino patches into target board outline. Rotate button. | Snap-to-grid SVG bounding container with shape inventory dock. |
| **`zip`** | Connect the path | Touch/mouse drag drawing continuous line connecting ordered number checkpoints. | Node network canvas with path collision and sequence validation. |
| **`wend`** | Weave through words | Swipe/drag across adjacent letters (8-directional) to discover valid words. | 4x4 letter grid with active word tracer trail and word discovery tracker. |

### 4. Database Schema Evolution (`prisma/schema.prisma`)

```prisma
model User {
  id                    String                @id @default(cuid())
  name                  String
  email                 String                @unique
  passwordHash          String
  totalXp               Int                   @default(0)
  competitiveXp         Int                   @default(0)
  streak                Int                   @default(0)
  lastPlayedAt          DateTime?
  createdAt             DateTime              @default(now())
  gameSessions          GameSession[]
  dailyEntries          DailyEntry[]
  dailyCompletions      DailyGameCompletion[]

  @@index([competitiveXp, totalXp])
}

model DailyGameCompletion {
  id           String   @id @default(cuid())
  userId       String
  gameSlug     String
  dateKey      String   // "YYYY-MM-DD" in UTC
  issueNumber  Int
  timeTakenMs  Int
  completedAt  DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, gameSlug, dateKey])
  @@index([gameSlug, dateKey])
}

model GameSession {
  id          String   @id @default(cuid())
  userId      String
  gameSlug    String
  score       Int
  xpEarned    Int
  correct     Int      @default(0)
  total       Int      @default(0)
  durationMs  Int
  issueNumber Int?
  mode        String   @default("daily") // "daily" | "practice"
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, gameSlug])
}
```

### 5. SEO & Editorial Footprint Architecture

To ensure immediate Google indexing and eliminate AdSense "Thin Content" flags, each `/games/[slug]` route server-renders rich semantic sections below the puzzle canvas:
* **JSON-LD Schema**:
  ```json
  {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "Game"],
    "name": "Queens #924 - Daily Logic Game",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Any",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "description": "Play today's Queens daily puzzle #924. Place one crown per row, column, and region without touching."
  }
  ```
* **Editorial Sections**:
  - `Rules & Mechanics`: Clear visual breakdown of game constraints.
  - `How to Play & Step-by-Step Tutorial`: Annotated example board.
  - `Mastery & Deduction Strategies`: Advanced logical heuristics (e.g. corner trapping in Queens, parity in Tango).
  - `Frequently Asked Questions (FAQ)`: FAQPage Schema accordion with 4–6 common player questions.

### 6. Monetization Layout & Ad Placement Architecture

Ad delivery is engineered strictly to avoid player annoyance, prevent touch misclicks, and eliminate Cumulative Layout Shift (CLS):
* **Fixed Pre-Allocated Ad Slots**:
  - `components/ads/ad-banner.tsx`: Reserves exact container dimensions (`min-h-[250px]` desktop sidebar, `min-h-[50px]` mobile bottom) using CSS aspect ratio / min-height so content never jumps when an ad loads.
* **AdSense Script Management**:
  - `components/ads/adsense-script.tsx`: Injects Google AdSense script asynchronously only once via Next.js `Script` (`strategy="afterInteractive"`). Configurable via `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.
* **Monetag Transition Hooks**:
  - Secondary fallback network initialized via `NEXT_PUBLIC_MONETAG_TAG_ID`.
  - Triggered exclusively when a player voluntarily clicks "Practice Unlimited" after finishing their official daily game, never interrupting active gameplay.

--------------------------------------------------------------------------------

## Alternatives Considered

### 1. Fully Gated Game Routes (Require Login to Play)

*   **Mechanism**: Maintain `/games/*` inside `middleware.ts` redirecting unauthenticated users to `/login`.
*   **Trade-off**: Simplifies user attribution and ensures every game session maps to an authenticated database record from the first click.
*   **Reason for Rejection**: *Rejected by author*. Blocks search engine bots (Googlebot) from crawling and indexing game pages, destroys organic search traffic acquisition, and leads to immediate Google AdSense application rejection under the "Site Behind Login / Thin Content" policy.

### 2. Pure Procedural Generation at Runtime

*   **Mechanism**: Generate puzzle boards dynamically inside Vercel serverless functions using random seed generators.
*   **Trade-off**: Requires zero committed puzzle seed files in the repository.
*   **Reason for Rejection**: *Rejected by author*. High risk of producing unsolvable or ambiguous puzzle configurations on constraint-heavy games like Queens, Tango, and Crossclimb. Serverless execution timeouts can occur during heavy backtracking solver runs. A pre-validated curated bank guarantees 100% solvability and sub-millisecond page delivery.

### 3. Mid-Game Interstitial & Pop-Under Ads

*   **Mechanism**: Trigger full-screen popups or video interstitials mid-game after a timer or between moves.
*   **Trade-off**: Maximizes raw ad impressions per user session.
*   **Reason for Rejection**: *Rejected by author*. Severely degrades cognitive puzzle flow, triggers massive user bounce rates, causes mobile touch misclicks, and risks Google AdSense account suspension under accidental click enforcement.

### 4. Pure HTML5 Canvas Rendering (Zero DOM Elements)

*   **Mechanism**: Render all puzzle boards exclusively inside a single `<canvas>` element using Pixi.js or Canvas2D.
*   **Trade-off**: Centralizes high-framerate rendering and particle effects.
*   **Reason for Rejection**: *Rejected by author*. Canvas elements are opaque to search engine indexers and screen readers. Renders text un-indexable by Google, destroying organic SEO rankings and triggering AdSense "Thin Content" flags due to low semantic DOM density. SVG and semantic DOM components provide native vector crispness, search crawler visibility, and accessibility.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `prisma/schema.prisma` (Modify)
*   **Type / Scope**: Prisma Data Model & Migration.
*   **Rationale**: Adds `DailyGameCompletion` model (with composite unique key `[userId, gameSlug, dateKey]`), adds `issueNumber` and `mode` to `GameSession`, and links new relational fields to `User`.

#### 2. `middleware.ts` (Modify)
*   **Type / Scope**: Next.js Edge Middleware.
*   **Rationale**: Removes `/games` from the protected route barrier. Unauthenticated users and web crawlers can freely access `/games/*`, while `/dashboard` remains strictly authenticated and `/login`/`/register` remain guest-guarded.

#### 3. `lib/puzzles/types.ts` (Create)
*   **Type / Scope**: TypeScript Types & Data Contracts.
*   **Rationale**: Defines the 8 game slugs (`queens`, `tango`, `mini-sudoku`, `pinpoint`, `crossclimb`, `patches`, `zip`, `wend`), board state schemas, puzzle definition shapes, and API request/response payloads.

#### 4. `lib/puzzles/daily-engine.ts` (Create)
*   **Type / Scope**: Core Game Domain Logic.
*   **Rationale**: Provides UTC epoch calculation, edition resolution (`#IssueNumber`), calendar date-key formatting, and puzzle pool indexing for daily and practice modes.

#### 5. `lib/puzzles/evaluators.ts` (Create)
*   **Type / Scope**: Algorithmic Verification Engine.
*   **Rationale**: Implements deterministic solution verification for all 8 puzzle types (Queens constraint checker, Tango balance & consecutive checker, Sudoku digit validator, Pinpoint category matcher, Crossclimb ladder validator, Patches grid coverage checker, Zip path continuity validator, and Wend word weave validator). Runs client-side for instant win state and server-side for authoritative score validation.

#### 6. Curated Puzzle Banks: `data/puzzles/*.json` (Create 8 files)
*   `data/puzzles/queens.json`: 30 verified solvable Queens puzzles (regions, grid size, solution coordinates).
*   `data/puzzles/tango.json`: 30 verified Tango boards (grid size, fixed suns/moons, equality constraints).
*   `data/puzzles/mini-sudoku.json`: 30 4x4 and 6x6 Sudoku puzzles with unique solutions.
*   `data/puzzles/pinpoint.json`: 30 category deduction puzzles with 5 ordered clues.
*   `data/puzzles/crossclimb.json`: 30 word ladder puzzles with trivia clues.
*   `data/puzzles/patches.json`: 30 polyomino tiling puzzles (target silhouette + patch shapes).
*   `data/puzzles/zip.json`: 30 path finding puzzles (numbered node matrices).
*   `data/puzzles/wend.json`: 30 word weave letter grids with valid dictionary path lists.

#### 7. Monetization Components: `components/ads/` (Create 3 files)
*   `components/ads/adsense-script.tsx`: Next.js Script wrapper asynchronously loading AdSense with client ID verification and error boundary.
*   `components/ads/ad-banner.tsx`: Pre-allocated CSS container preventing CLS with responsive slots (sidebar 300x250/300x600, bottom banner 320x50).
*   `components/ads/monetag-hook.tsx`: Client trigger managing optional Monetag interstitial display on practice mode transitions.

#### 8. Interactive Game Boards: `components/games/` (Create 9 files)
*   `components/games/shared/puzzle-shell.tsx`: Unified header, timer, issue badge, practice indicator, restart/undo toolbar, and victory modal with streak tracking and guest-to-user conversion prompts.
*   `components/games/queens/queens-board.tsx`: Interactive SVG/DOM region grid with cell state cycling (`Empty` -> `X` -> `Crown`), collision red-glow feedback, and quick-cross drag.
*   `components/games/tango/tango-board.tsx`: Binary grid with tap-cycle (`Empty` -> `Sun` -> `Moon`), edge constraint indicators, and violation warnings.
*   `components/games/mini-sudoku/mini-sudoku-board.tsx`: Touch-friendly mini Sudoku grid with on-screen digit keypad and note-taking mode.
*   `components/games/pinpoint/pinpoint-board.tsx`: Progressive clue-reveal flip card interface with autocomplete category guess input.
*   `components/games/crossclimb/crossclimb-board.tsx`: Word ladder tile interface with trivia clue displays and letter-swap input.
*   `components/games/patches/patches-board.tsx`: Drag-and-drop / click-to-place polyomino board with shape rotation controls.
*   `components/games/zip/zip-board.tsx`: Continuous pointer-drag path drawing canvas across numbered node checkpoints.
*   `components/games/wend/wend-board.tsx`: Swipe/drag 8-directional word tracer on 4x4 letter grid with found-word discovery drawer.

#### 9. `app/games/[slug]/page.tsx` (Modify)
*   **Type / Scope**: Next.js Server Component.
*   **Rationale**: Loads daily puzzle edition, server-renders Schema.org JSON-LD structured data, renders rich editorial content (rules, tutorials, strategies, FAQs) for AdSense compliance and SEO ranking, and mounts the puzzle shell alongside responsive ad banners.

#### 10. `app/api/puzzles/submit/route.ts` (Create)
*   **Type / Scope**: Next.js API Route Handler (Node.js runtime).
*   **Rationale**: Authoritatively verifies completed puzzle board states via `lib/puzzles/evaluators.ts`. Enforces the 1-daily-ranked attempt limit per user per game in `DailyGameCompletion`. Awards XP and streak for daily runs, commits unranked records for practice mode, and logs validation failures to Vercel runtime logs.

#### 11. `app/dashboard/page.tsx` (Modify)
*   **Type / Scope**: Next.js Server Component.
*   **Rationale**: Redesigns the user hub into an 8-card daily puzzle suite matching the LinkedIn Games layout, showing daily issue numbers, completion status pills, daily completion streak, and direct links to play or practice.

#### 12. `app/sitemap.ts` (Create)
*   **Type / Scope**: Next.js Dynamic Sitemap Generator.
*   **Rationale**: Dynamically outputs `sitemap.xml` containing canonical URLs for all 8 games, root landing page, and leaderboard, accelerating indexing in Google Search Console.

#### 13. `tests/puzzles.test.ts` (Create)
*   **Type / Scope**: Vitest Unit Test Suite.
*   **Rationale**: Tests UTC issue calculation consistency, board evaluation logic for each of the 8 game engines, solution verification edge cases, and submission quota constraints.

### Verification Plan

*   **Database Migration**: Run `npx prisma db push` or `npm run db:migrate` against dev database to confirm schema updates apply cleanly.
*   **Typecheck**: Run `npm run typecheck` to verify zero TypeScript errors across all 8 game engines, types, and components.
*   **Linting**: Run `npm run lint` to enforce clean code conventions and accessibility standards.
*   **Unit Tests**: Run `npm run test` to verify puzzle evaluator algorithms and edition calculation suites pass 100%.
*   **Next.js Build**: Run `npm run build` to confirm static generation, sitemap creation, and edge middleware bundling succeed.
*   **Manual End-to-End Verification**:
    1. Open incognito window (Guest) → Navigate to `/games/queens` → Confirm game loads without login redirect.
    2. Inspect page source → Confirm Schema.org JSON-LD and editorial content (rules, tutorials, FAQs) are rendered.
    3. Play and solve Queens puzzle → Confirm victory card displays time and guest signup call-to-action.
    4. Sign in as registered user → Play daily puzzle → Confirm 100 XP and streak awarded.
    5. Re-play same game on same day → Confirm game enters Practice Mode (0 XP awarded, unlimited plays).
    6. Verify AdBanner renders fixed-dimension containers without CLS.
