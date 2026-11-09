# Brain Games — Agent Instructions

## Product and scope

Brain Games is a responsive brain-training web application inspired by LinkedIn Games and Lumosity. MVP games: Number Rush, Logic Grid, Memory Match, and Word Connect. Core progression: persistent game history, lifetime XP, level, streak, daily challenge, and global leaderboard. Real-time multiplayer is explicitly deferred.

Read `PRODUCT_SPEC.md` before implementing product changes.

## Fixed architecture

- Hosting/deployment: Vercel, connected to GitHub.
- Framework: Next.js App Router, React, TypeScript.
- Runtime: Node.js 24.x. Use the Node.js runtime for Prisma-backed routes; do not move Prisma routes to Edge.
- Database: Neon PostgreSQL.
- ORM: Prisma 6.
- Runtime database URL: `DATABASE_URL` (Neon pooled URL; hostname contains `-pooler`).
- Migration/admin URL: `DATABASE_URL_UNPOOLED` (direct Neon URL). Prisma schema maps this with `directUrl`.
- Authentication: Auth.js v5 Credentials provider, bcrypt password hashes, JWT sessions. No Auth.js database adapter is configured.
- Styling: Tailwind CSS.
- Tests: Vitest and Playwright.
- Package manager: npm; commit `package-lock.json`.

Do not reintroduce a required local PostgreSQL server, Docker Compose, Redis, Ably, or a separate API server without an explicit product decision. Multiplayer is later scope.

## Environment and secrets

- Never commit `.env`, Neon connection strings, Auth secrets, passwords, or tokens.
- Update `.env.example` when adding an environment variable.
- Never print secrets in logs, tests, or generated documentation.
- Auth.js requires `AUTH_SECRET`; `AUTH_TRUST_HOST=true` is configured for deployment.
- Use distinct Neon branches/credentials for development, preview, and production.

## Database rules

- Make schema changes in `prisma/schema.prisma` and commit a migration under `prisma/migrations/`.
- Use `npm run db:migrate` only against development databases.
- Use `npm run db:deploy` to apply committed migrations to production.
- Never use `prisma db push` as the production migration strategy.
- Runtime queries must use the pooled `DATABASE_URL`; Prisma CLI migrations use `DATABASE_URL_UNPOOLED`.
- Keep the Prisma client in the module-level singleton in `lib/prisma.ts` to reduce connections in warm Vercel Functions.
- Use transactions for related writes to XP, competitive score, streak, game session, and daily challenge records.
- Preserve foreign keys, unique constraints, and indexes for leaderboard/history queries.

## Security and game integrity

- Treat every browser input as untrusted. Validate request bodies with Zod.
- Require an authenticated session for private APIs and pages.
- Never accept client-submitted score, XP, level, streak, or correctness totals as authoritative. Grade answers on the server.
- Hash passwords with bcrypt; never return password hashes.
- Use safe, generic authentication errors.
- Add rate limiting to auth and game submission before public launch.
- Avoid leaking user email addresses in public leaderboard responses.

## Product logic

- Keep lifetime XP and competitive score separate.
- Preserve level thresholds in `lib/games.ts` and `PRODUCT_SPEC.md` consistently.
- Daily challenge and streak dates currently use UTC; do not silently change timezone semantics.
- A daily reward must be awarded at most once per user per date; enforce this in the database, not only in UI.
- Do not add multiplayer dependencies or live-room code in this MVP phase.

## Code conventions

- TypeScript strict mode; avoid `any`.
- Prefer server components; add `"use client"` only for interactive UI.
- Keep business logic in `lib/` or feature modules, not inside presentational components.
- Use semantic HTML, accessible labels, keyboard support, and responsive layouts from 360px upward.
- Handle loading, empty, validation, and error states.
- Keep API responses typed and predictable.

## Required verification

Before declaring a change complete, run what is available:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

For user-facing flows, also run `npm run test:e2e` after installing Playwright Chromium. If a check cannot run, state that explicitly; never claim it passed.

## Deployment rules

- Vercel Git integration handles Preview and Production deployments.
- Do not put Vercel deployment tokens in the repository.
- Do not run production migrations automatically on every build.
- Keep `vercel.json` and Vercel project Node.js version aligned with Node.js 24.x.
- Read `DEPLOYMENT.md` before changing deployment or environment configuration.
