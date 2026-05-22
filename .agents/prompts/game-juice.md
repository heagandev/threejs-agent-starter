# /game-juice — Add Polish and Game Feel

Read `AGENTS.md` fully before starting. Load `skills/threejs-animation.md` and `skills/threejs-postprocessing.md`.

---

## Context

The base Cube Runner game is running with power-ups. Your job is to add juice — the small details that make a game feel alive and satisfying.

---

## Requirements

Implement all of the following:

### Screen Shake

- On game over (obstacle hit or fall), shake the camera for ~0.4 seconds
- Shake is random offset applied to camera position each frame, decaying over time
- Do not shake on menu or respawn

### Player Squash & Stretch

- When the player lands on the ground (velocity.y goes from negative to 0), briefly squash on Y and stretch on X/Z
- Use a spring or lerp to return to `scale(1, 1, 1)` within ~0.2 seconds

### Obstacle Flash on Near Miss

- If the player passes within 1.5 units of an obstacle without colliding, briefly flash the obstacle's emissive color to red and back

### Speed Lines (HUD)

- At `forwardSpeed` above 18, show a subtle CSS vignette or radial gradient overlay in the HUD that intensifies with speed
- Implemented in CSS, toggled via a class on `#game-root`

### Score Milestone

- Every 100 points, flash the score display (brief scale up + color pulse) using a CSS animation class
- Add and remove the class programmatically from the score element

### Sound (optional — skip if no Web Audio context)

- If the developer wants audio, use the Web Audio API only (no libraries)
- Implement: jump whoosh, collect power-up chime, game over thud
- Gate behind a user-gesture unlock

---

## Architecture Rules

- All shake/squash state must be class fields, not module-level variables
- Juice effects must not interfere with gameplay logic — keep them in separate update methods called after physics
- All effects must reset cleanly on `resetToMenu()`

---

## Deliverable

Updated `src/main.ts` and `src/style.css` only. No new files. No new packages.

After completing, suggest the next git commit message and branch name.
