# /power-ups — Add a Power-Up System

Read `AGENTS.md` fully before starting. Load `skills/threejs-fundamentals.md` and `skills/threejs-animation.md`.

---

## Context

The base Cube Runner game is running. The player is a red cube dodging obstacles on a white platform. Your job is to add a power-up system.

---

## Requirements

### Power-Up Types

Implement at least two of the following. Ask the developer which they want if not specified:

| Power-Up | Effect |
|---|---|
| **Speed Boost** | Increases `forwardSpeed` for 3 seconds, then returns to normal |
| **Shield** | Player survives one obstacle collision. Visual indicator required. |
| **Slow-Mo** | Halves `forwardSpeed` and `sidewaysAcceleration` for 4 seconds |
| **Wide Lane** | Temporarily widens the player's allowed movement range |

### Architecture

- Add a `PowerUp` interface: `{ mesh: THREE.Mesh, bounds: THREE.Box3, type: PowerUpType, collected: boolean }`
- Add a `PowerUpType` union type for all implemented types
- Add active effect state to the class: `activePowerUp: { type: PowerUpType, expiresAt: number } | null`
- Power-up meshes must be disposed when collected

### Placement

- Hand-place at least 3 power-ups in the level using a `POWERUP_LAYOUT` array (same pattern as `OBSTACLE_LAYOUT`)
- Position them between existing obstacles so they are reachable

### Visual

- Power-ups must be visually distinct from obstacles — different geometry, color, or both
- Active effect must have a visible indicator (e.g. player color change, HUD label, emissive glow)
- Add a simple bob animation (sine wave on Y axis) to uncollected power-ups each frame

### Collection

- Detect collection using `Box3.intersectsBox()` — same pattern as obstacle collision
- On collection: remove mesh from scene, dispose geometry and material, apply effect

### Cleanup

- All new event listeners and objects must be handled in `destroy()`
- Effects must expire cleanly — no state leaks between game resets

---

## Deliverable

Updated `src/main.ts` and `src/style.css` only. No new files. No new packages.

After completing, suggest the next git commit message and branch name.
