# Tactile Mechanics Overhaul (Patches & Zip) and Retention-Driven UX Suite

*   **Author:** MexL
*   **Status:** Draft
*   **Date:** 2026-11-10

--------------------------------------------------------------------------------

## Overview

Brain Games will execute a targeted mechanics and user experience overhaul to eliminate tactile friction and accelerate viral retention. This technical design resolves interaction bugs in two critical games—**Patches** and **Zip**—while introducing a modern, clean sensory layer and a viral engagement suite inspired by LinkedIn Games and Wordle:
1. **Patches Interaction Re-architecture**: Replaces broken cell-tap targeting with native pointer drag-and-drop, real-time bounding box "ghost" snap previews, full color tile rendering on the target board, and click-to-retrieve piece removal.
2. **Zip Visual Path Redesign**: Eliminates numerical cell clutter by rendering the player's connection route as a smooth, continuous SVG ribbon line driven by direct pointer dragging across adjacent cells with dynamic backtracking.
3. **Procedural Web Audio Layer**: Introduces zero-asset synthesized tactile audio feedback (soft woodblock clicks, arpeggiated checkpoint chimes, celebratory victory chords) powered by the native Web Audio API with a persistent mute toggle.
4. **Viral Retention & Analytics Suite**: Equips the platform with spoiler-free emoji share cards, an 8/8 daily completion ring, a personal performance analytics modal, and a historical calendar archive for past puzzle editions.

## The Problem

User testing and direct gameplay inspection revealed two severe interaction defects and several missing retention mechanisms:

1. **Patches Visual Disconnect**:
   - The inventory dock marks pieces as "Placed", but the target grid above remains completely blank and white.
   - The board fails to render the colored tiles of placed shapes, leaving the player with no visual indication of grid occupancy.
   - Players cannot click placed pieces on the board to retrieve or reposition them, creating a dead-end state if a mistake is made.
2. **Zip Visual Confusion**:
   - Instead of drawing a continuous fluid path like the authentic LinkedIn Zip experience, the current implementation stamps raw numbers (1, 2, 3...) into every touched cell.
   - This creates visual chaos where checkpoint numbers (e.g. pos 2 in yellow) collide directly with sequence numbers (e.g. step 3 in purple), obscuring the topological layout and ruining the satisfaction of path-drawing.
3. **Missing Engagement & Viral Loops**:
   - Players have no clean, spoiler-free mechanism to share their completion times and moves to social networks (WhatsApp, LinkedIn, X).
   - There is no visible indicator showing how many of today's 8 daily editions have been cleared without navigating back to the dashboard.
   - Players cannot inspect their historical win rates or solve times, nor can they access past numbered puzzle editions.

## Goals

*   **Tactile Drag-and-Drop in Patches**: Implement fluid pointer drag-and-drop for polyomino pieces, displaying a semi-transparent ghost preview over the target grid while dragging, rendering full shape colors upon drop, and allowing players to click placed board pieces to return them to the dock.
*   **Continuous SVG Ribbon Path in Zip**: Replace cell number text with a continuous SVG ribbon line connecting cell centers along the drawn path, supporting smooth finger/mouse dragging and step-by-step backtracking.
*   **Zero-Asset Audio Synthesis**: Implement lightweight procedural sound effects using browser `AudioContext` oscillators (<40 lines of code, 0 KB network payload) for taps, path steps, and victory celebrations, with `localStorage`-persisted mute controls.
*   **Viral Emoji Share Cards**: Generate clean, spoiler-free text summaries (grid dimension, edition number, solve time, and performance rating) copyable to the clipboard in one click.
*   **8/8 Daily Progress Ring**: Display a radial completion ring in the navigation bar and dashboard reflecting real-time progress through today's 8 puzzle editions.
*   **Personal Player Analytics**: Provide a modal tracking total games played, win rate, average solve duration, current streak, best streak, and solve time distributions.
*   **Historical Calendar Archive**: Allow players to navigate past calendar days, select prior edition numbers, and play them in unranked Practice Mode.

## Non-Goals

