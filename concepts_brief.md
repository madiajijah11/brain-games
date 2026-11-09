# Centralized Auth Guard & Game Submission Integrity

* **Author:** MexL
* **Date:** 2026-11-09

## Overview

Brain Games requires two critical structural hardening changes:
1. Centralized route protection via Next.js Middleware to ensure authenticated users are redirected away from guest routes (`/login`, `/register`) to `/dashboard`, while unauthenticated requests to protected paths are intercepted.
2. Robust game submission validation on `/api/games/submit` that enforces strict gameplay duration boundaries to block bots/speed-tampering without falsely rejecting legitimate players due to client-server clock drift. Client-facing error messages remain intentionally generic, while complete validation diagnostics are emitted exclusively to Vercel serverless runtime logs.

## Analysis

### 1. Contrarian / YAGNI Lens
* **Finding**: Next.js App Router allows redirects directly inside Server Component pages (`app/login/page.tsx`). Adding Middleware introduces an Edge execution layer.
* **Resolution**: The centralized middleware pattern is justified to eliminate per-page route leakage and handle dynamic redirect parameters (`callbackUrl`) across future game routes in one location. However, middleware must use a strict `matcher` configuration to avoid intercepting static assets (`_next/static`, icons, images), preventing unnecessary Edge Function invocations on Vercel.

### 2. Cost, Quota & Performance Economics Lens
* **Finding**: Running heavy authentication or database queries inside Vercel Edge Middleware exhausts compute quotas and fails with Prisma dependencies.
* **Resolution**: Auth.js v5 runs in JWT session mode without a database adapter. Middleware strictly decodes and validates the session cookie without contacting the Neon database, maintaining sub-10ms response times at zero additional database connection load.

### 3. UX & Ergonomics Lens
* **Finding**: The current `durationMs` validation in `/api/games/submit` rejects legitimate players if the client's system clock is slightly behind the server's clock (`Date.now() - startedAt < 0`), causing false-positive "Invalid game submission." errors.
* **Resolution**: Calculate elapsed duration using client-side monotonic timing (`performance.now()` or client start timestamp) and enforce strict physical gameplay limits on the server (e.g. minimum 3,000 ms to read and answer 5 questions, maximum 600,000 ms before session expiry).

### 4. Migration & Backward Compatibility Lens
* **Finding**: Does this change require database migrations or invalidate active sessions?
* **Resolution**: Completely schema-agnostic. No Neon database migrations are needed. Existing JWT sessions in player cookies continue to function without requiring re-login.

### 5. Observability & SRE Debuggability Lens
* **Finding**: The user specified that error responses to clients must remain hidden/generic for anti-cheat purposes (`{ error: "Invalid game submission." }`). Without telemetry, developers cannot diagnose production submission rejections.
* **Resolution**: Detailed Zod validation error trees (`parsed.error.flatten()`) and rejection reasons must be logged to standard error (`console.error`), appearing in real-time under Vercel Runtime Logs for direct operator debugging.

### 6. Long-Term Tech Debt & Maintenance Lens
* **Finding**: Spreading anti-cheat thresholds across route handlers creates maintenance drift across games.
* **Resolution**: Centralize submission thresholds in `lib/games.ts` alongside existing grading logic, keeping `app/api/games/submit/route.ts` as a thin orchestration controller.

### 7. Inventive Catalyst (Ideal Final Result)
* **Conflict**: Enforce strict anti-cheat duration validation without suffering from distributed client-server clock desynchronization.
* **Resolution**: The server does not calculate raw differences between asynchronous server and client wall clocks. Instead, it validates that the submitted duration satisfies realistic human physiological boundaries (≥3 seconds for 5 pattern questions, ≤10 minutes) and verifies sequential question answer completeness.

## Goals vs. Non-Goals

* **In-Scope Goals**:
  * Implement centralized `middleware.ts` guarding `/login` and `/register` (redirecting logged-in users to `/dashboard`) and protecting `/dashboard` and `/games/:path*`.
  * Fix the clock drift failure mode in `/api/games/submit` and `components/game-runner.tsx` while retaining strict upper and lower duration limits.
  * Emit structured validation diagnostics to Vercel Serverless Logs while preserving generic error output for client responses.
* **Out-of-Scope Non-Goals**:
  * Edge-based database querying or session persistence via Prisma (Edge middleware remains database-free).
  * Rate-limiting storage infrastructure (Redis/Upstash) in this MVP slice.
  * Complex client-side anti-tampering or obfuscation libraries.

## Alternatives Weighed

* **Page-Level Server Component Redirects Only**:
  * *Reason for rejection*: Rejected by author. Lacks centralized coverage, requires duplicating session checks in every current and future route file, and does not handle uniform return redirects.
* **Permissive Client Duration (Zero Server Enforcement)**:
  * *Reason for rejection*: Rejected by author. Violates the strict anti-cheat requirement, allowing automated scripts to submit 0ms perfect scores to global leaderboards.
* **Verbose Client Error Payloads**:
  * *Reason for rejection*: Rejected by author. Exposing exact validation failure schemas to the browser assists attackers in reverse-engineering anti-cheat validation parameters.

## Key Decisions & Staging for Next Steps

1. **Middleware Architecture**: Create `middleware.ts` using Auth.js `auth` with an explicit route matcher.
2. **Timing Protocol**: Fix `components/game-runner.tsx` to compute client duration cleanly (`Math.max(0, Math.round(performance.now() - startTime))`), and update `/api/games/submit/route.ts` schema to clamp minor clock drift while enforcing strict physiological minimums (≥3000ms) and maximums (≤600000ms).
3. **Telemetry**: Add structured server-side console logging for rejected submissions.
