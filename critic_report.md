# Stage 7 Review Report: Critic Review

*   **Target Document:** `docs/designs/auth-guard-and-game-submission-integrity.md`
*   **Reviewers:** `egm-design`, `egm-structural`, `egm-style`
*   **Date:** 2026-11-09

---

## 1. Executive Summary

The Critic Review evaluated the feature specification and architectural contracts (lines 1–149). The core route interception and timing protocols are sound. However, reviewers identified one functional blind spot in authentication redirect handling (`callbackUrl`) and refined the Edge middleware matching boundary.

---

## 2. Findings by Lens

### A. Design & Behavioral Ergonomics (`egm-design`)

*   **Finding [CRITICAL-01: UX Drop-off in `callbackUrl` Handling]**:
    *   *Issue*: The Technical Plan states that unauthenticated visitors to protected routes (`/dashboard`, `/games/:slug`) will be redirected to `/login?callbackUrl=...`. However, `components/auth-form.tsx` currently hardcodes:
        ```typescript
        router.push("/dashboard");
        ```
        If a user attempts to open a direct challenge link (e.g., `/games/number-rush?daily=1`), is forced to sign in, and submits credentials, they are dropped into `/dashboard` instead of returning to the requested game.
    *   *Remediation*: Update `components/auth-form.tsx` to read `searchParams.get("callbackUrl")` and sanitize it (ensuring it is a relative path starting with `/` to prevent open-redirect vulnerabilities), defaulting to `/dashboard` only if no valid callback parameter exists.

### B. Structural & Systems Integrity (`egm-structural`)

*   **Finding [WARN-01: API Boundary Separation]**:
    *   *Observation*: APIs under `/api/**` must never be redirected with HTTP 307 by Middleware, as programmatic fetch requests expect JSON error payloads (`{ error: "Unauthorized" }` with HTTP 401) rather than HTML redirect documents.
    *   *Verification [PASS]*: The matcher specification explicitly excludes `/api/**`, leaving API authentication to per-route `await auth()` checks.
*   **Finding [PASS: Root Landing Page Accessibility]**:
    *   *Verification*: The landing page `/` remains public and accessible to both guests and registered users, matching the product specification.

### C. Style & Specification Hygiene (`egm-style`)

*   **Finding [PASS]**: The document adheres strictly to the Plain-English standard. No ungrounded marketing adjectives (*seamless*, *blazingly fast*, *robust*) or decorative adverbs were detected.
*   **Finding [PASS]**: Architectural alternatives detail exact author rejection rationales.

---

## 3. Action Items for Remediation

1.  **Add `components/auth-form.tsx` to Implementation Targets**: Explicitly include handling of `callbackUrl` in `components/auth-form.tsx` to complete the end-to-end redirect loop.
2.  **Sanitization Rule**: Specify in the design that `callbackUrl` must begin with `/` and not `//` to eliminate open redirect vectors.
