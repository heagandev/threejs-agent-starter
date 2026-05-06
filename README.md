# AI Game Dev Starter Pack

**A working Three.js browser game — ready to extend with any AI agent.**

Clone it. Run it. Paste a prompt. Start building.

No blank canvas. No setup friction. No fighting your AI to stay on track — the architecture rules and skill files are already wired in.

> 🚀 **Want the production-ready upgrade?**
> The **Pro Kit** gives you a full React Three Fiber architecture, real project structure, case study branches, and Vercel deploy — at launch pricing.
> [→ Get early access to the Pro Kit](https://heagan.dev) <!-- replace with Gumroad link -->

---

<!-- Replace with actual GIF or screenshot once ready -->
<!-- ![Cube Runner gameplay](./public/preview.gif) -->

---

## What's Inside

| | |
|---|---|
| 🎮 | **Cube Runner** — a fully playable dodge game, ready to extend |
| 🧠 | **10 Three.js skill files** your agent loads automatically |
| 📋 | **4 prompt files** to extend the game feature by feature |
| 📐 | **`AGENTS.md`** — architecture rules that keep your agent on track |
| 🌿 | **`tutorial/cube-runner-from-scratch` branch** — follow along building it from zero (YouTube) |

---

## Quickstart

```bash
git clone https://github.com/heagan/threejs-vite-starter
cd threejs-vite-starter
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the game runs immediately.

---

## Building With Your Agent

This kit is designed to work with any AI coding agent — Claude Code, Codex, Cursor, Windsurf, Copilot, or any tool that reads files from your repo.

Paste any prompt file into your agent to add a feature:

| Prompt | What it builds |
|---|---|
| `/power-ups` | Speed boost, shield, and slow-mo power-up system |
| `/game-juice` | Screen shake, squash/stretch, score milestones |
| `/level-two` | A second level with transitions |
| `/plan` | Plan an entirely new game from scratch |

**Recommended workflow:**

```bash
# Start a new feature on its own branch
git checkout -b feat/power-ups

# Paste prompts/power-ups.md into your agent
# Review the output, then commit when it works

git add -A && git commit -m "feat: add power-up system"
```

Your agent reads `AGENTS.md` automatically and follows the architecture rules — no extra setup needed.

---

## Skills

The `skills/` folder contains Three.js reference sheets. Your agent loads them via `AGENTS.md`, or you can reference them directly in any prompt.

| Skill | Covers |
|---|---|
| `threejs-fundamentals.md` | Scene, camera, renderer, transforms |
| `threejs-lighting.md` | Lights, shadows |
| `threejs-geometry.md` | Shapes, BufferGeometry |
| `threejs-interaction.md` | Input, raycasting |
| `threejs-animation.md` | Keyframes, procedural motion, spring physics |
| `threejs-materials.md` | Materials, PBR |
| `threejs-textures.md` | Texture loading, mapping |
| `threejs-shaders.md` | GLSL, ShaderMaterial |
| `threejs-postprocessing.md` | Bloom, effects |
| `threejs-loaders.md` | GLTF, asset loading |

---

## What to Build Next

Once you've run through the included prompts, here are directions worth exploring:

- **New game type** — use `/plan` to design something original with your agent
- **Mobile controls** — add touch/swipe input for mobile players
- **Leaderboard** — score submission with a simple backend
- **Custom shaders** — visual effects via `skills/threejs-shaders.md`
- **Spatial audio** — sound design with the Web Audio API
- **Level editor** — let players build their own obstacle layouts
- **Procedural generation** — infinite levels from a seed

Each one makes a great agent session. Open a branch, paste a prompt, review and commit.

---

## YouTube: Build It From Scratch

If you'd rather follow along and build Cube Runner from zero, check out the `tutorial/cube-runner-from-scratch` branch. That's the companion to the YouTube series — step by step, no shortcuts.

```bash
git checkout tutorial/cube-runner-from-scratch
```

---

## Stack

- [Vite](https://vitejs.dev/) — build tool
- [Three.js](https://threejs.org/) — 3D rendering
- TypeScript — type safety

---

## License

MIT — free to use, extend, and ship.

---

## Want More?

This is the free starter. Here's what the paid kits add:

| Kit | What you get | Price |
|---|---|---|
| **Pro Kit** | React Three Fiber architecture, real project structure, case study branches, Vercel deploy | $49 at launch → $79 |
| **Pro Plus** | Everything in Pro + ESLint/Husky guardrails, AI memory system, prompts to /10 | $79 at launch → $99 |

[→ Get early access and launch pricing at heagan.dev](https://heagan.dev) <!-- replace with Gumroad link -->
