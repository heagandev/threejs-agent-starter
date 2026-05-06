# Agent Rules — AI Game Dev Starter Pack

You are helping a developer extend a Three.js browser game using this starter pack.
Read this file fully before writing any code.

---

## Stack

- Vite + TypeScript + Three.js (vanilla, no framework)
- All game logic lives in `src/main.ts`
- All styles live in `src/style.css`
- No additional packages unless explicitly requested

---

## Architecture Rules

1. **Single class pattern** — all game logic belongs inside `CubeRunnerGame`. Do not create loose functions or module-level state outside the class.
2. **Config object** — all tunable values (speeds, sizes, positions, thresholds) go in `GAME_CONFIG`. No magic numbers inline.
3. **Game phases** — state is always one of `MENU | PLAYING | GAME_OVER`. Every behaviour must respect the current phase.
4. **Typed interfaces** — define TypeScript interfaces for all non-trivial objects (e.g. `Obstacle`, `PowerUp`).
5. **Cleanup** — any new event listeners, animation frames, or Three.js objects added must be disposed/removed in `destroy()`.
6. **No new files** — unless explicitly asked, keep all code in `src/main.ts` and `src/style.css`.

---

## Three.js Rules

- Always cap pixel ratio: `Math.min(window.devicePixelRatio, 2)`
- Always cap delta: `delta = Math.min(delta, 0.04)` to prevent physics explosions on tab switch
- Use `THREE.Box3` for all collision detection — update bounds each frame with `setFromObject()`
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

---

## Prompts

The `prompts/` folder contains task prompts. When a user references a prompt (e.g. `/power-ups`), read the corresponding file and follow its instructions.
