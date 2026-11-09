# Brain Games

A responsive brain-training web app built with Next.js, TypeScript, Auth.js, Prisma, and Neon PostgreSQL. The project is Vercel-first: no Docker or local database is required.

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- Auth.js v5 Credentials provider (JWT sessions)
- Prisma ORM 6 + Neon PostgreSQL
- Vercel hosting and GitHub-based deployments
- Vitest and Playwright for testing

## Requirements

- Node.js 24.x and npm 11+
- A Neon PostgreSQL database
- Git and VS Code (GitHub Copilot recommended)

## Quick start on Linux

1. Install Node.js 24 (NVM recommended) and Git.
2. Clone or extract this repository and enter the project directory.
3. Install dependencies (this creates `package-lock.json` on the first install; commit that file to Git):

   ```bash
   npm install
   ```

4. Create `.env` from the example:

   ```bash
   cp .env.example .env
   ```

5. In Neon, create a development database/branch. Copy its **pooled** connection string into `DATABASE_URL` and its **direct/unpooled** connection string into `DATABASE_URL_UNPOOLED`.
6. Generate an Auth.js secret and put it in `.env`:

   ```bash
   npm exec auth secret
   ```

   Alternatively: `openssl rand -base64 33`.
7. Generate Prisma Client and apply migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

8. Start the app:

   ```bash
   npm run dev
   ```

Open http://localhost:3000.

## Database connection rules

- `DATABASE_URL`: Neon pooled URL (hostname includes `-pooler`); used by the running app.
- `DATABASE_URL_UNPOOLED`: Neon direct URL; used by Prisma CLI for migrations and admin tasks.
- Never commit `.env` or paste database credentials into issues, chat, or source files.
- Production migrations are run explicitly with `npm run db:deploy`; they are not run automatically during every Vercel build.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests |
| `npm run test:e2e` | Playwright tests |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations to production |
| `npm run db:studio` | Open Prisma Studio |

## Deploy to Vercel

Read [DEPLOYMENT.md](./DEPLOYMENT.md). The short version: push the repository to GitHub, import it into Vercel, connect the Neon integration, configure `AUTH_SECRET`, run production migrations once, and deploy.

## Project instructions

- `AGENTS.md`: repository-wide coding and architecture rules.
- `.github/copilot-instructions.md`: GitHub Copilot repository instructions.
- `PRODUCT_SPEC.md`: product scope and acceptance criteria.
- `DEVELOPMENT_SETUP.md`: local Linux development setup.
- `DEPLOYMENT.md`: Neon + GitHub + Vercel deployment.

## Important MVP notes

- Multiplayer is intentionally deferred.
- Scores and XP must be calculated on the server, never trusted from browser totals.
- Lifetime XP and competitive score are separate values.
- Daily challenge/streak date keys currently use UTC.
- Before a public launch, add robust rate limiting, email verification, password reset, observability, and anti-cheat protections.
