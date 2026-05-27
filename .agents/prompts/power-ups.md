# /power-ups — Add the Rocket Launcher Power-Up

Read `AGENTS.md` fully before starting. Load `skills/threejs-game.md`, `skills/threejs-geometry.md`, and `skills/threejs-animation.md`.

---

## Context

The Asteroids 3D game is running on the `asteroids` branch. The player flies a ship, fires bullets, destroys asteroids in waves, and has 3 lives. The camera is orthographic top-down. All logic lives in `AsteroidsGame` in `src/main.ts`.

The current interfaces are:
```ts
interface PlayerShip { mesh, velocity, rotation, invincible, invincibleTimer, thrusterLight, thrusterMesh }
interface Bullet      { mesh, velocity, lifetime }
interface Asteroid    { mesh, velocity, rotationAxis, rotationSpeed, size: 'large'|'medium'|'small' }
interface Particle    { mesh, velocity, lifetime, maxLifetime }
```

Key methods to know before touching anything:
- `fireBullet()` — fires a bullet in ship facing direction
- `checkCollisions()` — bullet-vs-asteroid + ship-vs-asteroid detection
- `removeAsteroid(a)` — disposes and removes one asteroid, calls `spawnExplosionParticles()`
- `spawnExplosionParticles(pos, size)` — spawns debris particles
- `updateParticles(delta)` — advances + fades all particles
- `triggerShake(duration, intensity)` — camera shake
- `playExplosion(size)` — Web Audio boom by size
- `onKeyDown(e)` — keyboard handler; `Space` fires bullet, `Enter` restarts

---

## Goal

Add a **Rocket Launcher** power-up. Rockets are fired with **Shift** (or the 🚀 mobile button), deal AoE blast damage to all asteroids within a radius, and can **self-damage the ship** (lose 2 hearts) if it is inside the self-damage radius at detonation. Start with 0 rockets; they drop from destroyed medium/large asteroids.

---

## New GAME_CONFIG keys to add

```ts
ROCKET_SPEED: 14,
ROCKET_LIFETIME: 2.0,
ROCKET_BLAST_RADIUS: 3.5,
ROCKET_SELF_DAMAGE_RADIUS: 2.2,    // inner zone — triggers self-hit
ROCKET_SELF_DAMAGE_HEARTS: 2,
ROCKET_AMMO_PER_PICKUP: 3,
ROCKET_COOLDOWN: 0.6,
ROCKET_TRAIL_RATE: 0.04,           // seconds between trail puffs
ROCKET_SHAKE_DURATION: 0.4,
ROCKET_SHAKE_INTENSITY: 1.0,
POWERUP_DROP_CHANCE: 0.15,         // 15% per medium/large asteroid killed
POWERUP_LIFETIME: 12.0,            // seconds before it despawns
POWERUP_MAGNET_RADIUS: 4.0,
POWERUP_MAGNET_SPEED: 8.0,
POWERUP_PICKUP_RADIUS: 1.0,
```

---

## New interfaces

```ts
interface Rocket {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  light: THREE.PointLight
  lifetime: number
  trailTimer: number
}

interface PowerUp {
  kind: PowerUpKind
  mesh: THREE.Mesh
  light: THREE.PointLight
  lifetime: number
  spinAxis: THREE.Vector3
}
```

Add `kind` to Particle:
```ts
interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  lifetime: number
  maxLifetime: number
  kind?: 'debris' | 'smoke' | 'shockwave' | 'spark'
}
```

Use a const-object (not enum):
```ts
const PowerUpKind = { ROCKET: 'ROCKET' } as const
type PowerUpKind = typeof PowerUpKind[keyof typeof PowerUpKind]
```

---

## New state fields to add to AsteroidsGame

```ts
private rockets: Rocket[] = []
private powerUps: PowerUp[] = []
private rocketAmmo = 0
private lastRocketFireTime = -999
private readonly rocketCooldown = GAME_CONFIG.ROCKET_COOLDOWN
private pickupPopupTimer = 0
// DOM elements:
private readonly rocketEl: HTMLElement
private readonly pickupPopupEl: HTMLElement
```

