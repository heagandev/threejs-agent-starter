# Cube Runner — One-Shot Build Prompt

## Starting State
- `three` and `@types/three` are installed.
- `src/main.ts` contains only:
  ```ts
  import * as THREE from 'three'
  import './style.css'
  ```
- `src/style.css` is empty.
- `index.html` has a single `<div id="app"></div>` body.

## Skills Available
Read the following skill files before writing any code, in this order:
1. `.agents/skills/threejs-fundamentals/SKILL.md`
2. `.agents/skills/threejs-lighting/SKILL.md`
3. `.agents/skills/threejs-geometry/SKILL.md`
4. `.agents/skills/threejs-interaction/SKILL.md`

---

## Task

Build a complete **Cube Runner** game in **`src/main.ts`** and **`src/style.css`** only.
Do not create any other files. Do not install any packages.

---

## Game Overview

An auto-runner in the style of the Brackeys Cube Runner tutorial.  
The player is a red cube that moves forward automatically along a long white ground platform.  
The player must dodge grey box obstacles by moving left and right.  
Falling off the edge or hitting an obstacle ends the game.

---

## Architecture

Use a **single `CubeRunnerGame` class** in `main.ts`.  
Instantiate it at the bottom of the file by passing `document.querySelector<HTMLDivElement>('#app')`.  
Expose a `destroy()` method for Vite HMR cleanup (`import.meta.hot.dispose`).

---

## Game Phases

```ts
const GAME_PHASE = { MENU: 'MENU', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER' } as const
type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE]
```

---

## Config (all constants go here — no magic numbers inline)

```ts
const GAME_CONFIG = {
  player: {
    startPosition: new THREE.Vector3(0, 1, 0),
    forwardSpeed: 12,
    sidewaysAcceleration: 48,
    sidewaysMaxSpeed: 10,
    fallThreshold: -0.5,
    gravity: 24,
    damping: 14,
  },
  camera: {
    fov: 75,
    offsetY: 1,
    offsetZ: 5,
  },
  ground: {
    width: 15,
    height: 1,
    depth: 10000,
    positionY: -1,
    positionZ: -4980,
  },
  obstacle: {
    size: new THREE.Vector3(2, 1, 1),
  },
}
```

---

## Obstacle Layout

Hand-placed obstacles as `[x, y, z]` triples. All y values are 0.

```ts
const OBSTACLE_LAYOUT: Array<[number, number, number]> = [
  [0, 0, -50],
  [-6, 0, -70],
  [6, 0, -70],
  [-2, 0, -90],
  [2, 0, -90],
  [-2, 0, -110],
  [0, 0, -110],
  [2, 0, -110],
  [6, 0, -130],
  [4, 0, -135],
  [2, 0, -140],
  [2, 0, -140],
  [0, 0, -145],
  [-1, 0, -150],
  [0, 0, -170],
  [4, 0, -170],
  [-4, 0, -170],
]
```

---

## 3D Scene

### Renderer
- `antialias: true`
- `shadowMap.enabled = true`, type `PCFSoftShadowMap`
- Pixel ratio capped at 2
- Appended to a `<div id="scene-host">` inside the root

### Scene
- Background color `'#cecece'`
- `THREE.Fog('#e9e8e8', 20, 100)`

### Camera
- `PerspectiveCamera` with fov from config
- Initial position `(0, 1, 7)`
- During gameplay, follows the player:
  - position: `(player.x, player.y + offsetY, player.z + offsetZ)`
  - lookAt: `(player.x, player.y + offsetY, player.z)`

### Lights
- `AmbientLight(0xffffff, 0.5)`
- `DirectionalLight(0xffffff, 1)` at `(2, 5, 3)`, casts shadows, shadow map `1024×1024`, shadow camera extents ±10, named `'follow-light'`
- The follow-light tracks the camera each frame:
  - `light.position.z = camera.position.z - 3`
  - `light.target.position.set(camera.x, camera.y - 1, camera.z - 7)` then `updateMatrixWorld()`

### Ground
- `BoxGeometry` from config dimensions
- `MeshStandardMaterial({ color: '#ffffff' })`
- `receiveShadow = true`
- Centered at `(0, positionY, positionZ)`

### Player
- `BoxGeometry(1, 1, 1)`
- `MeshStandardMaterial({ color: '#fb2929', roughness: 0 })`
- `castShadow = true`
- Starts at `GAME_CONFIG.player.startPosition`
- `THREE.Box3` updated each frame for collision

### Obstacles
- All share one `BoxGeometry` and one `MeshStandardMaterial({ color: '#383838' })`
- Each has `castShadow = true`, `receiveShadow = true`
- Each stores `{ mesh, bounds: THREE.Box3 }` in an `obstacles` array

---

## Player Physics (per frame, PLAYING only)

```
direction = (right ? 1 : 0) - (left ? 1 : 0)

if direction !== 0:
  velocity.x += direction * sidewaysAcceleration * delta
  velocity.x = clamp(velocity.x, -maxSpeed, maxSpeed)
else:
  velocity.x = damp(velocity.x, 0, damping, delta)   // THREE.MathUtils.damp

velocity.z = -forwardSpeed   (constant)
velocity.y -= gravity * delta

position += velocity * delta

// Ground support
supportY = groundTop + 0.5
if abs(position.x) <= floorHalfWidth AND position.y < supportY:
  position.y = supportY
  velocity.y = 0
```

