# Agent Rules — Three.js Game Dev Starter Pack

You are helping a developer build a browser game prototype from scratch using this starter pack.
Read this file fully before writing any code.

---

## Stack

- Vite + TypeScript + Three.js (vanilla, no framework)
- All game logic lives in `src/main.ts`
- All styles live in `src/style.css`
- No additional packages unless explicitly requested

---

## Starting Point

`src/main.ts` is a blank slate. Before writing any code, ask (or infer from context):

1. What kind of game is this? (genre, perspective, core mechanic)
2. What is the player doing every second? (the game loop)
3. What ends the game? (win/lose condition)

Name the main class after the game (e.g. `AsteroidsGame`, `PlatformerGame`). Do not use a generic placeholder.

---

## Architecture Rules

1. **Single class pattern** — all game logic belongs inside one top-level game class. Do not create loose functions or module-level state outside the class.
2. **Config object** — all tunable values (speeds, sizes, positions, thresholds) go in `GAME_CONFIG`. No magic numbers inline.
3. **Game phases** — state is always one of `MENU | PLAYING | GAME_OVER`. Every behaviour must respect the current phase.
4. **Typed interfaces** — define TypeScript interfaces for all non-trivial objects (e.g. `Enemy`, `Projectile`, `Pickup`).
5. **Cleanup** — any new event listeners, animation frames, or Three.js objects added must be disposed/removed in `destroy()`.
6. **No new files** — unless explicitly asked, keep all code in `src/main.ts` and `src/style.css`.

---

## Three.js Rules

- Always cap pixel ratio: `Math.min(window.devicePixelRatio, 2)`
- Always cap delta: `delta = Math.min(delta, 0.04)` to prevent physics explosions on tab switch
- Use `THREE.Box3` for AABB collision detection — update bounds each frame with `setFromObject()`
- Use `THREE.MathUtils.damp()` for smooth deceleration, not manual lerp
- Dispose geometries and materials when removing objects from the scene
- Shadow maps are enabled — new meshes that should cast/receive shadows must set those flags explicitly

---

## Code Style

- `const` over `let` wherever possible
- Private class fields with `readonly` where applicable
- Descriptive variable names — no single-letter variables except loop indices
- Group related logic into clearly named private methods

---

## Skills

The `skills/` folder contains reference sheets for Three.js topics. Load the relevant skill before working on that area:

- `threejs-fundamentals.md` — scene, camera, renderer, transforms
- `threejs-lighting.md` — lights, shadows
- `threejs-geometry.md` — shapes, BufferGeometry
- `threejs-interaction.md` — input, raycasting
- `threejs-animation.md` — keyframes, procedural motion, spring physics
- `threejs-materials.md` — materials, PBR
- `threejs-textures.md` — texture loading, mapping
- `threejs-shaders.md` — GLSL, ShaderMaterial
- `threejs-postprocessing.md` — bloom, effects
- `threejs-loaders.md` — GLTF, asset loading
