---
name: threejs-game
description: >
  Build browser games with Vite + TypeScript + Three.js — game loop, input,
  collision, HUD, audio, and game-feel patterns. Use when building or extending
  a game in this kit.
---

# Three.js Browser Game Patterns

Use alongside `AGENTS.md`. Covers game-specific concerns not in the other skill files.

---

## Architecture

All game logic lives in a single class in `src/main.ts`. No new files.

```ts
class MyGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private keys = new Set<string>();

  constructor(private container: HTMLElement) {
    // init scene, camera, renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement); // canvas first
    this.bindInput();
    this.animate();
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.04); // cap delta
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

new MyGame(document.getElementById('app')!);
```

**Key rules:**
- All tunable values go in a top-level `GAME_CONFIG` const — no magic numbers
- Use `const` object + type alias for state enums — no TS `enum` (`erasableSyntaxOnly` forbids it):
  ```ts
  const GamePhase = { MENU: 'MENU', PLAYING: 'PLAYING', DEAD: 'DEAD' } as const;
  type GamePhase = typeof GamePhase[keyof typeof GamePhase];
  ```
- Cap pixel ratio: `Math.min(window.devicePixelRatio, 2)`
- Cap delta: `Math.min(delta, 0.04)` — prevents physics tunnelling on tab-unfocus
- Dispose geometries and materials when removing objects from the scene

---

## Input Handling

### Keyboard

```ts
private bindInput() {
  window.addEventListener('keydown', (e) => this.keys.add(e.code));
  window.addEventListener('keyup',   (e) => this.keys.delete(e.code));
}

// In update():
if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) { /* move left */ }
```

### Mobile touch controls

Show D-pad by default, hide on mouse/trackpad devices. More reliable than touch-detect:

```css
#mobile-controls { display: flex; /* positioning */ }

@media (hover: hover) and (pointer: fine) {
  #mobile-controls { display: none; }
}
```

Wire D-pad buttons to the same `keys` set — zero duplication with keyboard logic:

```ts
document.querySelectorAll<HTMLElement>('.ctrl-btn').forEach((btn) => {
  const key = btn.dataset.key!;
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys.add(key); }, { passive: false });
  btn.addEventListener('touchend',    () => this.keys.delete(key));
  btn.addEventListener('touchcancel', () => this.keys.delete(key)); // prevent stuck keys
});
```

In `index.html` — prevent pinch-to-zoom:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

In CSS — prevent scroll stealing:
```css
canvas { touch-action: none; }
```

---

## Collision Detection

Use `THREE.Box3` — no physics engine needed for most 2D-style games.

```ts
interface GameObject {
  mesh: THREE.Mesh;
  box: THREE.Box3;
}

// Update bounding box each frame before testing:
obj.box.setFromObject(obj.mesh);

// Test:
if (playerBox.intersectsBox(enemy.box)) { /* hit */ }
```

### Face detection (which side was hit)

Compare overlap on each axis to decide whether to flip vx or vy:

```ts
const dxOverlap = Math.min(ball.box.max.x - block.box.min.x, block.box.max.x - ball.box.min.x);
const dyOverlap = Math.min(ball.box.max.y - block.box.min.y, block.box.max.y - ball.box.min.y);
if (dxOverlap < dyOverlap) {
  ball.velocity.x = -ball.velocity.x; // hit left/right face
} else {
  ball.velocity.y = -ball.velocity.y; // hit top/bottom face
}
```

Only process ONE block hit per ball per frame — prevents double-flip:

```ts
let hitThisFrame = false;
for (let i = this.blocks.length - 1; i >= 0; i--) {
  if (hitThisFrame) break;
  if (!ball.box.intersectsBox(this.blocks[i].box)) continue;
  hitThisFrame = true;
  // reflect + damage
}
```

### Arrays — iterate in reverse when splicing mid-loop

```ts
for (let i = this.enemies.length - 1; i >= 0; i--) {
  if (shouldRemove(this.enemies[i])) {
    this.scene.remove(this.enemies[i].mesh);
    this.enemies[i].mesh.geometry.dispose();
    (this.enemies[i].mesh.material as THREE.MeshStandardMaterial).dispose();
    this.enemies.splice(i, 1);
  }
}
```

---

## HUD

Inject HTML **after** appending the canvas. Use `insertAdjacentHTML` — never `innerHTML +=` (it destroys the canvas on mobile):

```ts
// Setup (once):
this.container.insertAdjacentHTML('beforeend',
  '<div id="hud"><span id="score">Score: 0</span></div>'
);
this.scoreEl = document.getElementById('score')!;

// Per frame:
this.scoreEl.textContent = `Score: ${this.score}`;
```

> **Why:** `innerHTML +=` serialises the entire DOM subtree, clears it, then re-parses — destroying the `<canvas>` the WebGL renderer is attached to. Mobile browsers lose the WebGL context silently.

---

## Mouse / Touch → World X (no raycasting)

For a camera at `z=20` looking at origin:

```ts
private clientXToWorldX(clientX: number): number {
  const rect = this.renderer.domElement.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const halfFovY = (this.camera.fov / 2) * (Math.PI / 180);
  const halfW = Math.tan(halfFovY) * this.camera.position.z * this.camera.aspect;
  return ndcX * halfW;
}
```

---

## Web Audio (lazy init)

Create `AudioContext` on first user interaction — browsers block autoplay:

```ts
private audioCtx: AudioContext | null = null;

private getAudio() {
  if (!this.audioCtx) this.audioCtx = new AudioContext();
  return this.audioCtx;
}

private playBeep(freq: number, duration: number, vol = 0.3) {
  const ctx = this.getAudio();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(); osc.stop(ctx.currentTime + duration);
}
```

Suggested frequencies: wall bounce 440 Hz · block hit 300 Hz · power-up 880 Hz · death 150 Hz.

---

## Game Feel

### Screen shake

```ts
private shakeTimer = 0;
private readonly SHAKE_DURATION  = 0.3;
private readonly SHAKE_INTENSITY = 0.3;

// Trigger:
this.shakeTimer = this.SHAKE_DURATION;

// In update():
if (this.shakeTimer > 0) {
  this.shakeTimer -= delta;
  const t = this.shakeTimer / this.SHAKE_DURATION;
  this.camera.position.x = (Math.random() - 0.5) * this.SHAKE_INTENSITY * t;
  this.camera.position.y = (Math.random() - 0.5) * this.SHAKE_INTENSITY * t;
} else {
  this.camera.position.x = 0;
  this.camera.position.y = 0;
}
```

### Squash & stretch

```ts
// On bounce:
mesh.scale.set(1.3, 0.7, 1); // squash toward hit axis

// In update() — lerp back to 1:
mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.pow(0.001, delta));
```

---

## Pitfalls

- **`innerHTML +=` destroys canvas on mobile** — always use `insertAdjacentHTML('beforeend', ...)`.
- **`erasableSyntaxOnly` rejects `enum`** — use const-object pattern (see Architecture above).
- **Dispose after `scene.remove()`**, not before — if the mesh is still animating, disposing the geometry frees the GPU buffer while it's in use.
- **Helper functions must be private class methods** — `AGENTS.md` forbids module-level functions outside the class.
- **Store game objects as arrays from the start** (e.g. `balls: Ball[]`) even with one item — makes multi-ball / wave spawning trivial later.
