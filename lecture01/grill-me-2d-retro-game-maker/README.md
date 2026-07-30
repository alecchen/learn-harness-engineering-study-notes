# Retro Game Maker — Grill & Build Record

**Session:** 2026-07-30

## Starting prompt

```
/grill-me I want to build a 2d-retro-game-maker, user can edit the character, level,
interaction with pixel (block) based editor, after finish design, review with
frontend-design skill, and run a validation tool to prove it's working, for example,
a html based solution, using playwright or Puppeteer to interact with it, it should
be playable, if one iteration can't finish, break down the plan into several stages
and add a todo list to follow up
```

---

## Iteration 1 — MVP game + editor + tests

**Total work time:** 9m 54s
**Input tokens:** 690.3K | **Output tokens:** 55.3K
**Cache hit:** 85.9% | **Cost:** $0.12 (LiteLLM, deepseek-v4-flash)

### Grilled Decisions

| Question | Decision |
|---|---|
| Game genre | Mario-like platformer |
| Retro era | NES (256x240, 16x16 tiles) |
| Output format | Single self-contained HTML file |
| Editor + Game | Same file, toggle between modes |
| Editor UX | Grid-based tile picker + click-to-place |
| Sprite editor | Deferred to next iteration (hard-coded sprite now) |
| Mode switch | Toggle button (Edit / Play) |
| Controls | Arrow keys / WASD + Space to jump |

### Tile palette (MVP)

Ground, Brick, Question Block, Pipe, Player Spawn, Enemy Spawn, Goal Flag, Eraser

### Built

- **game.html** — single HTML file with edit mode (30x15 tile grid, 8-tool palette) and play mode (physics, collisions, enemy AI, goal, death/respawn)
- **tests/validation.spec.ts** — 13 Playwright tests

### Quick fixes

- **Space toggles button bug** — Toggle button held focus after click, so pressing Space (jump) triggered another click. Fixed with `toggleBtn.blur()` and `e.preventDefault()` on Space in play mode.
- **Browser reload bug** — Ctrl+R handler only matched lowercase `r` and didn't re-sync game state after reset. Fixed by handling both `r` and `R` and calling `resetGame()` + `buildToolbar()` after `initLevel()`.
- **Out-of-bounds ground bug** — `getTile` returned `TILE.GROUND` for out-of-bounds tiles, so falling past row 14 landed on virtual ground instead of dying. Fixed by returning `TILE.EMPTY` for OOB.

---

## Iteration 2 — Question block + mushroom + power-up

**Prompt:** *"the '?' block is normal block? can I jump and hit it, then it popup a mushroom, the character to touch it, the mushroom gone and character go bigger, like mario game?"*

**Total work time:** 25m 31s
**Input tokens:** 3.4M | **Output tokens:** 183.9K
**Cache hit:** 87% | **Cost:** $0.59 (LiteLLM, deepseek-v4-flash)

### Why iteration 2 took 25 minutes — the debugging spiral

What should have been a straightforward feature turned into a chain of ~10 test-push-debug cycles because of a subtle root cause that expressed itself differently at each layer:

#### The collision bug

When the player stands on the ground and jumps, the **feet overlap the ground tile** for the first frame of the jump. The original `collides()` function checked ALL overlapping tiles, found the ground at the feet, and treated it as a **head hit** (`vy < 0` → "you hit something above") — canceling the jump entirely. The player never left the ground.

#### How it looked in tests

Every test that modified the ground level failed — the player couldn't jump:
- Placing ground at row 12 instead of rows 13-14 shifted the collision boundary differently.
- Adding intermediate platforms for the player to land on blocked the jump from below.
- Building stairs or multi-level structures to reach the question block all failed because the player couldn't even start jumping.

Each test failure triggered a new debugging attempt — different tile placements, different keys (Space vs ArrowUp), different level layouts — all chasing the same root cause.

#### The fix chain

1. **Separate head and feet collision** — split the Y collision into two checks: head (top row only, `vy < 0`) and feet (bottom row, `vy >= 0`). This prevented ground-at-feet from being treated as head hit.

2. **Stair-step ground detection** — the ground check used `(y + h) / T` to find the row below the player's feet. When ground was at row 12 instead of rows 13-14, this formula pointed at row 13 (empty), so the player fell through. Fixed by checking the row below the feet first, then falling back to the row the feet are inside.

3. **Keep the default level intact** — after many failed test setups that modified the ground layout, the final approach was to stop moving the ground and instead place question blocks within jump-reach above the default ground. This avoided all the ground-collision edge cases and made the tests reliable.

### What was built

- **Hit detection from below** — player's head collision separated from feet collision. Head check only looks at the top row of the player sprite.
- **Question block state** — `blockHit[][]` tracks which blocks have been used. Used blocks render as dark/empty.
- **Mushroom entity** — spawns from a hit question block, rises 24 frames (non-collectible while rising), then walks right at vx=2 with its own physics (gravity, wall bounce, ground collision).
- **Big player** — collecting a mushroom sets `player.big = true`, ups size to 14x24 with a taller sprite. Taking damage while big shrinks back to 12x16 with 90 frames of invincibility (blinking).
- **15 Playwright tests** — added 2 tests for question block hit detection and mushroom collection.

---

## Usage stats

| Metric | Iteration 1 | Iteration 2 (cumulative) |
|---|---|---|
| Input tokens | 690.3K | 3.4M |
| Output tokens | 55.3K | 183.9K |
| Cache hit | 85.9% | 87% |
| Cost | $0.12 | $0.59 |
| Work time | 9m 54s | 35m 25s |

## What's next

- Sprite pixel editor (deferred)
- Pipes (simplified to single-tile for MVP)
- Polish via frontend-design skill
