# GitHub Copilot Instructions — Brain Games

Before making changes, read the repository-root `AGENTS.md` and `PRODUCT_SPEC.md`. For deployment/database tasks, also read `DEPLOYMENT.md`. These files are the source of truth.

## Architecture

- Next.js App Router + React + TypeScript, deployed on Vercel through GitHub.
- Node.js 24.x runtime; Prisma database routes must use Node runtime, not Edge.
- Neon PostgreSQL + Prisma 6.
- `DATABASE_URL` is the pooled Neon URL for runtime queries. `DATABASE_URL_UNPOOLED` is the direct URL for Prisma migrations/admin operations.
- Auth.js v5 Credentials provider with bcrypt and JWT sessions. No database adapter for Auth.js.
- Tailwind CSS; Vitest and Playwright.
- Multiplayer is deferred. Do not add Redis, Ably, WebSockets, or a separate backend unless asked.

## Implementation rules

1. Use server components by default. Use client components only when browser interaction/state is needed.
2. Validate all API inputs with Zod. Authenticate and authorize on the server.
3. Compute answers, score, XP, streak, and rewards on the server. Never trust totals from the browser.
4. Use Prisma transactions for coupled progress updates. Enforce one daily reward per user/date with the database unique constraint.
5. Keep lifetime XP separate from competitive score.
6. Do not expose private user data in leaderboard APIs.
7. Keep all secrets in environment variables. Never commit `.env` or print connection strings. Update `.env.example` for new variables.
8. Make schema changes with Prisma migrations. Use `db:migrate` for development and `db:deploy` for production. Never use `db push` in production.
9. Keep UTC date semantics for daily challenges and streaks unless the product specification is deliberately revised.
10. Ensure responsive behavior from 360px mobile width and accessible keyboard/screen-reader interaction.

## Code quality

- TypeScript strict mode; no `any` unless justified.
- Keep business logic out of presentational components.
- Handle loading, empty, validation, and failure states.
- Add/update tests for logic and user flows.
- Do not silently alter product scope or level thresholds.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` when practical. Run `npm run test:e2e` for UI workflows when browser dependencies are installed. Report checks that were not run; do not claim unverified success.
