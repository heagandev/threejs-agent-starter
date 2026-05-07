# /level-two — Add a Second Level

Read `AGENTS.md` fully before starting. Load `skills/threejs-fundamentals.md`, `skills/threejs-lighting.md`, and `skills/threejs-geometry.md`.

---

## Context

The base Cube Runner game is complete with power-ups and juice. Your job is to add a second level that triggers when the player reaches the end of level one.

---

## Requirements

### Level Transition

- Level one ends when the player reaches `z <= -180` (past the last obstacle)
- Show a brief transition: fade the scene to black over 0.5 seconds, swap level, fade back in
- Fade is a full-screen CSS overlay with opacity transition — no Three.js post-processing needed
- Do not use `GAME_OVER` phase for transition — add a `TRANSITION` phase

### Level Two Differences

Level two must feel distinct from level one. Implement at least **two** of the following changes:

| Change | Description |
|---|---|
| **Narrower platform** | Reduce `ground.width` from 15 to 10 |
| **Higher speed** | Increase base `forwardSpeed` by 4 |
| **New obstacle layout** | Different `OBSTACLE_LAYOUT` — tighter, more complex patterns |
| **Color theme** | Change scene background, ground color, and obstacle color |
| **New lighting** | Change ambient/directional light colors for a different mood |
| **Moving obstacles** | One or more obstacles oscillate left/right on X axis each frame |

### Architecture

- Extract level data into a `LEVELS` array: `Array<{ groundColor, skyColor, obstacleLayout, powerUpLayout, speedMultiplier, ... }>`
- `loadLevel(index: number)` method clears current obstacles/power-ups and rebuilds from level data
- Current level tracked as `private currentLevel = 0`
- Score continues accumulating across levels (does not reset on transition)

### Win State

- If the player completes level two, show a **You Win** screen (new panel, same styling as game over)
- Display final score
- Offer a **Play Again** button that resets to level one

---

## Deliverable

Updated `src/main.ts` and `src/style.css` only. No new files. No new packages.

After completing, suggest the next git commit message and branch name.