*   **Third-Party Heavy Drag Libraries**: No heavy external packages (e.g. `dnd-kit`, `react-dnd`); native HTML5 Pointer Events provide superior 60 FPS mobile and desktop touch performance.
*   **Pre-recorded Audio Files**: No MP3/WAV static files to avoid network latency, mobile autoplay restrictions, and bundle bloat.
*   **Live Multiplayer Spectating**: Synchronous live drawing or cooperative multiplayer is out of scope.
*   **Ranked Retroactive Scoring**: Solving past calendar editions from the archive operates exclusively in unranked Practice Mode (0 XP, no streak manipulation).

## Open Questions

*   None; mechanics, audio synthesis parameters, and retention feature specifications were confirmed during the brainstorming phase.

--------------------------------------------------------------------------------

## Technical Plan

### 1. Patches Pointer Drag-and-Drop & Board Tile Renderer

```text
User Interaction Lifecycle (Patches):

[Dock Piece] --PointerDown--> [Initiate Drag (Active Shape ID)]
                                      │
                                      ▼
[PointerMove over Grid] ────► [Calculate Bounding Cell Coordinates [r, c]]
                                      │
                                      ├── Is Placement Valid?
                                      │     ├── YES: Render Green/Accent Ghost Preview
                                      │     └── NO:  Render Red Violation Glow
                                      │
[PointerUp] ─────────────────► If Valid: Commit to placedPositions[shapeId] = [r, c]
                                      │
                                      ▼
                    [Target Grid Re-renders Filled Colors]
                    - Target cells occupy shape.color
                    - Dock piece transitions to "Docked / In-Grid" state
                    - Clicking placed piece on board lifts it back to dock
```

*   **State Representation**:
    - `placedPieces: Record<string, [number, number]>` maps `shapeId` to top-left grid root `[r, c]`.
    - Board grid maps each occupied coordinate to `{ shapeId, color }`.
    - Drag state: `{ shapeId, currentPointerPos, snappedGridCoord: [r, c] | null, isValidDrop: boolean }`.
*   **Click-to-Retrieve**: Clicking any cell occupied by a placed shape immediately unassigns it from `placedPieces`, restoring it to the interactive inventory dock.

### 2. Zip Continuous SVG Ribbon Path & Drag Tracer

```text
User Interaction Lifecycle (Zip):

[Checkpoint #1] --PointerDown/Hover--> [Start Path: [[r1, c1]]]
                                               │
                                               ▼
[PointerDrag across Adjacent Cell [r2, c2]] ──► [Distance === 1 Check]
                                               │
                                               ├── Already in path? -> Backtrack to that index
                                               └── Not in path?    -> Append [r2, c2] to path
                                               │
                                               ▼
                         [SVG Ribbon Layer Draws Smooth Path]
                         - <path d="M x1 y1 L x2 y2 ..." stroke="#6366F1" />
                         - Checkpoint badges (1, 2, 3...) remain on top layer
                         - Cells remain clean without sequential number clutter
```

*   **SVG Rendering Geometry**:
    - Given a cell size $S$, cell centers are located at $X = (c + 0.5) \times S$, $Y = (r + 0.5) \times S$.
    - The path renders as a single `<svg>` overlay with `strokeWidth={S * 0.38}`, `strokeLinecap="round"`, and `strokeLinejoin="round"`, creating a fluid modern ribbon line.
*   **Checkpoint Landmarks**:
    - Checkpoints render as high-contrast circular badges with clear numerical labels (1, 2, 3...) fixed above the path layer.
    - Path completion triggers when all checkpoints are sequentially visited in an unbroken line.

### 3. Procedural Audio Synthesizer (`lib/audio/sound-fx.ts`)

*   **Architecture**: Singleton `AudioContext` lazily initialized on first user interaction.
*   **Sound Definitions**:
    - `playTap()`: 440 Hz triangle wave decaying exponentially in 40ms (clean tactile click).
    - `playStep()`: Pentatonic frequency progression (C5 -> D5 -> E5 -> G5 -> A5) tied to path progress in Zip and piece placement in Patches.
    - `playError()`: 160 Hz low sine wave with quick pitch downward bend (subtle soft rejection).
    - `playVictory()`: Arpeggiated C-Major 9th chord (C4, E4, G4, B4, D5) cascading over 600ms.
*   **Mute State**: Persisted in `localStorage.getItem("brain_games_muted")`. Toolbar provides a 1-click speaker icon toggle (`🔊 / 🔇`).

