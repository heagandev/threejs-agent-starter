# /wave-escalation — Add Boss Waves and Escalation

Read `AGENTS.md` fully before starting. Load `skills/threejs-game.md` and `skills/threejs-geometry.md`.

---

## Context

The Asteroids 3D game is running on the `asteroids` branch. Waves increase asteroid count each round. Your job is to add escalating variety so later waves feel harder and more chaotic — without changing the core loop.

---

## Requirements

### Escalating Difficulty Per Wave

Add wave-scaling to `GAME_CONFIG`:
```ts
WAVE_SPEED_SCALE: 0.08,     // asteroid speed multiplier added per wave (stacks)
WAVE_EXTRA_ASTEROIDS: 2,    // extra large asteroids per wave beyond wave 1
WAVE_MAX_ASTEROIDS: 12,     // hard cap
```

Asteroids spawned in wave N should move at `baseSpeed * (1 + (N-1) * WAVE_SPEED_SCALE)`.

### Fast Asteroids (wave 3+)

Starting wave 3, 20% of large asteroids spawn as "fast" variants:
- Same geometry, but emissive red tint (`0xff3300`, emissiveIntensity 1.5)
- Speed 2.5× the normal large speed
- Still split into 2 medium on destruction

### Swarm Wave (every 4th wave)

On waves 4, 8, 12…, replace the normal spawn with a **swarm wave**:
- Spawn 12 small asteroids (no large or medium) converging on the ship position
- Velocity points from spawn edge toward ship + small random spread (±15°)
- Show `SWARM WAVE!` in the wave HUD banner instead of `WAVE N`

### Boss Asteroid (wave 5+, once per run)

On wave 5 (or the first wave divisible by 5), spawn one **Boss** asteroid in addition to normal asteroids:
- `DodecahedronGeometry(4.5, 1)` — large, detailed
- `MeshStandardMaterial` dark purple `0x440066`, emissiveIntensity 0.8
- Requires **3 bullet hits** to destroy (track `hitPoints` on boss object)
- Each hit flashes white emissive briefly
- On destruction: +500 score, 4 medium children, screen shake 0.8s

Add a `BossAsteroid` interface:
```ts
interface BossAsteroid {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotationAxis: THREE.Vector3
  rotationSpeed: number
  hitPoints: number
  flashTimer: number
}
```

Track one optional `private boss: BossAsteroid | null = null`.

### Wave Complete Check

Update `checkWaveComplete()` to also wait for `this.boss === null` before advancing the wave.

---

## Architecture Rules

- Keep all new config in `GAME_CONFIG`
- No new files — all changes in `src/main.ts` and `src/style.css`
- Boss must be disposed and nulled in `clearGameObjects()` and on destruction
- Swarm wave logic must not break the wave counter or asteroid removal loop

---

## Deliverable

Updated `src/main.ts` and `src/style.css` only. No new files. No new packages.

Suggested commit: `feat(asteroids): wave escalation - fast asteroids, swarm waves, boss`
