# /asteroids-mvp — Build Asteroids 3D MVP

Read `AGENTS.md` fully before starting. Load `skills/threejs-fundamentals.md`, `skills/threejs-geometry.md`, `skills/threejs-lighting.md`, `skills/threejs-materials.md`, `skills/threejs-animation.md`, `skills/threejs-interaction.md`.

## Context

This is the `new-game` blank-canvas branch. `src/main.ts` currently contains the Vite welcome screen boilerplate. `src/style.css` has default Vite styles. Both must be completely replaced.

## Goal

Build a 3D Asteroids MVP. Classic mechanics (ship, rotating asteroids, bullets, lives, score, waves) rendered in 3D with a fixed top-down perspective camera.

## Game Config

All tunable values live in a top-level `GAME_CONFIG` const:

```ts
const GAME_CONFIG = {
  SHIP_ROTATION_SPEED: 2.5,
  SHIP_THRUST: 8,
  SHIP_MAX_SPEED: 12,
  SHIP_DAMPING: 0.98,
  BULLET_SPEED: 20,
  BULLET_LIFETIME: 1.8,
  MAX_BULLETS: 4,
  ASTEROID_INITIAL_COUNT: 4,
  ASTEROID_SPEED_LARGE: 1.5,
  ASTEROID_SPEED_MEDIUM: 2.5,
  ASTEROID_SPEED_SMALL: 4.0,
  INVINCIBILITY_DURATION: 2.0,
  WORLD_HALF_SIZE: 15,
}
```

## Architecture

Single class `AsteroidsGame` — all game logic inside. No loose functions or module-level state outside the class and config.

```ts
enum GamePhase { MENU = 'MENU', PLAYING = 'PLAYING', GAME_OVER = 'GAME_OVER' }

interface PlayerShip {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotation: number       // yaw in radians
  invincible: boolean
  invincibleTimer: number
}

interface Bullet {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  lifetime: number
}

interface Asteroid {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotationAxis: THREE.Vector3
  rotationSpeed: number
  size: 'large' | 'medium' | 'small'
}
```

## Requirements

### Scene Setup
- Black background (`scene.background = new THREE.Color(0x000000)`)
- Perspective camera at position `(0, 30, 0)`, looking at origin, slight tilt: `camera.lookAt(0, 0, 0)`; set `camera.position.set(0, 28, 6)` for a slight top-down angle
- Ambient light (intensity 0.4) + directional light from above-left (intensity 1.0, casts shadows)
- Renderer fills `#app` div, pixel ratio capped at `Math.min(window.devicePixelRatio, 2)`
- Starfield: 300 points at random positions within a 60×60×5 box, white `PointsMaterial` size 0.08
- Resize listener that updates camera aspect + renderer size

### Ship
- `IcosahedronGeometry(0.6, 0)` — pointy/rocky feel, scale Y to 0.3 to flatten it
- `MeshStandardMaterial` emissive cyan-blue (`0x00aaff`), roughness 0.3
- Starts at origin facing `+Z`
- Controls (keyboard):
  - `A` / `ArrowLeft` — rotate ship left (decrease yaw)
  - `D` / `ArrowRight` — rotate ship right (increase yaw)
  - `W` / `ArrowUp` — thrust forward (add velocity in facing direction)
  - `S` / `ArrowDown` — brake (dampen velocity faster: `velocity.multiplyScalar(0.92)`)
  - `Space` — fire bullet
- Ship mesh rotates on Y axis to match yaw
- Ship velocity decays by `SHIP_DAMPING` each frame, clamped to `SHIP_MAX_SPEED`
- Screen wrap: if `|x| > WORLD_HALF_SIZE` or `|z| > WORLD_HALF_SIZE`, teleport to opposite edge
- When invincible: flash mesh visible/invisible every 0.1s

### Bullets
- `SphereGeometry(0.12, 6, 6)`
- `MeshStandardMaterial` emissive yellow (`0xffff00`), emissiveIntensity 2
- Fire from ship nose position in the ship's facing direction
- Max `MAX_BULLETS` alive at once — if at limit, oldest bullet is removed before firing new one
- Each frame: advance by velocity × delta, decrement lifetime by delta
- Remove + dispose when lifetime ≤ 0
- Screen wrap same as ship

