import './style.css'
import * as THREE from 'three'

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

const GamePhase = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
} as const
type GamePhase = typeof GamePhase[keyof typeof GamePhase]

interface PlayerShip {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotation: number
  invincible: boolean
  invincibleTimer: number
  thrusterLight: THREE.PointLight
  thrusterMesh: THREE.Mesh
}

interface Bullet {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  lifetime: number
  light: THREE.PointLight
}

interface Asteroid {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotationAxis: THREE.Vector3
  rotationSpeed: number
  size: 'large' | 'medium' | 'small'
}

class AsteroidsGame {
  private readonly scene: THREE.Scene
  private readonly camera: THREE.OrthographicCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly clock: THREE.Clock

  private phase: GamePhase = GamePhase.MENU
  private score: number = 0
  private lives: number = 3
  private wave: number = 1

  private ship: PlayerShip | null = null
  private bullets: Bullet[] = []
  private asteroids: Asteroid[] = []

  private readonly keys: Set<string> = new Set()
  private lastFireTime: number = 0
  private readonly fireCooldown: number = 0.25

  private animFrameId: number = 0

  private readonly menuOverlay: HTMLElement
  private readonly gameOverOverlay: HTMLElement
  private readonly scoreEl: HTMLElement
  private readonly livesEl: HTMLElement
  private readonly waveEl: HTMLElement
  private readonly finalScoreEl: HTMLElement

  private waveTextTimer: number = 0
  private flashTimer: number = 0

  private readonly boundOnKeyDown: (e: KeyboardEvent) => void
  private readonly boundOnKeyUp: (e: KeyboardEvent) => void
  private readonly boundOnResize: () => void

  constructor() {
    // Scene — no background so CSS nebula gradient shows through
    this.scene = new THREE.Scene()

    // Camera — orthographic top-down for crisp 1:1 movement
    const aspect = window.innerWidth / window.innerHeight
    const half = GAME_CONFIG.WORLD_HALF_SIZE
    const viewHalfH = half
    const viewHalfW = half * aspect
    this.camera = new THREE.OrthographicCamera(
      -viewHalfW, viewHalfW,
       viewHalfH, -viewHalfH,
       0.1, 100
    )
    this.camera.position.set(0, 30, 0)
    this.camera.lookAt(0, 0, 0)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const app = document.querySelector<HTMLDivElement>('#app')!
    app.appendChild(this.renderer.domElement)

    this.clock = new THREE.Clock()

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0)
    dirLight.position.set(-10, 20, 5)
    dirLight.castShadow = true
    this.scene.add(dirLight)

    // Starfield
    this.createStarfield()

    // Build HUD HTML — inject via insertAdjacentHTML to avoid nuking the canvas
    app.insertAdjacentHTML('beforeend', `
      <div id="hud">
        <span id="score">SCORE: 0</span>
        <span id="wave"></span>
        <span id="lives">❤️❤️❤️</span>
      </div>
      <div id="menu-overlay" class="screen-overlay">
        <h1>HYPERSPACE ASTEROIDS</h1>
        <p>PRESS ENTER TO PLAY</p>
        <button class="start-btn" id="start-btn">TAP TO PLAY</button>
      </div>
      <div id="gameover-overlay" class="screen-overlay hidden">
        <h1>GAME OVER</h1>
        <p id="final-score">SCORE: 0</p>
        <p>PRESS ENTER TO RESTART</p>
        <button class="start-btn" id="restart-btn">TAP TO RESTART</button>
      </div>
      <div id="mobile-controls">
        <div id="ctrl-left"  class="ctrl-btn" data-key="ArrowLeft">◀</div>
        <div id="ctrl-thrust" class="ctrl-btn" data-key="ArrowUp">▲</div>
        <div id="ctrl-right" class="ctrl-btn" data-key="ArrowRight">▶</div>
        <div id="ctrl-brake" class="ctrl-btn" data-key="ArrowDown">▼</div>
        <div id="ctrl-fire"  class="ctrl-btn ctrl-fire" data-key="Space">FIRE</div>
      </div>
    `)

    this.menuOverlay = document.getElementById('menu-overlay')!
    this.gameOverOverlay = document.getElementById('gameover-overlay')!
    this.scoreEl = document.getElementById('score')!
    this.livesEl = document.getElementById('lives')!
    this.waveEl = document.getElementById('wave')!
    this.finalScoreEl = document.getElementById('final-score')!

