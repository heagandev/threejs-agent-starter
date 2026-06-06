# Three.js Game Dev Starter Pack — Asteroids 3D

**A fully playable Asteroids clone — built from the starter kit using the `/plan` prompt and a single agent session.**

Clone it, run it, and extend it with your agent. Or use it as a reference for building your own game from scratch.

![Asteroids 3D gameplay](public/asteroids.png)
[**▶ Play Asteroids 3D**](https://heagandev.github.io/threejs-agent-starter/asteroids/)


---

> 🚀 **Pro Kit — coming soon**
> React Three Fiber architecture, real project structure, case study branches, and a Vercel-ready deploy. Subscribe on Gumroad to get notified when it drops + lock in launch pricing.
> [→ Subscribe for early access](https://heagandev.gumroad.com)

---

## What's Inside

| | |
|---|---|
| 🎮 | **Asteroids 3D** — ship, bullets, asteroid splitting, waves, lives, score |
| 🧠 | **11 Three.js skill files** your agent loads automatically — no explaining Three.js every session |
| 📋 | **Prompt files** to extend the game feature by feature |
| 📐 | **`AGENTS.md`** — architecture rules that keep your agent on track |
| 🌿 | **`new-game` branch** — blank canvas + `/plan` prompt to design your own game from scratch |

---

## Quickstart

```bash
git clone https://github.com/heagandev/threejs-agent-starter
cd threejs-agent-starter
git checkout asteroids
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the game runs immediately.

Controls: `A`/`D` rotate · `W` thrust · `S` brake · `Space` fire

---

## How This Was Built

This branch was built from [`new-game`](../../tree/new-game) using the `/plan` prompt and a single agent session. That's the whole workflow — and it's exactly what you can do:

```bash
git checkout new-game
git checkout -b my-game
# Open your agent, paste prompts/plan.md, describe your game
# One session later — a playable game exists
```

One branch per game. One agent session per feature.

---

## Building With Your Agent

This kit works with any AI coding agent — Claude Code, Codex, Cursor, Windsurf, Copilot, or any tool that reads files from your repo.

Paste any prompt file into your agent to add a feature:

| Prompt | What it builds |
|---|---|
| `/plan` | Plan a new game from scratch |
| `/power-ups` | Add a power-up system |
| `/game-juice` | Screen shake, squash/stretch, score milestones |

**Recommended workflow:**

```bash
# Start a new feature on its own branch
git checkout -b feat/power-ups

# Paste prompts/power-ups.md into your agent
# Review the output, run it, commit when it works
git add -A && git commit -m "feat: add power-up system"
```

Your agent reads `AGENTS.md` automatically and follows the architecture rules — no extra setup needed.

---

## Skills

The `skills/` folder contains Three.js reference sheets. Your agent loads them automatically via `AGENTS.md` — you don't need to explain Three.js in every prompt.

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
| `threejs-game.md` | Game loop, input, collision, HUD, audio, game-feel patterns |

---

## Stack

- [Vite](https://vitejs.dev/) — build tool
- [Three.js](https://threejs.org/) — 3D rendering
- TypeScript — type safety

---

## License

MIT — free to use, extend, and ship.

---

---

## Open Source & Community

This project is open source (MIT) and actively maintained. New games, prompts, and skills ship regularly — built by me and contributed by the community.

**Ways to get involved:**

- ⭐ **Star the repo** — helps others find it
- 💬 **[Join the discussion](https://github.com/heagandev/threejs-agent-starter/discussions)** — share what you built, ask questions, suggest ideas
- 🎮 **[Suggest a game](https://github.com/heagandev/threejs-agent-starter/issues/new?template=suggest-a-game.md)** — vote or propose the next branch
- 🔀 **[Contribute](CONTRIBUTING.md)** — add a game branch, a prompt file, or a skill file

**What's coming:**
- More game branches (each built live with an AI agent)
- More prompt files for common features and mechanics
- More Three.js skill files for advanced topics

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit a game, prompt, or skill.

---

## Want More?

This is the free starter. Here's what the paid kits add:

| Kit | What you get | Price |
|---|---|---|
| **Pro Kit** | React Three Fiber architecture, real project structure, case study branches, Vercel deploy | $49 at launch → $79 |
| **Pro Plus** | Everything in Pro + ESLint/Husky guardrails, AI memory system, advanced prompts | $79 at launch → $99 |

[→ See all kits on Gumroad](https://heagandev.gumroad.com)