### Asteroids
- `DodecahedronGeometry` — size: large=2.4, medium=1.4, small=0.7
- `MeshStandardMaterial` color `0x888888`, roughness 0.9, metalness 0.1
- Random velocity direction (XZ plane only), speed from config by size
- Random rotation axis (normalised Vector3) and rotation speed (0.5–2.0 rad/s)
- Asteroids rotate on their axis each frame (`mesh.rotateOnAxis(axis, speed * delta)`)
- Screen wrap same as ship
- On bullet hit:
  - Large → destroy + spawn 2 medium at same position with random velocities
  - Medium → destroy + spawn 2 small at same position
  - Small → destroy, no children
  - Dispose geometry + material of destroyed asteroid
  - Add score: large=20, medium=50, small=100
- On ship collision (Box3 overlap, not invincible):
  - Lives -= 1, start invincibility timer
  - If lives = 0, transition to GAME_OVER

### Waves
- Wave 1: spawn `ASTEROID_INITIAL_COUNT` (4) large asteroids at random edges (|x| or |z| = WORLD_HALF_SIZE), velocity pointing inward
- When all asteroids destroyed: wave++, spawn `ASTEROID_INITIAL_COUNT + (wave - 1) * 2` large asteroids
- Brief "WAVE N" text in HUD fades after 2s

### HUD (HTML overlay, not Three.js canvas)
Use a CSS overlay `div#hud` absolutely positioned over the canvas:
- Top-left: `<span id="score">SCORE: 0</span>`
- Top-right: `<span id="lives">❤️❤️❤️</span>` (update with ♡ for lost lives)
- Top-center: `<span id="wave"></span>` — show "WAVE N" briefly, then hide

### Screens (HTML overlay)
- MENU: full-screen overlay with "ASTEROIDS 3D" title + "PRESS ENTER TO PLAY"
- GAME OVER: full-screen overlay with "GAME OVER", final score, "PRESS ENTER TO RESTART"
- Hide/show these overlays by toggling CSS class `hidden` (display: none)

### Controls (keyboard events)
- Track `keys: Set<string>` for held keys — `keydown` adds, `keyup` removes
- `Enter` in MENU → start game (reset state, spawn wave 1)
- `Enter` in GAME_OVER → restart
- Fire bullet on `Space` keydown (not held — track last-fired debounce of 0.25s)

### Collision Detection
- Use `THREE.Box3` updated each frame with `setFromObject(mesh)`
- Bullet vs asteroid: check each bullet against each asteroid
- Ship vs asteroid: check ship against each asteroid (only if not invincible)

### Cleanup
- `destroy()` method removes all event listeners, cancels animation frame, disposes all geometries and materials

## Style (src/style.css)

- `*` reset: margin 0, padding 0, box-sizing border-box
- `body, html` fill viewport, overflow hidden, background black
- `#app` position relative, width 100vw, height 100vh
- Canvas fills `#app` (position absolute, top 0, left 0)
- `#hud` position absolute, top 0, left 0, width 100%, padding 1rem, display flex, justify-content space-between, color white, font-family monospace, font-size 1.1rem, pointer-events none, z-index 10
- `.screen-overlay` position absolute, inset 0, display flex, flex-direction column, align-items center, justify-content center, color white, font-family monospace, text-align center, z-index 20, background rgba(0,0,0,0.7)
- `.screen-overlay h1` font-size 3rem, letter-spacing 0.3em, margin-bottom 1rem
- `.screen-overlay p` font-size 1rem, opacity 0.7
- `.hidden` display none !important

## Deliverable

- Replace `src/main.ts` entirely with the AsteroidsGame implementation
- Replace `src/style.css` entirely with the new styles above
- After writing, verify `npm run build` passes with no TypeScript errors
- Suggest commit message: `feat: asteroids 3D MVP - ship, bullets, asteroids, waves, lives, score`
