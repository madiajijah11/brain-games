# Brain Games — Product Specification

## Product vision
A modern, responsive web platform for short brain-training games. Users build a daily habit, track progress, and compete through a global leaderboard.


## Technical architecture

- Deployment and hosting: Vercel, connected to GitHub.
- Application: Next.js App Router, React, TypeScript, Node.js 24.x.
- Database: Neon PostgreSQL. `DATABASE_URL` is pooled for application traffic; `DATABASE_URL_UNPOOLED` is direct for Prisma CLI migrations.
- ORM: Prisma 6.
- Authentication: Auth.js v5 Credentials provider with bcrypt password hashing and JWT sessions.
- Styling: Tailwind CSS.
- Testing: Vitest and Playwright.
- Local PostgreSQL and Docker are not required.
- Realtime multiplayer is deferred to a later phase; MVP leaderboard is database-backed.

## Target audience
General users who enjoy quick puzzle, memory, numerical, logical, and verbal challenges. Initial product language: English; Indonesian localization can follow.

## MVP goals
1. Let a user register and sign in.
2. Let an authenticated user complete four game types.
3. Persist scores, XP, streak, and history in PostgreSQL.
4. Show progression and a global competitive leaderboard.
5. Deliver a responsive experience on mobile and desktop browsers.

## Game catalog
- Number Rush: number sequences and arithmetic patterns.
- Logic Grid: deductive reasoning, ordering, and classification.
- Memory Match: sequence and recall challenges.
- Word Connect: analogies, synonyms, and word relationships.

## Progression rules
- +20 XP per correct answer.
- +25 completion bonus for a perfect 5/5 round.
- Competitive score is tracked separately from lifetime XP to separate ranking from progression.
- Level thresholds: Beginner 0, Thinker 500, Strategist 1,500, Mastermind 3,500, Genius 7,000.
- A valid completed game updates the user's daily streak. First play starts at 1; consecutive UTC calendar days increment it; a missed day resets it.

## Core screens
- Public landing page.
- Registration and sign-in.
- Authenticated dashboard with XP, level, streak, games, and recent activity.
- Game play and result screen.
- Global leaderboard.

## Data entities
- User: identity, password hash, lifetime XP, competitive XP, streak, last played date.
- GameSession: game, score, correct count, duration, XP earned, timestamp.
- DailyEntry: one daily challenge completion per user and UTC date, including score and XP earned.

## Product roadmap
### MVP
Authentication, four games, persistent scoring, XP, levels, streak, dashboard, global leaderboard.
### Phase 2
Real-time multiplayer rooms, matchmaking, friend challenges, weekly/monthly leaderboard seasons, curated daily challenge calendar, achievements, profile customization.
### Phase 3
Admin content management, localization, analytics, accessibility audit, anti-cheat hardening, monetization.

## Non-functional requirements
- Responsive from 360px mobile width to desktop.
- Server-side persistence for user progress.
- Server-side grading; never trust client-submitted score totals.
- Password hashing with bcrypt.
- Protect user-specific APIs and pages with authenticated sessions.
- Production requirements: rate limiting, secure secrets, monitoring, backups, tests, email verification, password recovery, timezone-aware streaks.

## MVP acceptance criteria
- A new user can register, log in, and log out.
- A signed-in user can play each of the four games.
- A completed round is graded by the server and stored in PostgreSQL.
- XP and streak update after a completed round.
- Dashboard displays persisted progression and recent sessions.
- Leaderboard lists users ordered by competitive score.
