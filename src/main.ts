import * as THREE from 'three'
import './style.css'

const GAME_PHASE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  GAME_OVER: 'GAME_OVER',
} as const

type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE]

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
} as const

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
  [0, 0, -145],
  [-1, 0, -150],
  [0, 0, -170],
  [4, 0, -170],
  [-4, 0, -170],
]

interface Obstacle {
  mesh: THREE.Mesh
  bounds: THREE.Box3
}

class CubeRunnerGame {
  private readonly root: HTMLDivElement
  private readonly hudScore: HTMLParagraphElement
  private readonly mainMenu: HTMLDivElement
  private readonly gameOver: HTMLDivElement
  private readonly gameOverScore: HTMLParagraphElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock: THREE.Clock
  private readonly playerMesh: THREE.Mesh
  private readonly playerBounds: THREE.Box3
  private readonly groundTop: number
  private readonly floorHalfWidth: number
  private readonly obstacles: Obstacle[] = []
  private readonly input = { left: false, right: false }

  private phase: GamePhase = GAME_PHASE.MENU
  private score = 0
  private playerVelocity = new THREE.Vector3()
  private animationFrameId = 0

  constructor(app: HTMLDivElement) {
    app.innerHTML = `
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
    `

    const sceneHost = this.requireElement<HTMLDivElement>('scene-host')
    this.root = this.requireElement<HTMLDivElement>('game-root')
    this.hudScore = this.requireElement<HTMLParagraphElement>('score')
    this.mainMenu = this.requireElement<HTMLDivElement>('main-menu')
    this.gameOver = this.requireElement<HTMLDivElement>('game-over')
    this.gameOverScore = this.requireElement<HTMLParagraphElement>('final-score')

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    sceneHost.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#cecece')
    this.scene.fog = new THREE.Fog('#e9e8e8', 20, 100)

    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    )
    this.camera.position.set(0, 1, 7)

    this.clock = new THREE.Clock()

    this.setupLights()
    this.setupGround()

    const playerGeometry = new THREE.BoxGeometry(1, 1, 1)
    const playerMaterial = new THREE.MeshStandardMaterial({ color: '#fb2929', roughness: 0 })
    this.playerMesh = new THREE.Mesh(playerGeometry, playerMaterial)
    this.playerMesh.castShadow = true
    this.playerMesh.position.copy(GAME_CONFIG.player.startPosition)
    this.scene.add(this.playerMesh)
    this.playerBounds = new THREE.Box3().setFromObject(this.playerMesh)

    this.createObstacles()
    this.groundTop = GAME_CONFIG.ground.positionY + GAME_CONFIG.ground.height * 0.5
    this.floorHalfWidth = GAME_CONFIG.ground.width * 0.5

