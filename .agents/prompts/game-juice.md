# /game-juice — Add Polish and Game Feel

Read `AGENTS.md` fully before starting. Load `skills/threejs-animation.md` and `skills/threejs-game.md`.

---

## Context

The Asteroids 3D game is running on the `asteroids` branch with ship, bullets, asteroids, waves, lives, and score. The camera is orthographic top-down. All logic lives in `AsteroidsGame` in `src/main.ts`.

Check which juice features are already implemented before adding new ones — some may already exist (screen shake, near-miss flash, score pulse, audio). Only add what is missing.

---

## Requirements

Implement all of the following that are not already present:

### Screen Shake

- On ship hit or rocket detonation, shake the camera for ~0.25–0.4 seconds
- Shake is a random offset applied to camera position each frame, decaying over time via lerp
- Do **not** shake on menu/game-over screens

### Near-Miss Flash

- If the ship passes within `NEAR_MISS_DISTANCE` (config) of an asteroid without colliding, briefly flash the asteroid's emissive color to red then back
- Track per-asteroid flash timers — do not use a single global timer

### Score Milestone Pulse

- Every 1000 points, add a CSS animation class to the score element (scale up + color pulse to gold)
- Remove the class after animation completes, re-add on next milestone
- Track last milestone to avoid repeat triggers

### Wave Banner Entrance

- When a new wave starts, show `WAVE N` in the HUD center with a CSS entrance animation (scale + letter-spacing sweep)
- Text fades out after ~2s
- Class-based animation: add `.wave-in`, remove after transition

### Thruster VFX

- When thrust key is held, show a small cone or particle puff behind the ship
- Cone: `ConeGeometry`, orange/yellow emissive, scaled by thrust amount, attached to ship mesh
- Alternatively: spawn small particle puffs each frame when thrusting

### Explosion Particles

- On asteroid destruction, spawn 8–16 debris particles in random directions
- Particles: small `TetrahedronGeometry`, grey/orange tint, fade out over ~0.6s
- Use the existing `Particle` interface pattern

### Sound Effects (Web Audio, no libraries)

- Gate all audio behind a user-gesture unlock (click/tap/keypress)
- Implement: bullet fire beep, explosion boom (3 sizes), ship hit crunch, wave-start chime
- Use `OscillatorNode` + `GainNode` from `AudioContext` — no files, no libraries

### Mobile Controls

- D-pad: left/right (rotate), up/down (thrust/brake) — 4 buttons bottom-left
- FIRE button: bottom-right, large circular tap target
- Touch events: `touchstart` adds key to `Set`, `touchend` removes it; `touchstart` on FIRE also calls `fireBullet()` directly
- Hide on desktop via `@media (hover: hover) and (pointer: fine)`

---

## Architecture Rules

- All new state (shake timer, flash timers, milestone tracker) must be class fields
- Juice effects must not modify gameplay logic — keep them in separate `update*` methods called after physics
- All effects must reset cleanly when game restarts

---

## Deliverable

Updated `src/main.ts` and `src/style.css` only. No new files. No new packages.

Suggested commit: `feat(asteroids): game juice - shake, near-miss, particles, audio, mobile controls`