### 4. Viral Spoiler-Free Emoji Share Card (`lib/social/share-generator.ts`)

*   **Format**:
    ```text
    Brain Games — [Game Title] #[IssueNumber]
    ⏱ [Formatted Time]
    [Dynamic Performance Emoji Grid / Progress Bar]
    https://brain-games.vercel.app/games/[slug]
    ```
*   **One-Click Copy**: Injected into `puzzle-shell.tsx` victory modal with live clipboard copy and "Copied to clipboard! 📋" toast feedback.

### 5. Daily Progress Ring & Personal Analytics

*   **Progress Ring (`components/shared/progress-ring.tsx`)**: Circular SVG progress meter showing `X / 8` completed daily editions, embedded into the navbar header and user dashboard.
*   **Analytics Modal (`components/profile/stats-modal.tsx`)**: Queries user's `DailyGameCompletion` and `GameSession` records to display:
    - Total Games Played & Win Percentage.
    - Current Active Streak & Longest Habit Streak.
    - Average Solve Duration per puzzle type.
    - Visual bar distribution of solve times.
*   **Calendar Archive Drawer (`components/games/archive-drawer.tsx`)**: Slide-out calendar permitting selection of past dates and edition numbers to play in Practice Mode (`/games/[slug]?issue=[N]&mode=practice`).

--------------------------------------------------------------------------------

## Alternatives Considered

### 1. External Drag-and-Drop Library (e.g. dnd-kit or react-dnd)

*   **Mechanism**: Install third-party drag-and-drop packages (`@dnd-kit/core`) to handle sensor detection and drop targets.
*   **Trade-off**: Provides pre-packaged touch abstractions.
*   **Reason for Rejection**: *Rejected by author*. Adds ~50KB of unnecessary bundle bloat, complicates coordinate snapping into responsive CSS grid cells, and introduces noticeable event dispatch latency on mobile web browsers. Native HTML5 Pointer Events provide superior 60 FPS hardware-accelerated performance with zero dependencies.

### 2. Static Pre-recorded Audio Files (.mp3 / .wav)

*   **Mechanism**: Load static audio assets from the `/public/sounds/` directory and trigger them using `<audio>` DOM elements.
*   **Trade-off**: Allows pre-rendered acoustic studio sound effects.
*   **Reason for Rejection**: *Rejected by author*. Increases initial network payload, causes audible playback latency on mobile connections, and frequently triggers mobile browser autoplay permission rejections. Web Audio API oscillators are instantaneous, dynamic, zero-latency, and add 0 bytes to network transfers.

### 3. Raw Canvas Rendering for Zip Path

*   **Mechanism**: Draw the continuous ribbon path using an HTML5 `<canvas>` element and 2D canvas drawing contexts.
*   **Trade-off**: Provides low-level pixel manipulation.
*   **Reason for Rejection**: *Rejected by author*. Canvas requires manual handling of device pixel ratio (DPR) to prevent blurriness on Retina displays, lacks responsive SVG vector scaling, and prevents applying native CSS shadow/glow filters. An inline SVG path element scales crisply across all screen resolutions and integrates natively with DOM coordinate trees.

### 4. Direct Social OAuth Auto-Publishing

*   **Mechanism**: Integrate Twitter/X and LinkedIn OAuth APIs to automatically publish scores directly to player profiles.
*   **Trade-off**: Publishes directly without user copy-pasting.
*   **Reason for Rejection**: *Rejected by author*. Requires complex OAuth app management, developer credentials, and introduces high user friction (players routinely decline granting social account write permissions). The Wordle/LinkedIn-style 1-click clipboard copy model achieves maximum viral conversion with zero security resistance.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `lib/audio/sound-fx.ts` (Create)
*   **Type / Scope**: Web Audio API Sound Synthesizer.
*   **Rationale**: Exports singleton sound triggers (`soundFx.tap()`, `soundFx.step()`, `soundFx.error()`, `soundFx.victory()`) using Web Audio oscillators. Manages browser mute state in `localStorage` and auto-resumes audio contexts suspended by mobile autoplay policies upon first user touch.