`groundTop = positionY + height * 0.5`  
`floorHalfWidth = ground.width * 0.5`

---

## Collision Detection

After updating player position, call `playerBounds.setFromObject(playerMesh)`.  
Loop over all obstacles: if `playerBounds.intersectsBox(obstacle.bounds)` → `endGame()`.

---

## Fall Detection

If `playerMesh.position.y < fallThreshold` → `endGame()`.

---

## Score

`score = Math.abs(Math.floor(playerMesh.position.z))` — updated every PLAYING frame.

---

## Input

Track `{ left: boolean, right: boolean }`.

| Key | Action |
|-----|--------|
| `ArrowLeft` / `KeyA` | left = true/false |
| `ArrowRight` / `KeyD` | right = true/false |
| `Space` / `Enter` on MENU | startGame |
| `Space` / `Enter` on GAME_OVER | resetToMenu then startGame |

---

## HTML UI

Inject this into `#app` from the class constructor:

```html
<div id="game-root">
  <div id="scene-host"></div>

  <div id="hud" class="overlay hidden" aria-live="polite">
    <p id="score">0</p>
  </div>

  <div id="main-menu" class="overlay panel">
    <h1>Cube Runner</h1>
    <p>Use A / D or Left / Right to dodge obstacles.</p>
    <button id="start-btn" type="button">Start Game</button>
  </div>

  <div id="game-over" class="overlay panel hidden">
    <h2>Game Over</h2>
    <p id="final-score">Score: 0</p>
    <button id="restart-btn" type="button">Play Again</button>
  </div>
</div>
```

UI visibility is controlled by toggling the `hidden` class:
- MENU: show `#main-menu`, hide `#hud` and `#game-over`
- PLAYING: show `#hud`, hide both panels
- GAME_OVER: show `#game-over` with `Score: N`, hide others

---

## CSS (`src/style.css`)

### Fonts
Import from Google Fonts: **Space Grotesk** (400, 500, 700) and **IBM Plex Mono** (400, 600).

### CSS Variables
```css
:root {
  --ink: #f7f8fb;
  --ink-soft: #b8bdc7;
  --panel: rgba(8, 10, 18, 0.62);
  --panel-border: rgba(255, 255, 255, 0.2);
  --accent: #65c4ff;
  --accent-press: #419fd8;
  --focus: #f6f8ff;
}
```

### Base
- `* { box-sizing: border-box }`
- `html, body, #app` — `margin: 0; width: 100%; height: 100%`
- `body` — `overflow: hidden`, font `Space Grotesk`, color `var(--ink)`, background `radial-gradient(circle at 50% 10%, #2b313e 0%, #0f1218 50%, #06070b 100%)`
- `#game-root` — `position: relative; width: 100%; height: 100%`
- `#scene-host, #scene-host canvas` — `width: 100%; height: 100%; display: block`
- `.overlay` — `position: absolute; inset: 0; pointer-events: none`

### HUD
- `#hud` — `inset: 1.25rem auto auto 50%; transform: translateX(-50%); width/height: auto`
- `#hud p` — `margin: 0; min-width: 5.5rem; text-align: center; font IBM Plex Mono; font-size: clamp(2.2rem, 8vw, 4rem); font-weight: 600; letter-spacing: 0.06em; color: #111421; text-shadow: 0 3px 0 rgba(255,255,255,0.38)`

### Panel
- `.panel` — `display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem; text-align: center; backdrop-filter: blur(8px); background: linear-gradient(135deg, rgba(10,15,28,0.5), rgba(9,12,18,0.78))`
- `.panel h1, h2` — `margin: 0; font-size: clamp(2rem, 6vw, 3.8rem); text-transform: uppercase; letter-spacing: 0.12em`
- `.panel p` — `margin: 0; color: var(--ink-soft); max-width: min(32rem, 85vw); font-size: clamp(0.9rem, 2.7vw, 1.05rem)`
- `.panel button` — `margin-top: 0.4rem; border: 0; border-radius: 999px; padding: 0.75rem 1.7rem; font IBM Plex Mono; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.92rem; color: #05121d; background: var(--accent); box-shadow: 0 8px 35px rgba(99,189,242,0.35); pointer-events: auto; cursor: pointer; transition: transform 150ms ease, box-shadow 180ms ease, background-color 180ms ease`
- Hover: `translateY(-2px)`, larger shadow
- Active: `translateY(0)`, background `var(--accent-press)`
- Focus-visible: `outline: 2px solid var(--focus); outline-offset: 2px`

### Utility
- `.hidden { display: none }`

### Responsive (`max-width: 640px`)
- `#hud { top: 0.55rem }`
- `.panel { padding: 1.4rem }`

---

## Resize Handling

On `window resize`: update `camera.aspect`, call `camera.updateProjectionMatrix()`, call `renderer.setSize(root.clientWidth, root.clientHeight)`.

---

## Render Loop

Use `requestAnimationFrame`. Cap delta at `0.04`. Each tick:
1. If PLAYING: `updatePlayer(delta)`, `updateScore()`, `checkObstacleCollision()`, check fall
2. Always: `updateCameraFollow()`, `updateFollowLight()`
3. `renderer.render(scene, camera)`

---

## Destroy

Cancel animation frame, remove all event listeners, call `renderer.dispose()`.

---

## Deliverables

Write the complete contents of:
- `src/main.ts`
- `src/style.css`

No other files. No new packages.
