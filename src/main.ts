import * as THREE from 'three';
import './style.css';

// ---------------------------------------------------------------------------
// Game phases (erasableSyntaxOnly-safe — no TS enum)
// ---------------------------------------------------------------------------
const GamePhase = {
  MENU:        'MENU',
  PLAYING:     'PLAYING',
  GAME_OVER:   'GAME_OVER',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
} as const;
type GamePhase = typeof GamePhase[keyof typeof GamePhase];

// ---------------------------------------------------------------------------
// Power-up types
// ---------------------------------------------------------------------------
const PowerUpType = {
  WIDE_PADDLE: 'WIDE_PADDLE',
  MULTI_BALL:  'MULTI_BALL',
  FAST_BALL:   'FAST_BALL',
  SLOW_BALL:   'SLOW_BALL',
} as const;
type PowerUpType = typeof PowerUpType[keyof typeof PowerUpType];

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
interface Block      { mesh: THREE.Mesh; box: THREE.Box3; hp: number; row: number; col: number }
interface Ball       { mesh: THREE.Mesh; box: THREE.Box3; velocity: THREE.Vector3; launched: boolean }
interface Paddle     { mesh: THREE.Mesh; box: THREE.Box3 }
interface PowerUp    { mesh: THREE.Mesh; box: THREE.Box3; type: PowerUpType }
interface DyingBlock { mesh: THREE.Mesh; timer: number }

// ---------------------------------------------------------------------------
// Config — all tunable values, no magic numbers inline
// ---------------------------------------------------------------------------
const GAME_CONFIG = {
  ARENA_WIDTH:  20,
  ARENA_HEIGHT: 24,

  PADDLE_WIDTH:  3.5,
  PADDLE_HEIGHT: 0.4,
  PADDLE_DEPTH:  0.5,
  PADDLE_SPEED:  18,
  PADDLE_Y:      -9,

  BALL_RADIUS:        0.22,
  BALL_INITIAL_SPEED: 12,
  BALL_SPEED_FAST:    12 * 1.6,
  BALL_SPEED_SLOW:    12 * 0.6,

  BLOCK_ROWS:    4,
  BLOCK_COLS:    10,
  BLOCK_WIDTH:   1.6,
  BLOCK_HEIGHT:  0.55,
  BLOCK_DEPTH:   0.4,
  BLOCK_PADDING: 0.12,
  BLOCK_START_Y: 6,

  LIVES_START: 3,

  BALL_INFLUENCE_FACTOR: 2.5,

  POWERUP_DROP_CHANCE:    0.25,
  POWERUP_FALL_SPEED:     5,
  POWERUP_WIDE_DURATION:  8,
  POWERUP_SLOW_DURATION:  6,
  POWERUP_FAST_DURATION:  4,

  BALL_PADDLE_CLEARANCE: 0.02,
  POWERUP_GEO_W: 0.6,
  POWERUP_GEO_H: 0.3,
  POWERUP_GEO_D: 0.3,
  WIDE_PADDLE_SCALE: 1.8,

  SHAKE_INTENSITY: 0.3,
  SHAKE_DURATION:  0.3,

  DYING_BLOCK_DURATION: 0.15,
} as const;

// ---------------------------------------------------------------------------
// Main game class
// ---------------------------------------------------------------------------
class BlockBreakerGame {
  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private clock!:    THREE.Clock;

  private paddle!: Paddle;
  private balls:       Ball[]       = [];
  private blocks:      Block[]      = [];
  private powerUps:    PowerUp[]    = [];
  private dyingBlocks: DyingBlock[] = [];

  private phase: GamePhase = GamePhase.MENU;
  private lives = GAME_CONFIG.LIVES_START;
  private level = 1;
  private score = 0;

  private wideTimer    = 0;
  private speedTimer   = 0;
  private currentSpeed: number = GAME_CONFIG.BALL_INITIAL_SPEED;
  private shakeTimer   = 0;