#### 2. `lib/social/share-generator.ts` (Create)
*   **Type / Scope**: Social Text Generator Utility.
*   **Rationale**: Generates spoiler-free emoji share copy with game title, issue number, elapsed time, and difficulty grid representations. Provides a unified `copyShareText()` helper with clipboard fallback.

#### 3. `components/games/patches/patches-board.tsx` (Modify)
*   **Type / Scope**: Interactive Polyomino Game Component.
*   **Rationale**: Complete overhaul:
    1. Implements native Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`) on inventory shape tiles.
    2. Dynamically renders target board grid cells with full shape background colors when occupied.
    3. Calculates live bounding box intersection during drag to project green/accent ghost previews or red collision warnings.
    4. Enables click-to-retrieve on board cells to return placed shapes back to the dock.

#### 4. `components/games/zip/zip-board.tsx` (Modify)
*   **Type / Scope**: Path Drawing Game Component.
*   **Rationale**: Complete overhaul:
    1. Removes all sequential number-stamping in board cells.
    2. Overlays an inline SVG ribbon path with `strokeLinecap="round"` and `strokeLinejoin="round"` following pointer drag across adjacent cells.
    3. Renders fixed high-contrast checkpoint landmark badges (1, 2, 3...) floating above the ribbon layer.
    4. Implements dynamic path truncation when dragging backward across already-visited squares.

#### 5. `components/games/shared/puzzle-shell.tsx` (Modify)
*   **Type / Scope**: Game Shell Wrapper Component.
*   **Rationale**:
    1. Adds a persistent audio speaker icon toggle (`🔊 / 🔇`) in the live toolbar.
    2. Triggers `soundFx.victory()` upon puzzle solve.
    3. Adds a prominent "Share Result 📋" button in the victory modal that copies the spoiler-free emoji summary to the clipboard with toast feedback.

#### 6. `components/shared/progress-ring.tsx` (Create)
*   **Type / Scope**: Radial Progress Component.
*   **Rationale**: Renders a compact, animated SVG circle displaying `X / 8` completed daily editions. Used in the site navbar and dashboard to visually motivate daily completion.

#### 7. `components/site-header.tsx` (Modify)
*   **Type / Scope**: Navigation Header Component.
*   **Rationale**: Integrates the Daily Progress Ring alongside player XP and navigation links, showing instant daily progress across all pages.

#### 8. `components/profile/stats-modal.tsx` (Create)
*   **Type / Scope**: Analytics Modal Component.
*   **Rationale**: Displays comprehensive player statistics: total editions cleared, current/max streaks, win percentage, and a bar chart of average solve times per game.

#### 9. `components/games/archive-drawer.tsx` (Create)
*   **Type / Scope**: Calendar Edition Selector Drawer.
*   **Rationale**: Allows players to browse past calendar dates, compute corresponding `#IssueNumber` values, and launch previous daily puzzles in Practice Mode.

#### 10. `app/dashboard/page.tsx` (Modify)
*   **Type / Scope**: Next.js Server Component.
*   **Rationale**: Embeds the Progress Ring into the daily overview banner, adds a "View Past Editions (Archive)" button, and provides a trigger for the Personal Analytics Modal.

### Verification Plan

*   **Typecheck**: Run `npm run typecheck` to confirm zero TypeScript compilation errors.
*   **Linter**: Run `npm run lint` to enforce clean Next.js and Tailwind standards.
*   **Manual End-to-End Verification**:
    1. **Patches Test**: Drag a polyomino patch from the dock → Observe ghost snap preview → Drop onto board → Confirm target cells display piece color → Click placed piece on board → Confirm it returns to the dock.
    2. **Zip Test**: Drag finger/mouse from checkpoint 1 → Observe fluid SVG ribbon line connecting cells without number clutter → Drag through checkpoints in sequence → Confirm victory trigger when final checkpoint is connected.
    3. **Audio Test**: Click cells and drag pieces → Confirm audible woodblock clicks and step tones → Click speaker icon to mute → Confirm complete silence → Reload page → Confirm mute state persists.
    4. **Share Test**: Solve any puzzle → Click "Share Result" in victory modal → Paste into text editor → Confirm clean emoji format without spoilers.
    5. **Archive & Progress Ring Test**: Verify navbar shows `X / 8` daily progress ring → Open archive drawer → Select a past date → Confirm game launches in Practice Mode with correct historical `#IssueNumber`.
