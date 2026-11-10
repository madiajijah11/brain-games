# Stage 6 Review Report: Comprehension Test

*   **Target Document:** `docs/designs/linkedin-style-8-game-daily-puzzle-suite.md`
*   **Reviewer:** `egm-comprehension`
*   **Date:** 2026-11-10

---

## Feature Specification Paraphrase

The feature specification details a comprehensive overhaul of Brain Games into an 8-game daily puzzle platform modeled after LinkedIn Games:
1. **The 8 Direct-Manipulation Puzzles**: Transitions from text multiple-choice questions to interactive tactile spatial games: Queens (region crown placement), Tango (binary grid balance), Mini Sudoku (4x4 / 6x6 number deduction), Pinpoint (progressive clue deduction), Crossclimb (1-letter swap word ladder), Patches (polyomino spatial tiling), Zip (continuous node connection), and Wend (8-directional word weaving).
2. **Daily Scarcity & Edition Engine**: Synchronizes all players globally to a shared daily edition (`#IssueNumber`) derived from a constant UTC epoch. The first completion of a daily puzzle awards official XP, advances the player's streak, and commits a ranked record in PostgreSQL (`DailyGameCompletion`). Subsequent plays on the same calendar day transition into an unranked Practice Mode awarding 0 XP.
3. **Public Access, SEO & Monetization**: Unlocks `/games/*` from authentication barriers, enabling search engines (Googlebot) and guest users to load and play daily puzzles freely. Each game route server-renders Schema.org JSON-LD and in-depth editorial guides (rules, tutorials, strategies, and FAQs) to rank for organic search terms and satisfy Google AdSense's "Valuable Content" policy. Monetization is managed via pre-allocated, fixed-dimension AdSense ad units to prevent Cumulative Layout Shift (CLS), with secondary Monetag interstitial hooks reserved strictly for voluntary mode transitions.

## Implementation Plan Paraphrase

The implementation plan establishes a clear, multi-tiered roadmap spanning 13 key file groups:
1. **Prisma & Database Schema**: Updates `prisma/schema.prisma` with the `DailyGameCompletion` model (keyed by `[userId, gameSlug, dateKey]`) and adds `issueNumber` and `mode` to `GameSession`.
2. **Edge Middleware**: Modifies `middleware.ts` to allow unrestricted public access to `/games/*` while preserving protections on `/dashboard` and guest-guards on `/login`/`/register`.
3. **Core Domain & Puzzle Engines**: Creates `lib/puzzles/types.ts` for data contracts, `lib/puzzles/daily-engine.ts` for UTC edition mapping, and `lib/puzzles/evaluators.ts` containing deterministic solution solvers for all 8 game types.
4. **Curated Data Assets**: Creates 8 JSON puzzle banks in `data/puzzles/*.json`, each holding 30 verified-solvable configurations.
5. **Monetization & Ads**: Creates `adsense-script.tsx`, CLS-safe `ad-banner.tsx`, and `monetag-hook.tsx`.
6. **UI Components & Game Boards**: Implements `puzzle-shell.tsx` (timer, header, issue badge, post-win guest signup modal) and 8 bespoke interactive board components under `components/games/`.
7. **Pages & Dynamic Routing**: Updates `app/games/[slug]/page.tsx` with dynamic editorial guides and JSON-LD schema, creates `app/api/puzzles/submit/route.ts` for authoritative validation and scoring, updates `app/dashboard/page.tsx` into an edition-stamped 8-card grid, and generates `app/sitemap.ts`.
8. **Verification**: Executes database push, TypeScript typechecking, linting, Vitest unit test suites (`tests/puzzles.test.ts`), Next.js production builds, and end-to-end guest/authenticated play validations.

---

## Findings

*   **Self-Containment [PASS]**: Both the high-level intent and the step-by-step implementation plan are self-contained. The dependencies, data contracts, and component boundaries are clear and require no external guesswork.
*   **Clarity & Invariants [PASS]**: The distinction between ranked daily play and unranked practice play is mathematically and architecturally explicit across the UI, API, and database schema.
*   **Ambiguity Check [NONE]**: No unresolved TBDs, vague specifications, or dangling file paths were detected.