    // Event listeners
    this.boundOnKeyDown = this.onKeyDown.bind(this)
    this.boundOnKeyUp = this.onKeyUp.bind(this)
    this.boundOnResize = this.onResize.bind(this)

    window.addEventListener('keydown', this.boundOnKeyDown)
    window.addEventListener('keyup', this.boundOnKeyUp)
    window.addEventListener('resize', this.boundOnResize)

    // Mobile: tap start/restart buttons
    document.getElementById('start-btn')?.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (this.phase === GamePhase.MENU) this.startGame()
    }, { passive: false })
    document.getElementById('restart-btn')?.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (this.phase === GamePhase.GAME_OVER) this.startGame()
    }, { passive: false })

    // Mobile: D-pad touch controls
    document.querySelectorAll<HTMLElement>('.ctrl-btn').forEach((btn) => {
      const key = btn.dataset.key!
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault()
        this.keys.add(key)
        if (key === 'Space' && this.phase === GamePhase.PLAYING) this.fireBullet()
      }, { passive: false })
      btn.addEventListener('touchend', (e) => {
        e.preventDefault()
        this.keys.delete(key)
      }, { passive: false })
      btn.addEventListener('touchcancel', () => this.keys.delete(key))
    })

    this.animate()
  }

  private createStarfield(): void {
    const starGeo = new THREE.BufferGeometry()
    const starCount = 800
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xbfd6ff),  // cool blue-white
      new THREE.Color(0xffe5b4),  // warm pale
      new THREE.Color(0xd6b3ff),  // soft violet
    ]

    for (let i = 0; i < starCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 80
      positions[i * 3 + 1] = -2 - Math.random() * 3     // below play plane
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3]     = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    const starMat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    })
    const stars = new THREE.Points(starGeo, starMat)
    this.scene.add(stars)
  }

  private createShip(): PlayerShip {
    // Cone — tip points along +Z by default after rotation. We rotate the
    // geometry so the tip faces +Z (forward in our world), then the ship's
    // `rotation` (yaw) rotates the mesh around Y to aim it.
    const geo = new THREE.ConeGeometry(0.55, 1.4, 16)
    geo.rotateX(Math.PI / 2)         // tip from +Y → +Z
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00eaff,
      emissive: new THREE.Color(0x0088aa),
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.4,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.scene.add(mesh)

    // Thruster glow — small flat disc behind the ship, hidden until thrusting
    const thrusterGeo = new THREE.ConeGeometry(0.35, 0.9, 12)
    thrusterGeo.rotateX(-Math.PI / 2)  // tip from +Y → -Z (trailing behind)
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.0,
    })
    const thrusterMesh = new THREE.Mesh(thrusterGeo, thrusterMat)
    thrusterMesh.position.z = -0.8
    mesh.add(thrusterMesh)

    // Point light that flickers on while thrusting
    const thrusterLight = new THREE.PointLight(0xff8833, 0.0, 6)
    thrusterLight.position.z = -1.0
    mesh.add(thrusterLight)

    return {
      mesh,
      velocity: new THREE.Vector3(),
      rotation: 0,
      invincible: false,
      invincibleTimer: 0,
      thrusterLight,
      thrusterMesh,
    }
  }

  private spawnAsteroid(
    size: 'large' | 'medium' | 'small',
    position?: THREE.Vector3
  ): Asteroid {
    const radius = size === 'large' ? 2.4 : size === 'medium' ? 1.4 : 0.7
    const geo = new THREE.DodecahedronGeometry(radius, 0)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x9a8878,
      emissive: new THREE.Color(0x221a14),
      emissiveIntensity: 0.6,
      roughness: 0.95,
      metalness: 0.15,
      flatShading: true,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true

    if (position) {
      mesh.position.copy(position)
    } else {
      // Spawn at random edge
      const half = GAME_CONFIG.WORLD_HALF_SIZE
      if (Math.random() < 0.5) {
        mesh.position.x = (Math.random() < 0.5 ? -1 : 1) * half
        mesh.position.z = (Math.random() - 0.5) * half * 2
      } else {
        mesh.position.x = (Math.random() - 0.5) * half * 2
        mesh.position.z = (Math.random() < 0.5 ? -1 : 1) * half
      }
    }

    // Velocity pointing roughly inward if spawning at edge, otherwise random
    let angle: number
    if (!position) {
      // Point inward from edge
      angle = Math.atan2(-mesh.position.z, -mesh.position.x) + (Math.random() - 0.5) * 1.0
    } else {
      angle = Math.random() * Math.PI * 2
    }

    const speed =
      size === 'large'
        ? GAME_CONFIG.ASTEROID_SPEED_LARGE
        : size === 'medium'
        ? GAME_CONFIG.ASTEROID_SPEED_MEDIUM
        : GAME_CONFIG.ASTEROID_SPEED_SMALL

    const velocity = new THREE.Vector3(Math.cos(angle) * speed, 0, Math.sin(angle) * speed)

    const rotationAxis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize()

    const rotationSpeed = 0.5 + Math.random() * 1.5

    this.scene.add(mesh)

    return { mesh, velocity, rotationAxis, rotationSpeed, size }
  }

  private startGame(): void {
    // Cleanup existing objects
    this.clearGameObjects()

    this.score = 0
    this.lives = 3
    this.wave = 1
    this.bullets = []
    this.asteroids = []

    // Create ship
    this.ship = this.createShip()

    // Spawn wave 1
    this.spawnWave()

    this.phase = GamePhase.PLAYING
    this.menuOverlay.classList.add('hidden')
    this.gameOverOverlay.classList.add('hidden')
    this.updateHUD()
  }

  private spawnWave(): void {
    const count = GAME_CONFIG.ASTEROID_INITIAL_COUNT + (this.wave - 1) * 2
    for (let i = 0; i < count; i++) {
      this.asteroids.push(this.spawnAsteroid('large'))
    }
    this.showWaveText()
  }

  private showWaveText(): void {
    this.waveEl.textContent = `WAVE ${this.wave}`
    this.waveTextTimer = 2.0
  }

  private clearGameObjects(): void {
    // Remove ship
    if (this.ship) {
      this.ship.mesh.geometry.dispose()
      ;(this.ship.mesh.material as THREE.Material).dispose()
      this.scene.remove(this.ship.mesh)
      this.ship = null
    }

    // Remove bullets
    for (const bullet of this.bullets) {
      bullet.mesh.geometry.dispose()
      ;(bullet.mesh.material as THREE.Material).dispose()
      this.scene.remove(bullet.mesh)
    }
    this.bullets = []

    // Remove asteroids
    for (const asteroid of this.asteroids) {
      asteroid.mesh.geometry.dispose()
      ;(asteroid.mesh.material as THREE.Material).dispose()
      this.scene.remove(asteroid.mesh)
    }
    this.asteroids = []
  }

  private fireBullet(): void {
    const elapsed = this.clock.getElapsedTime()
    if (elapsed - this.lastFireTime < this.fireCooldown) return
    if (!this.ship) return

    this.lastFireTime = elapsed

    // If at max, remove oldest
    if (this.bullets.length >= GAME_CONFIG.MAX_BULLETS) {
      const oldest = this.bullets.shift()!
      oldest.mesh.geometry.dispose()
      ;(oldest.mesh.material as THREE.Material).dispose()
      this.scene.remove(oldest.mesh)
    }

    const geo = new THREE.SphereGeometry(0.15, 8, 8)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffff66,
      emissive: new THREE.Color(0xffff44),
      emissiveIntensity: 3,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(this.ship.mesh.position)

    const facing = new THREE.Vector3(
      Math.sin(this.ship.rotation),
      0,
      Math.cos(this.ship.rotation)
    )

    mesh.position.add(facing.clone().multiplyScalar(0.9))
    this.scene.add(mesh)

    // Bullet carries its own light so it illuminates nearby asteroids
    const light = new THREE.PointLight(0xffee66, 1.5, 5)
    mesh.add(light)

    const velocity = facing.multiplyScalar(GAME_CONFIG.BULLET_SPEED)

    this.bullets.push({ mesh, velocity, lifetime: GAME_CONFIG.BULLET_LIFETIME, light })
  }

  private wrapPosition(pos: THREE.Vector3): void {
    const half = GAME_CONFIG.WORLD_HALF_SIZE
    if (pos.x > half) pos.x = -half
    else if (pos.x < -half) pos.x = half
    if (pos.z > half) pos.z = -half
    else if (pos.z < -half) pos.z = half
  }

  private updateShip(delta: number): void {
    if (!this.ship) return

    const ship = this.ship

    // Rotation
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      ship.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * delta
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      ship.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * delta
    }

    // Thrust
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      const facing = new THREE.Vector3(Math.sin(ship.rotation), 0, Math.cos(ship.rotation))
      ship.velocity.addScaledVector(facing, GAME_CONFIG.SHIP_THRUST * delta)
    }

    // Brake
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      ship.velocity.multiplyScalar(0.92)
    }

    // Damping
    ship.velocity.multiplyScalar(GAME_CONFIG.SHIP_DAMPING)

    // Clamp speed
    if (ship.velocity.length() > GAME_CONFIG.SHIP_MAX_SPEED) {
      ship.velocity.setLength(GAME_CONFIG.SHIP_MAX_SPEED)
    }

    // Move
    ship.mesh.position.addScaledVector(ship.velocity, delta)

    // Screen wrap
    this.wrapPosition(ship.mesh.position)

    // Mesh rotation — cone tip points in (sin θ, 0, cos θ) to match firing dir
    ship.mesh.rotation.y = ship.rotation

    // Thruster visual + light pulse
    const thrusting = this.keys.has('KeyW') || this.keys.has('ArrowUp')
    if (thrusting) {
      const flicker = 0.7 + Math.random() * 0.3
      ;(ship.thrusterMesh.material as THREE.MeshBasicMaterial).opacity = flicker
      ship.thrusterLight.intensity = 2.0 * flicker
    } else {
      ;(ship.thrusterMesh.material as THREE.MeshBasicMaterial).opacity = 0
      ship.thrusterLight.intensity = 0
    }

    // Invincibility
    if (ship.invincible) {
      ship.invincibleTimer -= delta
      this.flashTimer += delta
      if (this.flashTimer >= 0.1) {
        ship.mesh.visible = !ship.mesh.visible
        this.flashTimer = 0
      }
      if (ship.invincibleTimer <= 0) {
        ship.invincible = false
        ship.mesh.visible = true
      }
    }
  }

  private updateBullets(delta: number): void {
    const toRemove: Bullet[] = []

    for (const bullet of this.bullets) {
      bullet.lifetime -= delta
      if (bullet.lifetime <= 0) {
        toRemove.push(bullet)
        continue
      }
      bullet.mesh.position.addScaledVector(bullet.velocity, delta)
      this.wrapPosition(bullet.mesh.position)
    }

    for (const bullet of toRemove) {
      this.removeBullet(bullet)
    }
  }

  private removeBullet(bullet: Bullet): void {
    bullet.mesh.geometry.dispose()
    ;(bullet.mesh.material as THREE.Material).dispose()
    this.scene.remove(bullet.mesh)
    const idx = this.bullets.indexOf(bullet)
    if (idx !== -1) this.bullets.splice(idx, 1)
  }

  private removeAsteroid(asteroid: Asteroid): void {
    asteroid.mesh.geometry.dispose()
    ;(asteroid.mesh.material as THREE.Material).dispose()
    this.scene.remove(asteroid.mesh)
    const idx = this.asteroids.indexOf(asteroid)
    if (idx !== -1) this.asteroids.splice(idx, 1)
  }

  private updateAsteroids(delta: number): void {
    for (const asteroid of this.asteroids) {
      asteroid.mesh.position.addScaledVector(asteroid.velocity, delta)
      this.wrapPosition(asteroid.mesh.position)
      asteroid.mesh.rotateOnAxis(asteroid.rotationAxis, asteroid.rotationSpeed * delta)
    }
  }

  private checkCollisions(): void {
    const bulletBox = new THREE.Box3()
    const asteroidBox = new THREE.Box3()
    const shipBox = new THREE.Box3()

    const bulletsToRemove: Bullet[] = []
    const asteroidsToRemove: Asteroid[] = []
    const asteroidsToSpawn: { size: 'medium' | 'small'; pos: THREE.Vector3 }[] = []

    // Bullet vs asteroid
    for (const bullet of this.bullets) {
      if (bulletsToRemove.includes(bullet)) continue
      bulletBox.setFromObject(bullet.mesh)

      for (const asteroid of this.asteroids) {
        if (asteroidsToRemove.includes(asteroid)) continue
        asteroidBox.setFromObject(asteroid.mesh)

        if (bulletBox.intersectsBox(asteroidBox)) {
          bulletsToRemove.push(bullet)
          asteroidsToRemove.push(asteroid)

          // Score
          if (asteroid.size === 'large') {
            this.score += 20
            asteroidsToSpawn.push({ size: 'medium', pos: asteroid.mesh.position.clone() })
            asteroidsToSpawn.push({ size: 'medium', pos: asteroid.mesh.position.clone() })
          } else if (asteroid.size === 'medium') {
            this.score += 50
            asteroidsToSpawn.push({ size: 'small', pos: asteroid.mesh.position.clone() })
            asteroidsToSpawn.push({ size: 'small', pos: asteroid.mesh.position.clone() })
          } else {
            this.score += 100
          }

          break
        }
      }
    }

    // Ship vs asteroid
    if (this.ship && !this.ship.invincible) {
      shipBox.setFromObject(this.ship.mesh)

      for (const asteroid of this.asteroids) {
        if (asteroidsToRemove.includes(asteroid)) continue
        asteroidBox.setFromObject(asteroid.mesh)

        if (shipBox.intersectsBox(asteroidBox)) {
          this.lives -= 1
          this.updateHUD()

          if (this.lives <= 0) {
            this.triggerGameOver()
            return
          } else {
            this.ship.invincible = true
            this.ship.invincibleTimer = GAME_CONFIG.INVINCIBILITY_DURATION
            this.flashTimer = 0
          }
          break
        }
      }
    }

    // Remove collided bullets
    for (const bullet of bulletsToRemove) {
      this.removeBullet(bullet)
    }

    // Remove collided asteroids
    for (const asteroid of asteroidsToRemove) {
      this.removeAsteroid(asteroid)
    }

    // Spawn child asteroids
    for (const spawn of asteroidsToSpawn) {
      this.asteroids.push(this.spawnAsteroid(spawn.size, spawn.pos))
    }

    this.updateHUD()
  }

  private checkWaveComplete(): void {
    if (this.phase !== GamePhase.PLAYING) return
    if (this.asteroids.length === 0) {
      this.wave++
      this.spawnWave()
    }
  }

  private triggerGameOver(): void {
    this.phase = GamePhase.GAME_OVER
    this.finalScoreEl.textContent = `SCORE: ${this.score}`
    this.gameOverOverlay.classList.remove('hidden')
  }

  private updateHUD(): void {
    this.scoreEl.textContent = `SCORE: ${this.score}`

    const fullHeart = '❤️'
    const emptyHeart = '♡'
    let livesStr = ''
    for (let i = 0; i < 3; i++) {
      livesStr += i < this.lives ? fullHeart : emptyHeart
    }
    this.livesEl.textContent = livesStr
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code)

    if (e.code === 'Space' && this.phase === GamePhase.PLAYING) {
      this.fireBullet()
    }

    if (e.code === 'Enter') {
      if (this.phase === GamePhase.MENU || this.phase === GamePhase.GAME_OVER) {
        this.startGame()
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code)
  }

  private onResize(): void {
    const aspect = window.innerWidth / window.innerHeight
    const half = GAME_CONFIG.WORLD_HALF_SIZE
    const viewHalfH = half
    const viewHalfW = half * aspect
    this.camera.left   = -viewHalfW
    this.camera.right  =  viewHalfW
    this.camera.top    =  viewHalfH
    this.camera.bottom = -viewHalfH
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  private animate(): void {
    this.animFrameId = requestAnimationFrame(this.animate.bind(this))

    let delta = this.clock.getDelta()
    delta = Math.min(delta, 0.04)

    if (this.phase === GamePhase.PLAYING) {
      this.updateShip(delta)
      this.updateBullets(delta)
      this.updateAsteroids(delta)
      this.checkCollisions()
      this.checkWaveComplete()

      // Wave text fade
      if (this.waveTextTimer > 0) {
        this.waveTextTimer -= delta
        if (this.waveTextTimer <= 0) {
          this.waveEl.textContent = ''
        }
      }
    }

    this.renderer.render(this.scene, this.camera)
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId)
    window.removeEventListener('keydown', this.boundOnKeyDown)
    window.removeEventListener('keyup', this.boundOnKeyUp)
    window.removeEventListener('resize', this.boundOnResize)
    this.clearGameObjects()
    this.renderer.dispose()
  }
}

new AsteroidsGame()
