# /cube-runner-mvp — Build Cube Runner MVP

Read `AGENTS.md` fully before starting. Load `skills/threejs-fundamentals.md`, `skills/threejs-geometry.md`, `skills/threejs-lighting.md`, `skills/threejs-materials.md`, `skills/threejs-animation.md`, `skills/threejs-interaction.md`, `skills/threejs-game.md`.

## Context

This is the `cube-runner` branch, built from `new-game`. `src/main.ts` contains a completed endless runner implementation — a player cube dodges obstacles on an infinite track, with keyboard and mobile D-pad controls, score tracking, and a procedural obstacle spawner.

Use this prompt to understand the architecture before extending the game — or as a reference when building your own game from `new-game`.

## Architecture

Single class `CubeRunnerGame` — all game logic inside. No loose functions or module-level state outside the class and config.

Key types:

```ts
const GAME_PHASE = { MENU: 'MENU', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' } as const;
type GamePhase = typeof GAME_PHASE[keyof typeof GAME_PHASE];

interface Obstacle { mesh: THREE.Mesh; bounds: THREE.Box3 }
```

## Game Config

All tunable values live in `GAME_CONFIG` at the top of `src/main.ts`:

```ts
const GAME_CONFIG = {
  player: {
    forwardSpeed: 12,
    sidewaysAcceleration: 48,
    sidewaysMaxSpeed: 10,
    fallThreshold: -0.5,
    gravity: 24,
    damping: 14,
  },
  camera: { fov: 75, offsetY: 1, offsetZ: 5 },
  ground: { width: 15, height: 1, depth: 10000, ... },
  obstacle: { size: new THREE.Vector3(2, 1, 1) },
} as const
```

## Extending This Game

Suggested features to add via agent sessions (each on its own branch):

- **`feat/power-ups`** — speed boost, shield, slow-mo collectibles that drop from overhead
- **`feat/game-juice`** — screen shake on collision, squash-stretch on landing, score milestones with flash
- **`feat/sound`** — Web Audio beeps for jump, near-miss, game over
- **`feat/level-two`** — a second track layout that activates at a score threshold with transition
- **`feat/leaderboard`** — submit score to a simple backend, display top 10 on game over screen

For each, create a branch, describe the feature to your agent referencing the current `src/main.ts`, and commit when `npm run build` passes clean.

## Deliverable (for extensions)

- Modify `src/main.ts` only (and `src/style.css` if needed)
- No new files
- After writing, verify `npm run build` passes with no TypeScript errors
- Suggest a commit message
