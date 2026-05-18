# /plan — Design Your Game

Read `AGENTS.md` fully before starting. Load `skills/threejs-game.md`.

---

## What This Prompt Does

`/plan` is a **planning-only session**. It produces a structured game plan as a markdown document.
No code is written. No files are modified except to save the plan output.

Use it before any build session — the plan becomes the brief for your first feature prompt.

---

## Instructions for the Agent

Ask the developer the following questions **one group at a time**. Wait for their response before
moving to the next group. Do not ask all questions at once.

---

### Group 1 — Core Concept

1. What is the game? Describe it in one or two sentences.
2. What does the player control, and how do they control it?
3. What is the goal? What ends the game?

---

### Group 2 — Gameplay Loop

4. How does difficulty progress? (speed ramp, enemy waves, procedural generation, timer pressure?)
5. Are there power-ups, collectibles, or special mechanics beyond the core loop?
6. Is it endless, level-based, or does it have a defined end?

---

### Group 3 — Feel & Style

7. What should it feel like to play? (tense and fast, relaxed, punishing, arcadey, satisfying combos?)
8. Any visual style reference? (minimalist, neon, retro pixel, clean geometric, dark/moody?)
9. What one or two moments should feel especially good — the hit that matters, the close call, the reward?

---

## Output Format

Once you have all answers, produce a **Game Plan** document with the following sections.
Output only — do not write any code or modify any source file.

---

### Game Plan: [Game Name]

**Pitch** — One sentence. What is this game?

**Player controls**

| Key / Input | Action |
|---|---|
| ... | ... |

**Game phases**

| Phase | Triggered by |
|---|---|
| `MENU` | ... |
| `PLAYING` | ... |
| `GAME_OVER` | ... |

**GAME_CONFIG keys** — list every tunable value the game will need (name + initial value).

**Feature build order** — ordered checklist from core loop to polish. Each item should be
completable in a single agent session.

- [ ] Scene setup + player object
- [ ] Core movement / input
- [ ] Core mechanic (e.g. shooting, bouncing, dodging)
- [ ] Win / lose condition + game-over screen
- [ ] Difficulty progression
- [ ] Score / HUD
- [ ] Sound effects (Web Audio beeps — no assets needed)
- [ ] Mobile touch controls
- [ ] Game feel: screen shake, squash-stretch, particle bursts
- [ ] Power-ups or special mechanic (if applicable)

**First branch name** — `feat/<slug>` — what to build first after the base game runs.

**Suggested commit message** for the initial build session.

---

## After the Plan

Share the plan with the developer. When they approve it, the next step is a build session using the
plan as the brief. The first build session should target only the first 4–5 items on the feature
checklist — enough to have a playable loop running.