---

## HUD changes

Inside the existing `insertAdjacentHTML` HUD block:

1. Wrap lives in `<div id="hud-right">`:
```html
<div id="hud-right">
  <span id="rocket-hud" class="hud-empty">🚀 x 0</span>
  <span id="lives">❤️❤️❤️</span>
</div>
```

2. Add pickup popup **outside** `#hud`, as a sibling:
```html
<div id="pickup-popup" class="hidden"></div>
```

3. Add rocket mobile button **inside** `#mobile-controls`, after `ctrl-fire`:
```html
<div id="ctrl-rocket" class="ctrl-btn ctrl-rocket" data-key="ShiftLeft">🚀</div>
```

In the touch handler, extend the existing `if (key === 'Space' ...)` block:
```ts
if (key === 'ShiftLeft' && this.phase === GamePhase.PLAYING) this.fireRocket()
```

---

## Keyboard handler

In `onKeyDown`, add after the Space branch:
```ts
if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && this.phase === GamePhase.PLAYING) {
  this.fireRocket()
}
```

---

## updateHUD changes

After updating lives, add:
```ts
this.rocketEl.textContent = `🚀 x ${this.rocketAmmo}`
this.rocketEl.classList.toggle('hud-empty', this.rocketAmmo <= 0)
this.rocketEl.classList.toggle('hud-armed', this.rocketAmmo > 0)
```

---

## clearGameObjects / startGame reset

Clear rockets and powerUps arrays (dispose + scene.remove each), reset `rocketAmmo = 0`.

---

## animate() loop additions

Call these in order inside the `PLAYING` block, after `updateBullets`:
```ts
this.updateRockets(delta)
this.updatePowerUps(delta)
// ... then existing updateAsteroids, checkCollisions ...
this.checkRocketCollisions()
this.checkPowerUpPickup()
```

Also add popup timer tick:
```ts
if (this.pickupPopupTimer > 0) {
  this.pickupPopupTimer -= delta
  if (this.pickupPopupTimer <= 0) this.pickupPopupEl.classList.add('hidden')
}
```

---

## Methods to implement

### handleShipHit(damage: number): boolean
Extract from the existing ship-vs-asteroid collision block. Applies `damage` hearts, triggers invincibility, shake, and audio. Returns `true` if game over.

### fireRocket()
- Guard: `rocketAmmo <= 0` or cooldown not elapsed → return
- Create `CylinderGeometry(0.12, 0.18, 0.55, 8)` mesh, `MeshStandardMaterial` orange emissive
- Orient cylinder along ship facing (setFromUnitVectors Y→facing)
- Attach `PointLight(0xff7733, 3.5, 5)` to mesh
- Add to `rockets[]`, decrement `rocketAmmo`, call `playRocketLaunch()`

### updateRockets(delta)
- Advance position, screen-wrap
- Decrement lifetime; if ≤ 0 → `spawnSmoke(pos, 0.4)` + `removeRocket(r)`
- Tick `trailTimer`; when ≥ `ROCKET_TRAIL_RATE` → `spawnTrailPuff(pos, velocity)`

### removeRocket(r)
Dispose geometry + material, `scene.remove`, splice from array.

### checkRocketCollisions()
Box3 intersect each rocket vs each asteroid. Call `detonateRocket(r)` on hit (guard against double-detonation).

