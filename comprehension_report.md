# Stage 6 Review Report: Comprehension Test

*   **Target Document:** `docs/designs/auth-guard-and-game-submission-integrity.md`
*   **Reviewer:** `egm-comprehension`
*   **Date:** 2026-11-09

---

## Feature Specification Paraphrase

The feature specification addresses two production-level bugs in the Brain Games web app:
1. **Centralized Guest & Protected Route Interception**: Currently, logged-in users who visit `/login` or `/register` are greeted with authentication forms rather than being redirected to the dashboard. The design solves this by establishing a centralized Edge Middleware (`middleware.ts`) powered by Auth.js v5 JWT cookie verification. Authenticated users requesting guest pages are automatically redirected to `/dashboard`. Unauthenticated users attempting to access protected paths (`/dashboard`, `/games/*`) are intercepted and sent to `/login` with their target path preserved in `callbackUrl`. The middleware runs strictly without database or Prisma imports to maintain sub-10ms response times at the network edge.
2. **Resilient Game Submission Pipeline**: Completing game sessions currently fails with a generic "Invalid game submission" error due to distributed clock skew: client devices calculate duration by subtracting a server-generated start timestamp from local device time, resulting in negative duration when the client clock lags behind the server. The specification resolves this by measuring duration on the client using monotonic time (`performance.now()`). The server validates that the submission meets strict physical limits (between 3,000 ms and 600,000 ms, with 5 question answers). Generic error messages are preserved for clients to prevent anti-cheat reverse engineering, while detailed Zod validation failure structures are output to serverless console logs for debugging in Vercel.

## Implementation Plan Paraphrase

The implementation plan breaks down the delivery into 6 concrete file operations:
1. **`auth.config.ts` (New)**: Defines Edge-compatible NextAuth configuration (JWT strategy, custom sign-in page, JWT/session token mappings) with zero imports of Prisma or bcrypt.
2. **`middleware.ts` (New)**: Next.js Edge Middleware invoking `NextAuth(authConfig).auth`. Matches application routes, redirects authenticated users away from guest routes, and guards private routes.
3. **`lib/auth.ts` (Modified)**: Spreads `authConfig` and registers the database-backed Credentials provider with Prisma and bcryptjs for Node.js runtime usage.
4. **`components/game-runner.tsx` (Modified)**: Switches duration tracking from server timestamps to client monotonic `performance.now()`, calculating non-negative integer durations upon game completion.
5. **`app/api/games/submit/route.ts` (Modified)**: Updates Zod duration schema to enforce bounds between 3,000 ms and 600,000 ms and logs structured diagnostic payloads via `console.error` when validation fails.
6. **`tests/games.test.ts` (New)**: Unit tests verifying submission schema boundaries and grading algorithms.
Verification is conducted via TypeScript compilation (`npm run typecheck`), linting, Vitest tests, Next.js build verification, and end-to-end user navigation checks.

---

## Findings

*   **Self-Containment [PASS]**: Both the high-level intent and the step-by-step implementation plan are self-contained. An engineer can execute the implementation without missing dependency or interface questions.
*   **Clarity & Invariants [PASS]**: The boundary between Edge runtime (`auth.config.ts`, `middleware.ts`) and Node.js runtime (`lib/auth.ts`, `app/api/**`) is explicitly documented, preventing runtime bundler regressions.
*   **Ambiguity Check [NONE]**: No unresolved TBDs, vague requirements, or missing files detected.