  private keysDown  = new Set<string>();
  private overlayEl!: HTMLElement;
  private hudEl!:     HTMLElement;

  private audioCtx: AudioContext | null = null;

  // Bound handlers kept for removal in destroy()
  private _onResize    = () => this.onResize();
  private _onKeyDown   = (e: KeyboardEvent) => this.onKeyDown(e);
  private _onKeyUp     = (e: KeyboardEvent) => this.keysDown.delete(e.code);
  private _onMouseMove = (e: MouseEvent)    => this.onMouseMove(e);
  private _onTouchMove = (e: TouchEvent)    => this.onTouchMove(e);
  private _onLaunch    = ()                 => this.tryLaunch();

  private rafId = 0;
  private levelClearTimer = 0;

  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initRenderer();
    this.initScene();
    this.initOverlay();
    this.initHUD();
    this.buildPaddle();
    this.spawnBallOnPaddle();
    this.attachEvents();
    this.loop();
  }

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------
  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 20);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  }

  private initOverlay() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'overlay';
    this.showMenuOverlay();
    this.container.appendChild(this.overlayEl);
  }

  private initHUD() {
    this.hudEl = document.createElement('div');
    this.hudEl.id = 'hud';
    this.hudEl.innerHTML =
      '<span id="hud-score">Score: 0</span>' +
      '<span id="hud-level">Level: 1</span>' +
      '<span id="hud-lives">&#9829;&#9829;&#9829;</span>';
    this.container.insertAdjacentElement('beforeend', this.hudEl);
    this.updateHUD();
  }

  // -------------------------------------------------------------------------
  // Overlay helpers
  // -------------------------------------------------------------------------
  private showMenuOverlay() {
    this.showOverlay(true,
      '<h1>BLOCK BREAKER</h1>' +
      '<p class="subtitle">DX-Ball Style</p>' +
      '<p>Move: Mouse or Arrow Keys</p>' +
      '<p>Launch: Space or Click | Mobile: Touch</p>' +
      '<p class="cta">Press Space or Click to Start</p>' +
      '<p id="mobile-hint" class="mobile-hint">Tap to launch</p>'
    );
  }

  private showLevelClearOverlay() {
    this.showOverlay(true,
      `<h1>LEVEL ${this.level} CLEAR!</h1>` +
      `<p class="subtitle">Score: ${this.score}</p>` +
      '<p>Next level loading...</p>'
    );
  }

  private showGameOverOverlay() {
    this.showOverlay(true,
      '<h1>GAME OVER</h1>' +
      `<p class="subtitle">Final Score: ${this.score}</p>` +
      '<p class="cta">Press Space or Click to Restart</p>'
    );
  }

  // -------------------------------------------------------------------------
  // HUD
  // -------------------------------------------------------------------------
  private updateHUD() {
    const scoreEl = document.getElementById('hud-score');
    const levelEl = document.getElementById('hud-level');
    const livesEl = document.getElementById('hud-lives');
    if (scoreEl) scoreEl.textContent = `Score: ${this.score}`;
    if (levelEl) levelEl.textContent = `Level: ${this.level}`;
    if (livesEl) livesEl.textContent = '\u2665'.repeat(Math.max(0, this.lives));
  }

  // -------------------------------------------------------------------------
  // Paddle
  // -------------------------------------------------------------------------
  private buildPaddle() {
    const cfg = GAME_CONFIG;
    const geo = new THREE.BoxGeometry(cfg.PADDLE_WIDTH, cfg.PADDLE_HEIGHT, cfg.PADDLE_DEPTH);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(0, cfg.PADDLE_Y, 0);
    this.scene.add(mesh);
    this.paddle = { mesh, box: new THREE.Box3().setFromObject(mesh) };
  }

  // -------------------------------------------------------------------------
  // Balls
  // -------------------------------------------------------------------------
  private spawnBallOnPaddle() {
    const cfg = GAME_CONFIG;
    const geo = new THREE.SphereGeometry(cfg.BALL_RADIUS, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.set(
      this.paddle.mesh.position.x,
      cfg.PADDLE_Y + cfg.PADDLE_HEIGHT / 2 + cfg.BALL_RADIUS + cfg.BALL_PADDLE_CLEARANCE,
      0,
    );
    this.scene.add(mesh);
    this.balls.push({
      mesh,
      box: new THREE.Box3().setFromObject(mesh),
      velocity: new THREE.Vector3(0, 0, 0),
      launched: false,
    });
  }

  private tryLaunch() {
    this.initAudio();

    if (this.phase === GamePhase.MENU) {
      this.phase = GamePhase.PLAYING;
      this.buildLevel(this.level);
      this.showOverlay(false);
      return;
    }

    if (this.phase === GamePhase.GAME_OVER) {
      this.restartGame();
      return;
    }

    if (this.phase !== GamePhase.PLAYING) return;
    for (const ball of this.balls) {
      if (!ball.launched) {
        ball.launched = true;
        ball.velocity.set(0.3, 1, 0).normalize().multiplyScalar(this.currentSpeed);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Block grid
  // -------------------------------------------------------------------------
  private buildLevel(level: number) {
    // Remove existing blocks
    for (const b of this.blocks) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.MeshStandardMaterial).dispose();
    }
    this.blocks = [];

    const cfg = GAME_CONFIG;
    const rows = cfg.BLOCK_ROWS + level - 1;
    const cols = cfg.BLOCK_COLS;
    const totalW = cols * cfg.BLOCK_WIDTH + (cols - 1) * cfg.BLOCK_PADDING;
    const startX = -totalW / 2 + cfg.BLOCK_WIDTH / 2;

    for (let row = 0; row < rows; row++) {
      const hp = row <= 1 ? 3 : row <= 3 ? 2 : 1;
      for (let col = 0; col < cols; col++) {
        const x = startX + col * (cfg.BLOCK_WIDTH + cfg.BLOCK_PADDING);
        const y = cfg.BLOCK_START_Y - row * (cfg.BLOCK_HEIGHT + cfg.BLOCK_PADDING);
        const geo = new THREE.BoxGeometry(cfg.BLOCK_WIDTH, cfg.BLOCK_HEIGHT, cfg.BLOCK_DEPTH);
        const mat = new THREE.MeshStandardMaterial({ color: this.hpColor(hp) });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(x, y, 0);
        this.scene.add(mesh);
        this.blocks.push({ mesh, box: new THREE.Box3().setFromObject(mesh), hp, row, col });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------
  private loop() {
    this.rafId = requestAnimationFrame(() => this.loop());
    const raw = this.clock.getDelta();
    const delta = Math.min(raw, 0.04);
    this.update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  private update(delta: number) {
    if (this.phase === GamePhase.LEVEL_CLEAR) {
      this.levelClearTimer -= delta;
      if (this.levelClearTimer <= 0) {
        this.level++;
        this.buildLevel(this.level);
        this.resetBalls();
        this.phase = GamePhase.PLAYING;
        this.showOverlay(false);
      }
      return;
    }

    if (this.phase !== GamePhase.PLAYING) return;

    this.updatePaddle(delta);
    this.updateBalls(delta);
    this.checkBlockCollisions();
    this.updatePowerUps(delta);
    this.updateDyingBlocks(delta);
    this.updateTimers(delta);
    this.updateHUD();

    // Screen shake
    if (this.shakeTimer > 0) {
      const t = this.shakeTimer / GAME_CONFIG.SHAKE_DURATION;
      this.camera.position.x = (Math.random() * 2 - 1) * GAME_CONFIG.SHAKE_INTENSITY * t;
      this.camera.position.y = (Math.random() * 2 - 1) * GAME_CONFIG.SHAKE_INTENSITY * t;
      this.shakeTimer -= delta;
      if (this.shakeTimer <= 0) {
        this.camera.position.x = 0;
        this.camera.position.y = 0;
      }
    }

    if (this.blocks.length === 0 && this.dyingBlocks.length === 0) {
      this.phase = GamePhase.LEVEL_CLEAR;
      this.levelClearTimer = 2;
      this.showLevelClearOverlay();
    }
  }

  // -------------------------------------------------------------------------
  // Timers (power-up countdowns)
  // -------------------------------------------------------------------------
  private updateTimers(delta: number) {
    if (this.wideTimer > 0) {
      this.wideTimer -= delta;
      if (this.wideTimer <= 0) {
        this.paddle.mesh.scale.x = 1;
        this.paddle.box.setFromObject(this.paddle.mesh);
      }
    }
    if (this.speedTimer > 0) {
      this.speedTimer -= delta;
      if (this.speedTimer <= 0) {
        this.currentSpeed = GAME_CONFIG.BALL_INITIAL_SPEED;
        this.rescaleBallSpeeds();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Paddle update
  // -------------------------------------------------------------------------
  private updatePaddle(delta: number) {
    const cfg = GAME_CONFIG;
    const halfArena = cfg.ARENA_WIDTH / 2 - (cfg.PADDLE_WIDTH * this.paddle.mesh.scale.x) / 2;
    const p = this.paddle.mesh.position;

    if (this.keysDown.has('ArrowLeft'))  p.x -= cfg.PADDLE_SPEED * delta;
    if (this.keysDown.has('ArrowRight')) p.x += cfg.PADDLE_SPEED * delta;

    p.x = THREE.MathUtils.clamp(p.x, -halfArena, halfArena);
    this.paddle.box.setFromObject(this.paddle.mesh);

    // Unlaunch balls sitting on paddle follow it
    for (const ball of this.balls) {
      if (!ball.launched) {
        ball.mesh.position.x = p.x;
        ball.box.setFromObject(ball.mesh);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Ball update
  // -------------------------------------------------------------------------
  private updateBalls(delta: number) {
    const cfg = GAME_CONFIG;
    const halfW = cfg.ARENA_WIDTH  / 2 - cfg.BALL_RADIUS;
    const halfH = cfg.ARENA_HEIGHT / 2 - cfg.BALL_RADIUS;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (!ball.launched) continue;

      ball.mesh.position.addScaledVector(ball.velocity, delta);

      // Wall collisions
      if (ball.mesh.position.x < -halfW) {
        ball.mesh.position.x = -halfW;
        ball.velocity.x = Math.abs(ball.velocity.x);
        this.playBeep(440, 0.05, 0.3);
      }
      if (ball.mesh.position.x > halfW) {
        ball.mesh.position.x = halfW;
        ball.velocity.x = -Math.abs(ball.velocity.x);
        this.playBeep(440, 0.05, 0.3);
      }
      if (ball.mesh.position.y > halfH) {
        ball.mesh.position.y = halfH;
        ball.velocity.y = -Math.abs(ball.velocity.y);
        this.playBeep(440, 0.05, 0.3);
      }

      ball.box.setFromObject(ball.mesh);

      // Paddle collision
      if (ball.velocity.y < 0 && ball.box.intersectsBox(this.paddle.box)) {
        const effectiveHalfW = (GAME_CONFIG.PADDLE_WIDTH * this.paddle.mesh.scale.x) / 2;
        const hitPos = (ball.mesh.position.x - this.paddle.mesh.position.x) / effectiveHalfW;
        ball.velocity.y = Math.abs(ball.velocity.y);
        ball.velocity.x += hitPos * cfg.BALL_INFLUENCE_FACTOR;
        const speed = ball.velocity.length();
        ball.velocity.normalize().multiplyScalar(speed);
        // Push ball above paddle
        ball.mesh.position.y = cfg.PADDLE_Y + cfg.PADDLE_HEIGHT / 2 + cfg.BALL_RADIUS + cfg.BALL_PADDLE_CLEARANCE;
        ball.box.setFromObject(ball.mesh);
        this.playBeep(440, 0.05, 0.3);
      }

      // Out of bounds — lose a life
      if (ball.mesh.position.y < cfg.PADDLE_Y - 2) {
        this.scene.remove(ball.mesh);
        ball.mesh.geometry.dispose();
        (ball.mesh.material as THREE.MeshStandardMaterial).dispose();
        this.balls.splice(i, 1);

        if (this.balls.length === 0) {
          this.lives--;
          this.shakeTimer = GAME_CONFIG.SHAKE_DURATION;
          this.playBeep(150, 0.4, 0.6);
          this.updateHUD();

          if (this.lives <= 0) {
            this.phase = GamePhase.GAME_OVER;
            this.showGameOverOverlay();
            return;
          }
          this.spawnBallOnPaddle();
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Block collisions
  // -------------------------------------------------------------------------
  private checkBlockCollisions() {
    for (const ball of this.balls) {
      if (!ball.launched) continue;
      let hitThisFrame = false;

      for (let i = this.blocks.length - 1; i >= 0; i--) {
        if (hitThisFrame) break;
        const block = this.blocks[i];
        if (!ball.box.intersectsBox(block.box)) continue;

        hitThisFrame = true;
        this.playBeep(300, 0.08, 0.4);
        this.score += 10;

        const dxOverlap = Math.min(
          ball.box.max.x - block.box.min.x,
          block.box.max.x - ball.box.min.x,
        );
        const dyOverlap = Math.min(
          ball.box.max.y - block.box.min.y,
          block.box.max.y - ball.box.min.y,
        );
        if (dxOverlap < dyOverlap) {
          ball.velocity.x = -ball.velocity.x;
        } else {
          ball.velocity.y = -ball.velocity.y;
        }

        block.hp--;

        if (block.hp > 0) {
          (block.mesh.material as THREE.MeshStandardMaterial).color.setHex(this.hpColor(block.hp));
        } else {
          // Spawn power-up?
          if (Math.random() < GAME_CONFIG.POWERUP_DROP_CHANCE) {
            this.spawnPowerUp(block.mesh.position.clone(), this.randomPowerUpType());
          }
          // Dying animation
          this.blocks.splice(i, 1);
          this.dyingBlocks.push({ mesh: block.mesh, timer: GAME_CONFIG.DYING_BLOCK_DURATION });
          // geometry and material disposed in updateDyingBlocks after animation finishes
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Dying block animation
  // -------------------------------------------------------------------------
  private updateDyingBlocks(delta: number) {
    for (let i = this.dyingBlocks.length - 1; i >= 0; i--) {
      const db = this.dyingBlocks[i];
      db.timer -= delta;
      const t = Math.max(0, db.timer / GAME_CONFIG.DYING_BLOCK_DURATION);
      db.mesh.scale.setScalar(t);
      if (db.timer <= 0) {
        this.scene.remove(db.mesh);
        db.mesh.geometry.dispose();
        (db.mesh.material as THREE.MeshStandardMaterial).dispose();
        this.dyingBlocks.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Power-ups
  // -------------------------------------------------------------------------
  private randomPowerUpType(): PowerUpType {
    const types = Object.values(PowerUpType) as PowerUpType[];
    return types[Math.floor(Math.random() * types.length)];
  }

  private spawnPowerUp(position: THREE.Vector3, type: PowerUpType) {
    const cfg = GAME_CONFIG;
    const color = this.powerUpColor(type);
    const geo = new THREE.BoxGeometry(cfg.POWERUP_GEO_W, cfg.POWERUP_GEO_H, cfg.POWERUP_GEO_D);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.powerUps.push({ mesh, box: new THREE.Box3().setFromObject(mesh), type });
  }

  private updatePowerUps(delta: number) {
    const cfg = GAME_CONFIG;
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      pu.mesh.position.y -= cfg.POWERUP_FALL_SPEED * delta;
      pu.mesh.rotation.y += delta * 2;
      pu.box.setFromObject(pu.mesh);

      if (pu.box.intersectsBox(this.paddle.box)) {
        this.applyPowerUp(pu.type);
        this.scene.remove(pu.mesh);
        pu.mesh.geometry.dispose();
        (pu.mesh.material as THREE.MeshStandardMaterial).dispose();
        this.powerUps.splice(i, 1);
        continue;
      }

      if (pu.mesh.position.y < cfg.PADDLE_Y - 3) {
        this.scene.remove(pu.mesh);
        pu.mesh.geometry.dispose();
        (pu.mesh.material as THREE.MeshStandardMaterial).dispose();
        this.powerUps.splice(i, 1);
      }
    }
  }

  private applyPowerUp(type: PowerUpType) {
    this.score += 50;
    this.playBeep(880, 0.15, 0.5);
    const cfg = GAME_CONFIG;

    switch (type) {
      case PowerUpType.WIDE_PADDLE:
        this.paddle.mesh.scale.x = GAME_CONFIG.WIDE_PADDLE_SCALE;
        this.paddle.box.setFromObject(this.paddle.mesh);
        this.wideTimer = cfg.POWERUP_WIDE_DURATION;
        break;

      case PowerUpType.MULTI_BALL: {
        // Clone launched balls with spread angles
        const existing = this.balls.filter(b => b.launched);
        const source = existing.length > 0 ? existing[0] : null;
        if (source) {
          for (let a = -0.4; a <= 0.41; a += 0.4) {
            if (Math.abs(a) < 0.01) continue;
            const nx = source.velocity.x + a * this.currentSpeed;
            const ny = source.velocity.y;
            const vel = new THREE.Vector3(nx, ny, 0).normalize().multiplyScalar(this.currentSpeed);
            const geo = new THREE.SphereGeometry(cfg.BALL_RADIUS, 16, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.castShadow = true;
            mesh.position.copy(source.mesh.position);
            this.scene.add(mesh);
            this.balls.push({
              mesh,
              box: new THREE.Box3().setFromObject(mesh),
              velocity: vel,
              launched: true,
            });
          }
        }
        break;
      }

      case PowerUpType.FAST_BALL:
        this.currentSpeed = cfg.BALL_SPEED_FAST;
        this.speedTimer = cfg.POWERUP_FAST_DURATION;
        this.rescaleBallSpeeds();
        break;

      case PowerUpType.SLOW_BALL:
        this.currentSpeed = cfg.BALL_SPEED_SLOW;
        this.speedTimer = cfg.POWERUP_SLOW_DURATION;
        this.rescaleBallSpeeds();
        break;
    }
  }

  private hpColor(hp: number): number {
    if (hp >= 3) return 0xff2244;
    if (hp === 2) return 0xffaa00;
    return 0x44ff88;
  }

  private powerUpColor(type: PowerUpType): number {
    const colors: Record<PowerUpType, number> = {
      WIDE_PADDLE: 0x00ccff,
      MULTI_BALL:  0xffff00,
      FAST_BALL:   0xff6600,
      SLOW_BALL:   0x9900ff,
    };
    return colors[type];
  }

  private rescaleBallSpeeds() {
    for (const ball of this.balls) {
      if (ball.launched && ball.velocity.lengthSq() > 0) {
        ball.velocity.normalize().multiplyScalar(this.currentSpeed);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Audio
  // -------------------------------------------------------------------------
  private initAudio() {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch {
        // AudioContext not available
      }
    }
  }

  private playBeep(freq: number, duration: number, vol: number) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.frequency.value = freq;
      osc.type = 'square';
      gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.start(this.audioCtx.currentTime);
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // ignore audio errors
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private resetBalls() {
    for (const ball of this.balls) {
      this.scene.remove(ball.mesh);
      ball.mesh.geometry.dispose();
      (ball.mesh.material as THREE.MeshStandardMaterial).dispose();
    }
    this.balls = [];

    // Clear power-ups too
    for (const pu of this.powerUps) {
      this.scene.remove(pu.mesh);
      pu.mesh.geometry.dispose();
      (pu.mesh.material as THREE.MeshStandardMaterial).dispose();
    }
    this.powerUps = [];

    // Reset paddle scale
    this.paddle.mesh.scale.x = 1;
    this.wideTimer = 0;
    this.speedTimer = 0;
    this.currentSpeed = GAME_CONFIG.BALL_INITIAL_SPEED;

    this.spawnBallOnPaddle();
  }

  private restartGame() {
    this.score = 0;
    this.lives = GAME_CONFIG.LIVES_START;
    this.level = 1;

    // Clear dying blocks
    for (const db of this.dyingBlocks) {
      this.scene.remove(db.mesh);
      (db.mesh.material as THREE.MeshStandardMaterial).dispose();
    }
    this.dyingBlocks = [];

    this.buildLevel(this.level);
    this.resetBalls();
    this.showOverlay(false);
    this.phase = GamePhase.PLAYING;
    this.updateHUD();
  }

  private showOverlay(visible: boolean, html?: string) {
    if (html !== undefined) {
      this.overlayEl.innerHTML = '';
      this.overlayEl.insertAdjacentHTML('beforeend', html);
    }
    if (visible) {
      this.overlayEl.classList.remove('hidden');
    } else {
      this.overlayEl.classList.add('hidden');
    }
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------
  private attachEvents() {
    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.renderer.domElement.addEventListener('mousemove', this._onMouseMove);
    this.renderer.domElement.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.renderer.domElement.addEventListener('click', this._onLaunch);
    this.renderer.domElement.addEventListener('touchend', this._onLaunch);
  }

  private onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keysDown.add(e.code);
    if (e.code === 'Space') {
      e.preventDefault();
      this.tryLaunch();
    }
  }

  private clientXToWorldX(clientX: number): number {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const halfFovY = (this.camera.fov / 2) * (Math.PI / 180);
    const halfH = Math.tan(halfFovY) * this.camera.position.z;
    const halfW = halfH * this.camera.aspect;
    return ndcX * halfW;
  }

  private onMouseMove(e: MouseEvent) {
    if (this.phase !== GamePhase.PLAYING) return;
    const worldX = this.clientXToWorldX(e.clientX);
    const effectiveHalfW = (GAME_CONFIG.PADDLE_WIDTH * this.paddle.mesh.scale.x) / 2;
    const halfArena = GAME_CONFIG.ARENA_WIDTH / 2 - effectiveHalfW;
    this.paddle.mesh.position.x = THREE.MathUtils.clamp(worldX, -halfArena, halfArena);
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (this.phase !== GamePhase.PLAYING) return;
    const touch = e.touches[0];
    const worldX = this.clientXToWorldX(touch.clientX);
    const effectiveHalfW = (GAME_CONFIG.PADDLE_WIDTH * this.paddle.mesh.scale.x) / 2;
    const halfArena = GAME_CONFIG.ARENA_WIDTH / 2 - effectiveHalfW;
    this.paddle.mesh.position.x = THREE.MathUtils.clamp(worldX, -halfArena, halfArena);
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  destroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.renderer.domElement.removeEventListener('mousemove', this._onMouseMove);
    this.renderer.domElement.removeEventListener('touchmove', this._onTouchMove);
    this.renderer.domElement.removeEventListener('click', this._onLaunch);
    this.renderer.domElement.removeEventListener('touchend', this._onLaunch);

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
    if (this.overlayEl.parentElement) this.container.removeChild(this.overlayEl);
    if (this.hudEl.parentElement)     this.container.removeChild(this.hudEl);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
const appEl = document.getElementById('app');
if (!appEl) throw new Error('#app element not found');
new BlockBreakerGame(appEl);