### detonateRocket(rocket)
1. `spawnShockwave(epicenter)` — expanding `RingGeometry` particle
2. `spawnExplosionSparks(epicenter, 24)` — 24 bright tetrahedron shards
3. `spawnSmoke(epicenter, 1.4)` — 10 dark smoke spheres
4. `playRocketBoom()` — Web Audio low boom + crack layer
5. `triggerShake(ROCKET_SHAKE_DURATION, ROCKET_SHAKE_INTENSITY)`
6. AoE loop: for each asteroid within `ROCKET_BLAST_RADIUS`, score with chain bonus (1 + 0.25 × chainIndex), split children, call `removeAsteroid()` and `maybeDropPowerUp()`
7. Self-damage: if ship within `ROCKET_SELF_DAMAGE_RADIUS` and not invincible → `handleShipHit(ROCKET_SELF_DAMAGE_HEARTS)`
8. `removeRocket(rocket)`, `updateHUD()`

### Particle VFX helpers

**spawnTrailPuff(pos, vel)**
- `SphereGeometry(0.16, 6, 6)`, `MeshBasicMaterial` orange, transparent
- velocity: backward drift + slight random spread
- lifetime 0.45, kind `'smoke'`

**spawnSmoke(pos, scale)**
- 10 spheres, dark `0x554433`, random outward velocities
- lifetime 0.7–1.0, kind `'smoke'`

**spawnExplosionSparks(pos, count)**
- `TetrahedronGeometry(0.16, 0)`, `MeshStandardMaterial` yellow emissive, transparent
- Evenly distributed angles + speed 6–12, lifetime 0.6, kind `'spark'`

**spawnShockwave(pos)**
- `RingGeometry(0.3, 0.5, 32)`, `MeshBasicMaterial` orange, `DoubleSide`, transparent
- `rotation.x = -Math.PI / 2` (flat in XZ plane)
- lifetime 0.45, kind `'shockwave'`

### updateParticles (modify existing)
The existing loop sets opacity via `MeshStandardMaterial`. Extend it:
```ts
const pmat = p.mesh.material as THREE.Material & { opacity?: number }
if ('opacity' in pmat) pmat.opacity = t

if (p.kind === 'shockwave') {
  p.mesh.scale.setScalar((1 - t) * GAME_CONFIG.ROCKET_BLAST_RADIUS * 1.1 + 0.1)
} else if (p.kind === 'smoke') {
  p.mesh.scale.setScalar(1 + (1 - t) * 1.2)
} else {
  p.mesh.scale.setScalar(t * 0.85 + 0.15)
}
```

### Power-up methods

**maybeDropPowerUp(asteroid)**
- Skip `'small'` asteroids
- `Math.random() > POWERUP_DROP_CHANCE` → return
- Call `spawnPowerUp(PowerUpKind.ROCKET, pos)`

**spawnPowerUp(kind, pos)**
- `OctahedronGeometry(0.45, 0)`, `MeshStandardMaterial` orange emissive
- Attach `PointLight(0xff7733, 2, 4)`
- Push to `powerUps[]`

**updatePowerUps(delta)**
- Spin on random axis, decrement lifetime
- Blink visible/invisible when `lifetime < 3.0` using `Math.sin(lifetime * 16) > 0`
- Magnetism: when ship within `POWERUP_MAGNET_RADIUS`, pull pickup toward ship
- Expire when `lifetime ≤ 0`

**checkPowerUpPickup()**
- Distance check (squared) vs ship position using `POWERUP_PICKUP_RADIUS`
- On collect: `applyPowerUp(kind)`, `removePowerUp(pu)`

**applyPowerUp(kind)**
- `ROCKET`: `rocketAmmo += ROCKET_AMMO_PER_PICKUP`, `showPickupPopup('🚀 ROCKETS +3')`, `playPickup()`

**showPickupPopup(text)**
- Set `textContent`, remove `.hidden`, remove `.pickup-in`, force reflow, add `.pickup-in`
- Set `pickupPopupTimer = 1.6`

### Audio methods (Web Audio, no libraries)

**playRocketLaunch()** — sawtooth osc, sweep 140 Hz → 700 Hz over 0.25s, gain 0.25

**playRocketBoom()** — two layers:
  - Triangle osc 80 → 20 Hz over 0.8s, gain 0.55 (boom)
  - Square osc 380 → 60 Hz over 0.18s, gain 0.3 (crack)

