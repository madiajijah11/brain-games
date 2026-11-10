# Tactile Mechanics Overhaul (Patches & Zip) and Retention-Driven UX Suite

* **Author:** MexL
* **Date:** 2026-11-10

## Overview

Brain Games will execute a comprehensive interaction and design upgrade focusing on two core pillars:
1. **Fixing Broken Puzzle Mechanics (Patches & Zip)**:
   - **Patches**: Replace disjointed click-placements with native pointer drag-and-drop. Dragging a polyomino patch from the inventory dock reveals a semi-transparent "ghost preview" over the grid. Releasing snaps the shape into the target board with vibrant fill colors. Clicking any placed patch on the board lifts it back to the dock.
   - **Zip**: Remove clunky sequential number-filling. Checkpoint nodes (1, 2, 3...) remain fixed landmarks, while the player's path is drawn as a smooth, continuous SVG ribbon line by dragging a pointer or finger across adjacent grid cells. Tapping or backtracking smoothly rewinds the ribbon line.
2. **Modern Clean Aesthetic & Viral Retention Suite**:
   - **Tactile Audio Feedback (Web Audio API)**: Zero-dependency, lightweight procedural synthesized sound effects (soft woodblock click on tap/drag, rising pentatonic arpeggio on checkpoint hit, celebratory chord progression on victory) with a global mute toggle.
   - **Spoiler-Free Social Share Card**: One-click clipboard copy of emoji result summaries (e.g. `Brain Games — Patches #314 ⏱ 01:14 🟩🟩🟩`) to drive viral acquisition on WhatsApp, X, and LinkedIn.
   - **8/8 Daily Progress Ring**: Radial visual progress tracker in the navbar and dashboard showing today's cleared editions.
   - **Personal Analytics Modal**: Local and database-backed player statistics (win rate, average completion time, streak history, and completion time distribution graphs).
   - **Calendar Archive Drawer**: Accessible archive enabling players to explore and solve past numbered editions (`#313`, `#312`, etc.) in unranked Practice Mode.

---

## Analysis

### 1. Contrarian / YAGNI Lens
* **Finding**: Introducing external drag-and-drop libraries (e.g. `dnd-kit`, `react-dnd`) and audio assets (.mp3 files) bloats bundle size and introduces mobile touch event listener lag.
* **Resolution**:
  - Implement drag-and-drop using standard HTML5 Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`) with element coordinate collision calculations. Works identically on mobile touch screens and desktop mice with zero extra npm packages.
  - Generate audio purely via the browser's native `AudioContext` (sine/triangle oscillators with quick exponential gain decay). 0 bytes of audio asset network downloads.

### 2. Cost, Quota & Performance Economics Lens
* **Finding**: Rendering continuous path ribbon animations in Zip and dynamic drag previews in Patches could cause repaints and frame drops on lower-end mobile devices.
* **Resolution**: Use SVG path elements with CSS transitions and hardware-accelerated transforms (`transform: translate3d`). Board updates are batched, ensuring stable 60 FPS performance.

### 3. UX & Developer Ergonomics Lens
* **Finding**: In Patches, users often miss the exact cell drop target on small mobile screens.
* **Resolution**: Include a visual "ghost snap preview" that snaps to the nearest valid bounding box while dragging, so users immediately see whether a piece fits before releasing their finger.

### 4. Migration & Backward Compatibility Lens
* **Finding**: Do historical calendar archives and personal statistics require destructive database changes?
* **Resolution**:
  - The existing `GameSession` and `DailyGameCompletion` models already record `timeTakenMs`, `issueNumber`, and `dateKey`.
  - Past editions resolve cleanly using the deterministic formula:
    `issueNumber = Math.max(1, targetDay - EPOCH_DAY)`
  - No database migration or data wipe is needed.

### 5. Observability & SRE Debuggability Lens
* **Finding**: Client drag-and-drop can produce invalid drop coordinates if container sizing shifts during window resizing.
* **Resolution**: Grid coordinates are normalized against relative cell indices (0..width-1, 0..height-1) rather than raw screen pixel positions, preventing coordinate calculation mismatches.

### 6. Long-Term Tech Debt & Maintenance Lens
* **Finding**: Baking audio and share-generation directly into every individual game component creates massive code duplication.
* **Resolution**: Centralize sound generation into `lib/audio/sound-fx.ts` and share generation into `lib/social/share-generator.ts`. `puzzle-shell.tsx` automatically manages the sound trigger and share button for all 8 games.

### 7. Inventive Catalyst (Ideal Final Result)
* **Conflict**: Adding rich haptic sounds and complex drag animations without sacrificing sub-second page load times.
* **Resolution**: Procedural synthesis in under 40 lines of TypeScript code and pure CSS SVG path rendering. Zero third-party runtime dependencies.

---

## Goals vs. Non-Goals

* **In-Scope Goals**:
  * Rebuild `patches-board.tsx` with pointer-drag-and-drop, real-time ghost previews, board tile rendering, and click-to-retrieve.
  * Rebuild `zip-board.tsx` with continuous SVG ribbon path tracing driven by pointer drag, eliminating numerical cell filling.
  * Implement procedural sound effects via Web Audio API (`sound-fx.ts`) with a persistent mute button.
  * Build a spoiler-free emoji share card generator in `puzzle-shell.tsx`.
  * Add an 8/8 daily progress ring indicator to the header and dashboard.
  * Build a Personal Statistics modal showing player metrics and completion charts.
  * Build a Calendar Archive drawer allowing users to browse and play past edition numbers in Practice Mode.

* **Out-of-Scope Non-Goals**:
  * Real-time multiplayer co-op drawing.
  * External MP3/WAV asset pipelines.
  * Native mobile vibration/haptic hardware APIs that require native app permissions.

---

## Alternatives Weighed

* **External Drag-and-Drop Library (e.g. dnd-kit)**:
  * *Reason for rejection*: Adds ~50KB of unnecessary bundle weight and complex coordinate abstraction layers. Pointer Events provide native browser performance with minimal code.
* **Pre-recorded Audio Files (.mp3 / .wav)**:
  * *Reason for rejection*: Increases network payload, suffers from mobile autoplay latency, and risks 404s. Web Audio API oscillators are instantaneous, lightweight, and customizable.

---

## Key Decisions & Staging for Next Steps

1. **Audio & Share Utilities**: Build `lib/audio/sound-fx.ts` and `lib/social/share-generator.ts`.
2. **Rebuild Patches**: Overhaul `components/games/patches/patches-board.tsx` with drag, ghost drop, and visual board tile filling.
3. **Rebuild Zip**: Overhaul `components/games/zip/zip-board.tsx` with SVG ribbon path rendering and smooth drag-to-draw.
4. **Shell & Retention Enhancements**: Update `puzzle-shell.tsx` to include sound toggles and the share modal, and add the 8/8 progress ring to `site-header.tsx`.
5. **Analytics & Calendar Archive**: Create `components/profile/stats-modal.tsx` and `components/games/archive-drawer.tsx`.
