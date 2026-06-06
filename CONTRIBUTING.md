# Contributing to Three.js Agent Starter

Thanks for wanting to contribute. This project grows through community games, prompts, and skills — all built with AI agents, all open source.

There are three ways to contribute:

| Type | What it is | Where it lives |
|---|---|---|
| **Game branch** | A complete playable game built from the starter | A named branch (e.g. `platformer`) |
| **Prompt file** | A task prompt an agent can follow to add a feature | `.agents/prompts/your-prompt.md` |
| **Skill file** | A Three.js reference sheet an agent loads automatically | `.agents/skills/your-skill.md` |

---

## Game Branches

Each game lives on its own branch, named after the game (e.g. `asteroids`, `block-breaker`, `fruit-ninja`). The `main` branch is the blank canvas — games are never merged into it.

**To add a game:**

```bash
git clone https://github.com/heagandev/threejs-agent-starter
cd threejs-agent-starter
git checkout new-game        # start from the blank canvas
git checkout -b your-game-name
# build your game using an AI agent
# open a PR when it's playable
```

**A game PR should:**
- [ ] Be fully playable from a fresh `npm install && npm run dev`
- [ ] Pass `npm run build` with no errors
- [ ] Follow the architecture rules in `AGENTS.md` (single class, config object, typed interfaces)
- [ ] Include a prompt file in `.agents/prompts/` that documents how you built or extended it
- [ ] Have a short description in the PR body (what's the game, how does it play)

---

## Prompt Files

Prompts are task instructions for an AI agent. They live in `.agents/prompts/` and cover one specific task — a feature, a mechanic, a polish pass.

Good prompts are:
- **Game-agnostic** — they work on any game built from this starter, not just one specific branch
- **Scoped** — one clear task, not a full rewrite
- **Executable** — an agent following the prompt should produce working code without extra guidance

See existing prompts in `.agents/prompts/` for the format and tone.

---

## Skill Files

Skills are reference sheets the agent loads to understand a Three.js topic. They live in `.agents/skills/` and are referenced in `AGENTS.md`.

Good skills are:
- **Focused** — one topic area (lighting, shaders, physics, etc.)
- **Concise** — the agent reads the whole file, so keep it under ~300 lines
- **Practical** — code patterns over prose explanations

---

## General Guidelines

- **One PR per contribution** — don't bundle a new game + new prompts + new skills into one PR
- **Keep `main` clean** — `main` is the blank canvas; PRs for games target their own branch
- **Test before you open a PR** — run `npm run build` and verify the game is playable
- **Use GitHub Discussions** for questions, ideas, or showcasing what you built before opening a PR

---

## Code Style

Follow the rules in `AGENTS.md`. The short version:

- Single top-level game class named after the game
- All config in `GAME_CONFIG` — no magic numbers
- TypeScript interfaces for all non-trivial objects
- `const` over `let` wherever possible
- Clean up listeners, animation frames, and Three.js objects in `destroy()`

---

## Questions?

Open a [Discussion](https://github.com/heagandev/threejs-agent-starter/discussions) — that's the right place for ideas, questions, and showing off what you built.