**playPickup()** — sine osc 600 → 1300 Hz over 0.18s, gain 0.2

---

## CSS additions (src/style.css)

```css
#hud-right { display: flex; gap: 1rem; align-items: center; }

#rocket-hud { font-weight: bold; letter-spacing: 0.05em; transition: color 0.2s, text-shadow 0.2s; }
#rocket-hud.hud-empty { color: rgba(255,255,255,0.35); }
#rocket-hud.hud-armed { color: #ff9944; text-shadow: 0 0 8px rgba(255,120,40,0.85), 0 0 16px rgba(255,90,20,0.45); }

/* Mobile rocket button — above FIRE */
#ctrl-rocket { bottom: 108px; right: 12px; width: 64px; height: 64px; font-size: 1.4rem; border-radius: 50%; color: #ff9944; border-color: rgba(255,120,40,0.55); background: rgba(255,90,20,0.08); }
#ctrl-rocket:active { background: rgba(255,120,40,0.28); }
@media (max-height: 640px) { #ctrl-rocket { bottom: 92px; right: 10px; width: 54px; height: 54px; font-size: 1.2rem; } }

/* Pickup popup */
#pickup-popup { position: absolute; top: 18%; left: 50%; transform: translate(-50%,0); color: #ffcc66; font-family: monospace; font-size: clamp(1rem, 4vw, 1.6rem); font-weight: bold; letter-spacing: 0.2em; text-shadow: 0 0 10px rgba(255,140,40,0.9), 0 0 22px rgba(255,90,20,0.5); pointer-events: none; z-index: 12; opacity: 0; }

@keyframes pickup-in {
  0%   { opacity: 0; transform: translate(-50%, 12px) scale(0.85); }
  20%  { opacity: 1; transform: translate(-50%, 0)    scale(1.1);  }
  80%  { opacity: 1; transform: translate(-50%, 0)    scale(1);    }
  100% { opacity: 0; transform: translate(-50%, -8px) scale(0.95); }
}
.pickup-in { animation: pickup-in 1.6s ease-out forwards; }
```

---

## Checklist (do these in order, run `tsc --noEmit` between each)

- [ ] Add GAME_CONFIG keys
- [ ] Add `Rocket`, `PowerUp` interfaces; extend `Particle` with `kind`; add `PowerUpKind` const-object
- [ ] Add state fields + DOM element refs
- [ ] Update HUD HTML (hud-right wrapper, rocket-hud span, pickup-popup div, ctrl-rocket button)
- [ ] Wire touch handler + onKeyDown for ShiftLeft/ShiftRight
- [ ] `handleShipHit()` — extract from existing ship-vs-asteroid block
- [ ] `fireRocket()` + `updateRockets()` + `removeRocket()`
- [ ] `checkRocketCollisions()` + `detonateRocket()`
- [ ] VFX helpers: `spawnTrailPuff`, `spawnSmoke`, `spawnExplosionSparks`, `spawnShockwave`
- [ ] Modify `updateParticles()` for kind-aware scale + opacity
- [ ] Power-up lifecycle: `maybeDropPowerUp`, `spawnPowerUp`, `updatePowerUps`, `removePowerUp`, `checkPowerUpPickup`, `applyPowerUp`, `showPickupPopup`
- [ ] Audio: `playRocketLaunch`, `playRocketBoom`, `playPickup`
- [ ] `updateHUD()` rocket ammo display
- [ ] `clearGameObjects()` / `startGame()` reset for new arrays
- [ ] Call new update methods in `animate()` + popup timer tick
- [ ] CSS additions
- [ ] Final `tsc --noEmit` + `npm run build`

---

## Deliverable

Updated `src/main.ts` and `src/style.css` only. No new files. No new packages.

Suggested commit: `feat(asteroids): rocket launcher power-up - AoE blast, trail VFX, self-damage, pickups`
