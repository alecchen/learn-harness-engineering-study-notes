# Task 6 Report: Play Mode with Physics

**Status:** Done

**Branch:** task-6-play-mode (from head)

## Changes

### Modified: `index.html`

Added the full play mode engine to the game maker:

- **`playState`** and **`PHYS`** constants (lines 246-264) — player state, camera state, key input, and physics tuning constants (gravity, move speed, jump velocity, max fall speed, player hitbox dimensions).

- **Collision helpers** (lines 512-589):
  - `isSolidTile(col, row)` — checks if a tile is solid (> 0). Level sides are treated as boundaries; top/bottom edges are open for respawn.
  - `getPlayerBox()` — computes player bounding box in world coordinates from the hitbox offsets.
  - `resolveCollisionX()` — after horizontal movement, checks overlap with solid tiles on left/right edges and pushes player out. Iterates the full vertical range of the player to handle partial overlaps.
  - `resolveCollisionY()` — after vertical movement, checks overlap with tiles above/below. Sets `onGround = true` when landing on a solid surface. Includes edge detection: if the player was on ground and the tile below is no longer solid, `onGround` becomes false (player walks off a ledge).

- **`updatePlay()`** (lines 591-623) — physics step: reads `playState.keys`, applies horizontal movement (arrow keys + WASD), handles jump initiation with variable height (releasing the jump key cuts upward velocity), applies gravity (capped at MAX_FALL), runs X-then-Y collision resolution, respawns player if fallen below the level, and updates camera to follow the player (centered, clamped to level bounds).

- **`renderPlay(ctx)`** (lines 630-654) — sky blue background, camera translation, tile culling (only draws tiles within the viewport for performance), player sprite rendering at world position.

- **`modeInit.play`** (lines 656-687) — resets player position to `project.playerStart`, clears state, sets `running = true`, and shows control hints in the toolbar.

- **`renderCurrentMode` play branch** (line 904) — routes to `renderPlay(ctx)` when `currentMode === 'play'`.

- **SwitchMode cleanup** (lines 267-269) — sets `playState.running = false` when leaving play mode.

- **Global keyboard listeners** (lines 1059-1071) — `keydown`/`keyup` handlers that populate `playState.keys` using `e.code` (supports Arrow keys + WASD). Prevents default on arrow keys and space to avoid page scrolling.

- **`mainLoop()`** (lines 1073-1079) — 60fps `requestAnimationFrame` loop that calls `updatePlay()` then `renderCurrentMode()` when in active play mode.

## Testing

Manual test scenarios:

1. Switch to Play tab — sky blue background renders, ground tiles visible, player sprite appears at the set start position
2. Arrow keys / A/D — player moves left/right along solid tiles
3. Space / Up / W — player jumps with variable height (short tap = short hop, long press = full jump)
4. Player stops at solid walls (level sides are boundaries)
5. Player stands on ground tiles, falls through gaps
6. Player falling below the level respawns at the start position
7. Camera follows the player, clamped to level bounds
8. Switching to any edit mode stops the play loop; switching back resumes

## Concerns

- **Camera behavior on small levels**: The default level (15x20 tiles, 240x320px) is smaller than the canvas (480x640px), so the camera stays at (0,0) and the level renders small within the sky background. Camera only becomes active for levels larger than the viewport.
- **No visual indicator for edge-of-level**: Players at the sides of the level are stopped by the boundary check in `isSolidTile` (columns outside the level are solid). This prevents walking off the sides but there is no visual wall.
- **Export HTML**: The existing export function (`exportHtml`) has its own standalone game engine embedded in the generated file. The new play mode code does not affect the export — the exported HTML remains self-contained with its own physics.
