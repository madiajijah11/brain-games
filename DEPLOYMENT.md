# Deployment Architecture — GitHub + Vercel + Neon (Separate Strategy)

This document details the multi-environment deployment architecture for Brain Games using Vercel (Next.js hosting), GitHub (source control & automated CI/CD), and Neon PostgreSQL configured with the **Separate** branching strategy.

---

## 1. Environment & Architecture Overview

The "Neon: separate" architecture isolates data, migrations, and secrets across environments so that debugging, pre-production validation, and development never contaminate or risk production user data:

| Environment | GitHub Trigger / Branch | Vercel Deployment Type | Neon Database Branch | Purpose / Debug Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | Local / `dev` branch | Vercel CLI (`vercel dev` / local) | `dev` branch | Local feature development, running `prisma migrate dev`. |
| **Preview / Pre-production** | Feature branches / PRs / `staging` | **Preview Deployment** (unique URL per PR/branch) | `preview` branch (or dynamic preview branches) | Cloud debugging directly on Vercel, smoke testing, PR review. |
| **Production** | `main` branch | **Production Deployment** (primary domain) | `main` / `production` branch | Live public application. High stability, zero manual testing data. |

---

## 2. Neon PostgreSQL Configuration (Separate Branches)

In your Neon console (https://console.neon.tech/):

1. **Create the Project** (e.g. `brain-games`).
2. **Setup Branches**:
   - `production` (default/main branch): Houses production tables and live user progress.
   - `preview`: Created as a child of `production` or dedicated branch for Vercel Preview deployments.
   - `dev`: Dedicated branch for local coding and applying new Prisma schema changes.
3. **Connection Strings for Each Branch**:
   For *each* of the branches (`production`, `preview`, `dev`), Neon provides two connection URLs:
   - **Pooled URL** (hostname contains `-pooler`): Used by `DATABASE_URL` for serverless Next.js runtime queries.
   - **Direct / Unpooled URL** (no `-pooler`): Used by `DATABASE_URL_UNPOOLED` for Prisma CLI migrations (`directUrl`).

---

## 3. Vercel Environment Variables Configuration

In **Vercel Dashboard → Project Settings → Environment Variables**, assign environment-specific values using Vercel's scope checkboxes (**Production**, **Preview**, **Development**):

| Variable Name | Environment Scopes | Value Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | **Production** | Neon `production` branch pooled connection string (`-pooler`). |
| `DATABASE_URL` | **Preview** | Neon `preview` branch pooled connection string (`-pooler`). |
| `DATABASE_URL` | **Development** | Neon `dev` branch pooled connection string (`-pooler`). |
| `DATABASE_URL_UNPOOLED` | **Production** | Neon `production` branch direct/unpooled connection string. |
| `DATABASE_URL_UNPOOLED` | **Preview** | Neon `preview` branch direct/unpooled connection string. |
| `DATABASE_URL_UNPOOLED` | **Development** | Neon `dev` branch direct/unpooled connection string. |
| `AUTH_SECRET` | **Production** | Dedicated strong secret generated via `npm exec auth secret`. |
| `AUTH_SECRET` | **Preview**, **Development** | Dedicated preview/dev secret (independent from production). |
| `AUTH_TRUST_HOST` | **All** (Prod, Preview, Dev) | `true` (enables Auth.js v5 dynamic preview domain host detection). |

> **Note on Neon Vercel Marketplace Integration:**
> If you connect Neon via the Vercel Marketplace integration, you can either select automatic branch creation per preview deployment or map static branches (`production` vs `preview`). Ensure variable names match `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

---

## 4. Database Migration Protocol (Prisma 6 + Neon Separate)

Because Neon branches are separated, schema migrations must be applied deliberately per environment.

### A. Development (Local)
Create and test migrations locally against your `dev` branch:
```bash
npm run db:migrate
```
This generates a new migration folder under `prisma/migrations/` and updates the `dev` database.

### B. Preview / Staging Environment
Before or when testing a PR on Vercel Preview with schema changes, apply the committed migration to the Neon `preview` branch:
```bash
DATABASE_URL_UNPOOLED="<NEON_PREVIEW_DIRECT_URL>" DATABASE_URL="<NEON_PREVIEW_POOLED_URL>" npm run db:deploy
```

### C. Production Release
Before or immediately after merging to `main`, apply migrations to production from a secure environment:
```bash
DATABASE_URL_UNPOOLED="<NEON_PROD_DIRECT_URL>" DATABASE_URL="<NEON_PROD_POOLED_URL>" npm run db:deploy
```

### Why Migrations Are NOT in the Vercel Build Script
`npm run build` and `vercel-build` deliberately run `prisma generate && next build` without `prisma migrate deploy`. Running migrations during automated Vercel builds causes:
- Race conditions when multiple preview deployments build concurrently.
- Accidental migration lockups on Neon.
- Deployment failures if a migration requires data transformation or temporary downtime.

---

## 5. Direct Debugging Workflow on Vercel

When debugging directly on Vercel (Production vs Preview vs Dev):

### A. Real-Time Serverless Runtime Logs
1. Go to **Vercel Dashboard → Deployments**.
2. Click on the active Preview or Production deployment.
3. Navigate to the **Logs** tab (Runtime Logs).
4. Filter by HTTP status (e.g., `500`), Function route (`/api/games/submit`, `/api/auth/*`), or text queries to inspect:
   - Server-side game validation errors.
   - Prisma query errors or connection exhaustion.
   - Auth.js JWT session verification and callbacks.

### B. Vercel Toolbar & Preview Commenting
- Every Preview Deployment includes the **Vercel Toolbar** by default.
- Use it to inspect draft headers, share previews, and pinpoint UI/UX bugs on real mobile/desktop viewports without logging into production.

### C. Reproducing Vercel Environment Locally via Vercel CLI
If an issue occurs only in Vercel's preview environment:
```bash
# Pull Preview environment variables to your local machine
vercel env pull .env.preview.local --environment=preview

# Or pull Development variables
vercel env pull .env.development.local --environment=development
```
This ensures your local debugging session connects to the exact same isolated Neon branch and configuration as the Vercel cloud instance.

---

## 6. Step-by-Step GitHub & Vercel Setup

### Step 1: Initialize Git & Push to GitHub
From the project root (`F:\Website\brain-games-mvp`):

```bash
git init
git add .
git commit -m "chore: initial Brain Games MVP commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/brain-games-mvp.git
git push -u origin main
```
*(Verify `.env` and sensitive local files remain uncommitted and ignored by `.gitignore`.)*

### Step 2: Import Project into Vercel
1. Log in to [vercel.com](https://vercel.com/) and click **Add New → Project**.
2. Select your `brain-games-mvp` repository from GitHub.
3. Configure settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `./`
   - **Build Command**: default (`npm run build`)
   - **Install Command**: default (`npm install`)
   - **Node.js Version**: **24.x** (in Project Settings → General).
4. Add the Environment Variables outlined in **Section 3**.
5. Click **Deploy**.

---

## 7. Verification Checklist

After deploying to Vercel, verify both Preview and Production deployments:

- [ ] Landing page (`/`) renders without hydration errors.
- [ ] Authentication (`/login`, `/register`) succeeds with JWT session persistence.
- [ ] User dashboard loads with XP, level, and streak tracking.
- [ ] All 4 MVP games (Number Rush, Logic Grid, Memory Match, Word Connect) function and submit scores to `/api/games/submit`.
- [ ] Server grading validates gameplay without trusting client scores.
- [ ] Daily Challenge and Leaderboards update in the Neon database.
- [ ] Vercel Function logs confirm clean database connection pooling via `-pooler`.