    this.attachEvents()
    this.handleResize()
    this.animate()
  }

  private requireElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id)
    if (!element) {
      throw new Error(`Missing required element: #${id}`)
    }
    return element as T
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 1)
    directional.position.set(2, 5, 3)
    directional.castShadow = true
    directional.shadow.mapSize.set(1024, 1024)
    directional.shadow.camera.near = 1
    directional.shadow.camera.far = 40
    directional.shadow.camera.top = 10
    directional.shadow.camera.right = 10
    directional.shadow.camera.bottom = -10
    directional.shadow.camera.left = -10
    directional.name = 'follow-light'
    this.scene.add(directional)
    this.scene.add(directional.target)
  }

  private setupGround(): void {
    const geometry = new THREE.BoxGeometry(
      GAME_CONFIG.ground.width,
      GAME_CONFIG.ground.height,
      GAME_CONFIG.ground.depth,
    )
    const material = new THREE.MeshStandardMaterial({ color: '#ffffff' })
    const ground = new THREE.Mesh(geometry, material)
    ground.receiveShadow = true
    ground.position.set(0, GAME_CONFIG.ground.positionY, GAME_CONFIG.ground.positionZ)
    this.scene.add(ground)
  }

  private createObstacles(): void {
    const geometry = new THREE.BoxGeometry(
      GAME_CONFIG.obstacle.size.x,
      GAME_CONFIG.obstacle.size.y,
      GAME_CONFIG.obstacle.size.z,
    )
    const material = new THREE.MeshStandardMaterial({ color: '#383838' })

    for (const [x, y, z] of OBSTACLE_LAYOUT) {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.position.set(x, y, z)
      this.scene.add(mesh)
      this.obstacles.push({ mesh, bounds: new THREE.Box3().setFromObject(mesh) })
    }
  }

  private attachEvents(): void {
    window.addEventListener('resize', this.handleResize)
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)

    this.requireElement<HTMLButtonElement>('start-btn').addEventListener('click', this.startGame)
    this.requireElement<HTMLButtonElement>('restart-btn').addEventListener('click', this.resetToMenu)
  }

  private readonly handleResize = (): void => {
    const width = this.root.clientWidth
    const height = this.root.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      this.input.left = true
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      this.input.right = true
    }

    if ((event.code === 'Space' || event.code === 'Enter') && this.phase === GAME_PHASE.MENU) {
      this.startGame()
    }
    if ((event.code === 'Space' || event.code === 'Enter') && this.phase === GAME_PHASE.GAME_OVER) {
      this.resetToMenu()
      this.startGame()
    }
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
      this.input.left = false
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
      this.input.right = false
    }
  }

  private readonly startGame = (): void => {
    this.phase = GAME_PHASE.PLAYING
    this.score = 0
    this.playerVelocity.set(0, 0, -GAME_CONFIG.player.forwardSpeed)
    this.playerMesh.position.copy(GAME_CONFIG.player.startPosition)
    this.updateUiPhase()
  }

  private readonly resetToMenu = (): void => {
    this.phase = GAME_PHASE.MENU
    this.score = 0
    this.playerVelocity.set(0, 0, 0)
    this.playerMesh.position.copy(GAME_CONFIG.player.startPosition)
    this.hudScore.textContent = '0'
    this.updateUiPhase()
    this.updateCameraFollow()
  }

  private endGame(): void {
    this.phase = GAME_PHASE.GAME_OVER
    this.gameOverScore.textContent = `Score: ${this.score}`
    this.updateUiPhase()
  }

  private updateUiPhase(): void {
    const hud = this.requireElement<HTMLDivElement>('hud')
    hud.classList.toggle('hidden', this.phase !== GAME_PHASE.PLAYING)
    this.mainMenu.classList.toggle('hidden', this.phase !== GAME_PHASE.MENU)
    this.gameOver.classList.toggle('hidden', this.phase !== GAME_PHASE.GAME_OVER)
  }

  private animate = (): void => {
    this.animationFrameId = window.requestAnimationFrame(this.animate)

    const delta = Math.min(this.clock.getDelta(), 0.04)

    if (this.phase === GAME_PHASE.PLAYING) {
      this.updatePlayer(delta)
      this.updateScore()
      this.checkObstacleCollision()
      if (this.playerMesh.position.y < GAME_CONFIG.player.fallThreshold) {
        this.endGame()
      }
    }

    this.updateCameraFollow()
    this.updateFollowLight()
    this.renderer.render(this.scene, this.camera)
  }

  private updatePlayer(delta: number): void {
    const direction = Number(this.input.right) - Number(this.input.left)

    if (direction !== 0) {
      this.playerVelocity.x += direction * GAME_CONFIG.player.sidewaysAcceleration * delta
      this.playerVelocity.x = THREE.MathUtils.clamp(
        this.playerVelocity.x,
        -GAME_CONFIG.player.sidewaysMaxSpeed,
        GAME_CONFIG.player.sidewaysMaxSpeed,
      )
    } else {
      this.playerVelocity.x = THREE.MathUtils.damp(
        this.playerVelocity.x,
        0,
        GAME_CONFIG.player.damping,
        delta,
      )
    }

    this.playerVelocity.z = -GAME_CONFIG.player.forwardSpeed
    this.playerVelocity.y -= GAME_CONFIG.player.gravity * delta

    this.playerMesh.position.x += this.playerVelocity.x * delta
    this.playerMesh.position.y += this.playerVelocity.y * delta
    this.playerMesh.position.z += this.playerVelocity.z * delta

    const supportY = this.groundTop + 0.5
    const isWithinGround = Math.abs(this.playerMesh.position.x) <= this.floorHalfWidth

    if (isWithinGround && this.playerMesh.position.y < supportY) {
      this.playerMesh.position.y = supportY
      this.playerVelocity.y = 0
    }
  }

  private updateCameraFollow(): void {
    this.camera.position.set(
      this.playerMesh.position.x,
      this.playerMesh.position.y + GAME_CONFIG.camera.offsetY,
      this.playerMesh.position.z + GAME_CONFIG.camera.offsetZ,
    )
    this.camera.lookAt(
      this.playerMesh.position.x,
      this.playerMesh.position.y + GAME_CONFIG.camera.offsetY,
      this.playerMesh.position.z,
    )
  }

  private updateFollowLight(): void {
    const light = this.scene.getObjectByName('follow-light') as THREE.DirectionalLight | null
    if (!light) return
    light.position.z = this.camera.position.z - 3
    light.target.position.set(this.camera.position.x, this.camera.position.y - 1, this.camera.position.z - 7)
    light.target.updateMatrixWorld()
  }

  private updateScore(): void {
    this.score = Math.abs(Math.floor(this.playerMesh.position.z))
    this.hudScore.textContent = `${this.score}`
  }

  private checkObstacleCollision(): void {
    this.playerBounds.setFromObject(this.playerMesh)
    for (const obstacle of this.obstacles) {
      if (this.playerBounds.intersectsBox(obstacle.bounds)) {
        this.endGame()
        return
      }
    }
  }

  destroy(): void {
    window.cancelAnimationFrame(this.animationFrameId)
    window.removeEventListener('resize', this.handleResize)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.renderer.dispose()
  }
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('Missing #app root element.')
}

const game = new CubeRunnerGame(app)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy()
  })
}
