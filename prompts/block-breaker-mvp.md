# /block-breaker-mvp — Build Block Breaker MVP

Read `AGENTS.md` fully before starting. Load `skills/threejs-fundamentals.md`, `skills/threejs-geometry.md`, `skills/threejs-lighting.md`, `skills/threejs-materials.md`, `skills/threejs-animation.md`, `skills/threejs-interaction.md`, `skills/threejs-game.md`.

## Context

This is the `block-breaker-game` branch, built from `new-game`. `src/main.ts` contains a completed block breaker implementation with paddle, ball physics, block grid, HP system, power-ups (wide paddle, multi-ball, fast/slow ball), multiple levels, and a HUD.

Use this prompt to understand the architecture before extending the game — or as a reference when building your own game from `new-game`.

## Architecture

Single class `BlockBreakerGame` — all game logic inside. No loose functions or module-level state outside the class and config.

Key types:

```ts
const GamePhase = { MENU: 'MENU', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER', LEVEL_CLEAR: 'LEVEL_CLEAR' } as const;
type GamePhase = typeof GamePhase[keyof typeof GamePhase];

const PowerUpType = { WIDE_PADDLE: 'WIDE_PADDLE', MULTI_BALL: 'MULTI_BALL', FAST_BALL: 'FAST_BALL', SLOW_BALL: 'SLOW_BALL' } as const;
type PowerUpType = typeof PowerUpType[keyof typeof PowerUpType];

interface Block      { mesh: THREE.Mesh; box: THREE.Box3; hp: number; row: number; col: number }
interface Ball       { mesh: THREE.Mesh; box: THREE.Box3; velocity: THREE.Vector3; launched: boolean }
interface Paddle     { mesh: THREE.Mesh; box: THREE.Box3 }
interface PowerUp    { mesh: THREE.Mesh; box: THREE.Box3; type: PowerUpType }
interface DyingBlock { mesh: THREE.Mesh; timer: number }
```

## Game Config

All tunable values live in `GAME_CONFIG` at the top of `src/main.ts`. Refer to it before hardcoding any value.

## Extending This Game

Suggested features to add via agent sessions (each on its own branch):

- **`feat/game-juice`** — screen shake on block break, squash-stretch on ball bounce, near-miss flash on close call
- **`feat/sound`** — Web Audio beeps for bounce, block hit, power-up collect, ball lost
- **`feat/more-levels`** — additional block grid layouts, increasing difficulty per level
- **`feat/boss-block`** — a single high-HP block that moves horizontally, drops guaranteed power-up on death
- **`feat/mobile-controls`** — touch drag for paddle, D-pad fallback

For each, create a branch, describe the feature to your agent referencing the current `src/main.ts`, and commit when `npm run build` passes clean.

## Deliverable (for extensions)

- Modify `src/main.ts` only (and `src/style.css` if needed)
- No new files
- After writing, verify `npm run build` passes with no TypeScript errors
- Suggest a commit message
