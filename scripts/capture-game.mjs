#!/usr/bin/env node
/**
 * capture-game.mjs
 *
 * Records a smooth MP4 preview of a game branch running on localhost.
 * Uses the Hermes playwright + chromium — no separate install needed.
 *
 * Usage:
 *   npm run dev &          # start the dev server first
 *   node scripts/capture-game.mjs [options]
 *
 * Options:
 *   --url       Dev server URL            (default: http://localhost:5173)
 *   --out       Output MP4 path           (default: public/<branch>.mp4)
 *   --duration  Recording duration (secs) (default: 10)
 *   --width     Viewport width            (default: 960)
 *   --height    Viewport height           (default: 600)
 *   --fps       Capture frame rate        (default: 30)
 *   --wait      Seconds to wait before recording (default: 2)
 *
 * Example:
 *   node scripts/capture-game.mjs --out public/cube-runner.mp4 --duration 12
 *
 * Compilation script (all branches → compilation MP4 for new-game):
 *   node scripts/capture-game.mjs --compile public/cube-runner.mp4 public/asteroids.mp4 public/block-breaker.mp4 --out public/thumbnail.mp4
 */

import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const has = (flag) => args.includes(flag);

// Compile mode: concatenate existing MP4s
if (has('--compile')) {
  const outFlag = args.indexOf('--out');
  const out = outFlag !== -1 ? args[outFlag + 1] : 'public/thumbnail.mp4';
  const inputs = args.slice(args.indexOf('--compile') + 1).filter(a => !a.startsWith('--') && a !== out);
  compileClips(inputs, out);
  process.exit(0);
}

const URL     = get('--url',      'http://localhost:5173');
const OUT     = resolve(REPO_ROOT, get('--out', 'public/preview.mp4'));
const DURATION = parseFloat(get('--duration', '10'));
const WIDTH   = parseInt(get('--width',  '960'));
const HEIGHT  = parseInt(get('--height', '600'));
const FPS     = parseInt(get('--fps',    '30'));
const WAIT    = parseFloat(get('--wait', '2'));

// ── Paths ─────────────────────────────────────────────────────────────────────
const HERMES_NODE = '/home/hdev/.hermes/hermes-agent/node_modules';
const CHROMIUM    = '/home/hdev/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const FRAMES_DIR  = join(os.tmpdir(), `game-capture-${Date.now()}`);

// ── Check dependencies ────────────────────────────────────────────────────────
try { execSync('which ffmpeg', { stdio: 'ignore' }); }
catch { console.error('❌ ffmpeg not found. Install with: sudo apt install ffmpeg'); process.exit(1); }

if (!existsSync(CHROMIUM)) {
  console.error(`❌ Chromium not found at ${CHROMIUM}`);
  console.error('   Run: npx playwright install chromium');
  process.exit(1);
}

// ── Dynamic import playwright from hermes ────────────────────────────────────
const { chromium } = await import(`${HERMES_NODE}/playwright/index.mjs`);

console.log(`🎬 Capturing ${URL} → ${OUT}`);
console.log(`   ${WIDTH}×${HEIGHT} @ ${FPS}fps for ${DURATION}s (${WAIT}s startup wait)`);

mkdirSync(FRAMES_DIR, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });

// ── Launch browser ────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: [
    '--enable-gpu',
    '--use-gl=egl',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
  headless: true,
});

const page = await browser.newPage();
await page.setViewportSize({ width: WIDTH, height: HEIGHT });

console.log(`   Loading ${URL}...`);
await page.goto(URL, { waitUntil: 'networkidle' });

// Dismiss any start screen by simulating a click + key press
await page.click('body').catch(() => {});
await page.keyboard.press('Space').catch(() => {});
await page.waitForTimeout(WAIT * 1000);

// ── Capture frames via RAF ────────────────────────────────────────────────────
const totalFrames = Math.ceil(DURATION * FPS);
const frameInterval = 1000 / FPS;

console.log(`   Capturing ${totalFrames} frames...`);

for (let i = 0; i < totalFrames; i++) {
  // Wait for next animation frame (synced to game render)
  await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

  const padded = String(i).padStart(5, '0');
  await page.screenshot({
    path: join(FRAMES_DIR, `frame${padded}.png`),
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });

  if (i % 30 === 0) process.stdout.write(`   ${i}/${totalFrames}\r`);
}

await browser.close();
console.log(`\n   Frames captured. Converting to MP4...`);

// ── Convert frames → MP4 via ffmpeg ──────────────────────────────────────────
const ffmpegCmd = [
  'ffmpeg', '-y',
  '-framerate', FPS,
  '-i', join(FRAMES_DIR, 'frame%05d.png'),
  '-vf', `scale=${WIDTH}:-2:flags=lanczos`,
  '-c:v', 'libx264',
  '-crf', '20',
  '-preset', 'slow',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-an',
  OUT,
].map(String);

execSync(ffmpegCmd.join(' '), { stdio: 'inherit' });

// ── Cleanup ───────────────────────────────────────────────────────────────────
rmSync(FRAMES_DIR, { recursive: true, force: true });

const size = (execSync(`du -sh ${OUT}`).toString().split('\t')[0]);
console.log(`\n✅ Done! ${OUT} (${size})`);
console.log(`   Add to README:\n   <video autoplay loop muted playsinline src="public/${OUT.split('/public/')[1]}"></video>`);

// ── Compile mode ─────────────────────────────────────────────────────────────
function compileClips(inputs, out) {
  if (!inputs.length) { console.error('No input files for --compile'); process.exit(1); }
  const resolvedInputs = inputs.map(f => resolve(REPO_ROOT, f));
  const missing = resolvedInputs.filter(f => !existsSync(f));
  if (missing.length) { console.error('Missing files:', missing); process.exit(1); }

  const inputArgs = resolvedInputs.flatMap(f => ['-i', f]);
  const filterComplex = resolvedInputs.map((_, i) => `[${i}:v]scale=960:-2:flags=lanczos[v${i}]`).join(';')
    + ';' + resolvedInputs.map((_, i) => `[v${i}]`).join('') + `concat=n=${resolvedInputs.length}:v=1:a=0[out]`;

  const cmd = [
    'ffmpeg', '-y',
    ...inputArgs,
    '-filter_complex', `"${filterComplex}"`,
    '-map', '"[out]"',
    '-c:v', 'libx264', '-crf', '20', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    resolve(REPO_ROOT, out),
  ].join(' ');

  console.log(`🎬 Compiling ${resolvedInputs.length} clips → ${out}`);
  execSync(cmd, { stdio: 'inherit' });
  console.log(`✅ Done! ${out}`);
}
