#!/usr/bin/env node
/**
 * capture-game.mjs
 *
 * Records a smooth MP4 preview of a game running on localhost.
 * Uses Playwright's built-in recordVideo (WebM → MP4 via ffmpeg).
 * No manual frame loop — browser renders at native speed, Playwright
 * records the canvas, ffmpeg converts the output.
 *
 * Usage:
 *   npm run dev &
 *   npm run capture -- --game cube-runner
 *   npm run capture -- --game asteroids
 *   npm run capture -- --game block-breaker
 *   npm run capture:compile   # stitch all three into thumbnail.mp4
 *
 * Options:
 *   --game      Game branch name: cube-runner | asteroids | block-breaker
 *               Loads per-game input sequence automatically.
 *   --url       Dev server URL          (default: http://localhost:5173)
 *   --out       Output MP4 path         (default: public/<game>.mp4)
 *   --duration  Recording duration secs (default: 12)
 *   --width     Viewport width          (default: 960)
 *   --height    Viewport height         (default: 600)
 *
 * Compile mode (stitch all games into one MP4 for new-game branch):
 *   npm run capture:compile
 *   # Expects public/cube-runner.mp4, public/asteroids.mp4, public/block-breaker.mp4
 *   # Outputs public/thumbnail.mp4
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = resolve(__dirname, '..');

// ─── Playwright / Chromium paths (uses Hermes install, no extra deps) ─────────
const HERMES_MODULES = '/home/hdev/.hermes/hermes-agent/node_modules';
const CHROMIUM_BIN   = '/home/hdev/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';

// ─── Per-game input sequences ─────────────────────────────────────────────────
// Each step: { type, key?, delay } where type = 'wait' | 'key' | 'hold' | 'release'
// 'hold' presses and holds a key; 'release' lets it go; 'wait' pauses (ms).
const GAME_SEQUENCES = {
  'cube-runner': [
    { type: 'wait',  delay: 1500 },               // let menu render
    { type: 'key',   key: 'Space' },               // start game
    { type: 'wait',  delay: 1000 },               // gameplay begins
    { type: 'hold',  key: 'ArrowLeft' },
    { type: 'wait',  delay: 800 },
    { type: 'release', key: 'ArrowLeft' },
    { type: 'wait',  delay: 600 },
    { type: 'hold',  key: 'ArrowRight' },
    { type: 'wait',  delay: 700 },
    { type: 'release', key: 'ArrowRight' },
    // keep weaving for remainder of recording
    { type: 'wait',  delay: 500 }, { type: 'hold', key: 'ArrowLeft' },
    { type: 'wait',  delay: 600 }, { type: 'release', key: 'ArrowLeft' },
    { type: 'wait',  delay: 400 }, { type: 'hold', key: 'ArrowRight' },
    { type: 'wait',  delay: 800 }, { type: 'release', key: 'ArrowRight' },
    { type: 'wait',  delay: 400 }, { type: 'hold', key: 'ArrowLeft' },
    { type: 'wait',  delay: 700 }, { type: 'release', key: 'ArrowLeft' },
    { type: 'wait',  delay: 500 }, { type: 'hold', key: 'ArrowRight' },
    { type: 'wait',  delay: 600 }, { type: 'release', key: 'ArrowRight' },
  ],

  'asteroids': [
    { type: 'wait',  delay: 1500 },
    { type: 'key',   key: 'Space' },               // start game
    { type: 'wait',  delay: 800 },
    { type: 'key',   key: 'Space' },               // fire
    { type: 'hold',  key: 'ArrowLeft' },
    { type: 'wait',  delay: 600 },
    { type: 'release', key: 'ArrowLeft' },
    { type: 'hold',  key: 'ArrowUp' },             // thrust
    { type: 'wait',  delay: 500 },
    { type: 'key',   key: 'Space' },               // fire
    { type: 'wait',  delay: 300 },
    { type: 'key',   key: 'Space' },
    { type: 'release', key: 'ArrowUp' },
    { type: 'wait',  delay: 400 },
    { type: 'hold',  key: 'ArrowRight' },
    { type: 'wait',  delay: 700 },
    { type: 'key',   key: 'Space' },
    { type: 'release', key: 'ArrowRight' },
    { type: 'hold',  key: 'ArrowUp' },
    { type: 'wait',  delay: 800 },
    { type: 'key',   key: 'Space' },
    { type: 'wait',  delay: 400 },
    { type: 'key',   key: 'Space' },
    { type: 'release', key: 'ArrowUp' },
    { type: 'wait',  delay: 500 },
    { type: 'hold',  key: 'ArrowLeft' },
    { type: 'wait',  delay: 600 },
    { type: 'key',   key: 'Space' },
    { type: 'release', key: 'ArrowLeft' },
  ],

  'block-breaker': [
    { type: 'wait',  delay: 1500 },
    { type: 'key',   key: 'Space' },               // start / launch ball
    { type: 'wait',  delay: 800 },
    { type: 'hold',  key: 'ArrowRight' },
    { type: 'wait',  delay: 600 },
    { type: 'release', key: 'ArrowRight' },
    { type: 'hold',  key: 'ArrowLeft' },
    { type: 'wait',  delay: 800 },
    { type: 'release', key: 'ArrowLeft' },
    { type: 'hold',  key: 'ArrowRight' },
    { type: 'wait',  delay: 700 },
    { type: 'release', key: 'ArrowRight' },
    { type: 'hold',  key: 'ArrowLeft' },
    { type: 'wait',  delay: 500 },
    { type: 'release', key: 'ArrowLeft' },
    { type: 'hold',  key: 'ArrowRight' },
    { type: 'wait',  delay: 900 },
    { type: 'release', key: 'ArrowRight' },
    { type: 'hold',  key: 'ArrowLeft' },
    { type: 'wait',  delay: 600 },
    { type: 'release', key: 'ArrowLeft' },
  ],
};

// ─── Parse args ───────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const get    = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const has    = (flag) => args.includes(flag);

// ─── Compile mode ─────────────────────────────────────────────────────────────
if (has('--compile')) {
  const clips = ['public/cube-runner.mp4', 'public/asteroids.mp4', 'public/block-breaker.mp4']
    .map(f => resolve(REPO_ROOT, f));
  const out = resolve(REPO_ROOT, get('--out', 'public/thumbnail.mp4'));
  compileClips(clips, out);
  process.exit(0);
}

// ─── Main record mode ─────────────────────────────────────────────────────────
const GAME     = get('--game', null);
const URL      = get('--url', 'http://localhost:5173');
const DURATION = parseFloat(get('--duration', '12')) * 1000; // ms
const WIDTH    = parseInt(get('--width', '960'));
const HEIGHT   = parseInt(get('--height', '600'));
const OUT      = resolve(REPO_ROOT, get('--out', GAME ? `public/${GAME}.mp4` : 'public/preview.mp4'));

if (!GAME || !GAME_SEQUENCES[GAME]) {
  console.error(`❌ --game required. Valid options: ${Object.keys(GAME_SEQUENCES).join(' | ')}`);
  process.exit(1);
}

// ─── Dependency checks ────────────────────────────────────────────────────────
try { execSync('which ffmpeg', { stdio: 'ignore' }); }
catch { console.error('❌ ffmpeg not found. Install: sudo apt install ffmpeg'); process.exit(1); }

if (!existsSync(CHROMIUM_BIN)) {
  console.error(`❌ Chromium not found at ${CHROMIUM_BIN}`);
  process.exit(1);
}

// ─── Record ───────────────────────────────────────────────────────────────────
const { chromium } = await import(`${HERMES_MODULES}/playwright/index.mjs`);

const TMP_DIR = join(os.tmpdir(), `game-capture-${Date.now()}`);
mkdirSync(TMP_DIR, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

console.log(`🎬  Recording: ${GAME}`);
console.log(`    URL      : ${URL}`);
console.log(`    Size     : ${WIDTH}×${HEIGHT}`);
console.log(`    Duration : ${DURATION / 1000}s`);
console.log(`    Output   : ${OUT}`);

const browser = await chromium.launch({
  executablePath: CHROMIUM_BIN,
  args: ['--enable-gpu', '--use-gl=egl', '--disable-gpu-sandbox', '--no-sandbox'],
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  recordVideo: {
    dir: TMP_DIR,
    size: { width: WIDTH, height: HEIGHT },
  },
});

const page = await context.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });

// ─── Run input sequence ───────────────────────────────────────────────────────
console.log(`    Running input sequence for ${GAME}...`);
const sequence = GAME_SEQUENCES[GAME];
const held = new Set();

for (const step of sequence) {
  switch (step.type) {
    case 'wait':
      await page.waitForTimeout(step.delay);
      break;
    case 'key':
      await page.keyboard.press(step.key);
      break;
    case 'hold':
      if (!held.has(step.key)) {
        await page.keyboard.down(step.key);
        held.add(step.key);
      }
      break;
    case 'release':
      if (held.has(step.key)) {
        await page.keyboard.up(step.key);
        held.delete(step.key);
      }
      break;
  }
}

// Wait out the remaining duration
const sequenceDuration = sequence.reduce((acc, s) => acc + (s.delay || 0), 0);
const remaining = DURATION - sequenceDuration;
if (remaining > 0) await page.waitForTimeout(remaining);

// Release any still-held keys cleanly
for (const key of held) await page.keyboard.up(key);

// ─── Stop recording ───────────────────────────────────────────────────────────
const videoPath = await page.video().path();
await context.close();
await browser.close();

// ─── Convert WebM → MP4 ───────────────────────────────────────────────────────
console.log(`\n    Converting WebM → MP4...`);
execSync(
  `ffmpeg -y -i "${videoPath}" ` +
  `-vf "scale=${WIDTH}:-2:flags=lanczos" ` +
  `-c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart -an ` +
  `"${OUT}"`,
  { stdio: 'inherit' }
);

rmSync(TMP_DIR, { recursive: true, force: true });
const size = execSync(`du -sh "${OUT}"`).toString().split('\t')[0];
console.log(`\n✅  Done! ${OUT} (${size})`);

// ─── Compile helper ───────────────────────────────────────────────────────────
function compileClips(clips, out) {
  const missing = clips.filter(f => !existsSync(f));
  if (missing.length) {
    console.error('❌ Missing clips:', missing.map(f => f.replace(REPO_ROOT + '/', '')));
    process.exit(1);
  }
  const inputs = clips.flatMap(f => ['-i', `"${f}"`]).join(' ');
  const n = clips.length;
  const filterComplex =
    clips.map((_, i) => `[${i}:v]scale=960:-2:flags=lanczos[v${i}]`).join(';') + ';' +
    clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[out]`;

  console.log(`🎬  Compiling ${n} clips → ${out.replace(REPO_ROOT + '/', '')}`);
  execSync(
    `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" ` +
    `-c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart -an "${out}"`,
    { stdio: 'inherit' }
  );
  const size = execSync(`du -sh "${out}"`).toString().split('\t')[0];
  console.log(`✅  Done! ${out.replace(REPO_ROOT + '/', '')} (${size})`);
}
