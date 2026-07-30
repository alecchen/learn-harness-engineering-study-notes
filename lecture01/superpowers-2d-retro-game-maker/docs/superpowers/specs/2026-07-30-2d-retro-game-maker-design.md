# 2D Retro Game Maker — Design Spec

**Date:** 2026-07-30
**Project:** 2D Retro Game Maker (NES-style Mario-like platformer)
**Format:** Single self-contained HTML file, canvas-based, zero dependencies
**Validation:** Playwright testing script

---

## Overview

A browser-based tool to design and play NES-style platformer games. Users draw pixel tiles and sprites, build levels on a grid, then play the result with Mario-like physics. The entire editor + game engine lives in one HTML file. A Playwright script validates that the game is playable by testing movement, jumping, gravity, and collision.

---

## Data Model

A single JSON object represents the entire project:

```
{
  tiles: [
    { id: 0, name: "Air", pixels: [...] },         // transparent, non-solid
    { id: 1, name: "Ground", pixels: [...] },       // solid
    { id: 2, name: "Brick", pixels: [...] },        // solid
    ...
  ],
  level: [[0,0,1,0,...], [0,0,1,0,...], ...],      // 2D grid of tile IDs (rows x cols)
  playerSprite: { width: 16, height: 32, pixels: [...] },
  playerStart: { col: 2, row: 10 },                 // tile-coordinate spawn point
  palette: ["#000000", "#FFFFFF", "#E00808", ...],  // 8 NES-inspired colors
  metadata: { name: "My Level" }
}
```

- Tile 0 is always "air" (transparent, non-solid)
- All other tiles are solid by default
- Level dimensions default to ~20x15 tiles (320x240 px at 16px tile size)

---

## Editor Modes

The app has four modes, switched via a tab bar at the top.

### 1. Tile Editor

- **Canvas:** 16x16 pixel grid, each pixel drawn as a ~16px square (zoomed editing view)
- **Color palette:** 8 colors from a reduced NES palette
- **Controls:**
  - Left-click pixel = paint with selected color
  - Right-click pixel = erase (set to transparent)
- **Tile browser:** strip showing all created tiles with names; click to select/edit
- **Management:** [+ New Tile] button, trash icon to delete tiles
- **Persistence:** Tiles are stored in the project JSON

### 2. Sprite Editor

- **Canvas:** 16x32 pixel grid (Mario proportions)
- **Color palette:** same 8 colors
- **Controls:** same paint/erase as tile editor
- **Scope:** v1 ships with one standing pose; animation frames deferred

### 3. Level Editor

- **Grid:** full level grid rendered at 16px per tile
- **View:** zoomed to fit if small, scrollable if larger than viewport
- **Tile palette:** thumbnails of all tiles from Tile Editor
- **Controls:**
  - Left-click = place selected tile
  - Right-click = remove tile (set to air)
- **Hover preview:** semi-transparent tile outline follows cursor
- **Player start marker:** toggle tool mode or click-to-place icon; left-click sets, right-click removes
- **Live updates:** editing a tile in Tile Editor updates all its instances in the level

### 4. Play Mode

Renders the level and player at NES resolution (scaled up). Keyboard controls:

- **Left/Right arrows:** move
- **Space / Up:** jump

**Physics (60fps via requestAnimationFrame):**

1. Gravity: +0.5 px/frame² downward acceleration
2. Horizontal speed: caps at ~3 px/frame (instant direction change, no momentum slide)
3. Jump: initial velocity -8 px/frame; variable height (extend ascent while holding jump)
4. Collision resolution: move X -> resolve X -> move Y -> resolve Y (avoids diagonal clip)
5. Tile collision: AABB against solid tiles (ID > 0); push player out of overlap on contact
6. Landing: feet contact solid tile = reset jump state and allow re-jump
7. Falling: player falls off edges; no death/respawn for v1 (walk back)
8. Player bounding box: ~12x28px within the 16x32 sprite (movement feels natural)
9. Camera: follows player horizontally; vertical follow for high jumps and falls

---

## UI Layout

```
[Tile Editor] [Sprite Editor] [Level Editor] [Play]
+------------------------------------------------------+
|                                                       |
|              Main canvas area                         |
|                                                       |
+------------------------------------------------------+
|  Palette / toolbar / tile browser (contextual per     |
|  mode)                                                |
+------------------------------------------------------+
|  [Save] [Load] [Export Playable HTML]                 |
+------------------------------------------------------+
```

The layout is responsive: toolbar and palette stack below the canvas. Color palette shows only in Tile/Sprite editor modes. Tile browser shows only in Level Editor mode.

---

## Export & Save

- **Save:** download project as `.json` file
- **Load:** file input to restore from a saved `.json`
- **Export Playable HTML:** generates a standalone HTML file with all game data baked in (tiles, level, sprites). This file contains only the playable game — no editor. Use this to share the game. Keep the source .json to re-edit later.

---

## Validation (Playwright)

**Script:** `test/game-test.mjs`

The game window exposes a small `window.__TEST__` API when loaded with `?test=true`:

- `__TEST__.getPlayerPos()` -> { x, y }
- `__TEST__.getTileAt(col, row)` -> tileId
- `__TEST__.getTiles()` -> tile array
- `__TEST__.getLevelWidth()` -> cols
- `__TEST__.getLevelHeight()` -> rows
- `__TEST__.getPlayerOnGround()` -> boolean

**Test assertions (in order):**

1. Load HTML with a predefined test project (?test=true)
2. Screenshot initial state
3. Click "Play" tab, wait for render
4. Screenshot play mode
5. Press Right arrow for N frames -> assert player X increased
6. Press Space -> assert player Y decreased then returned (jump arc)
7. Walk player off platform -> assert Y increases (gravity pull, no collision below)
8. Walk player into wall -> assert X stops changing (collision works)
9. Screenshot final state

**Run:** `npx playwright test test/game-test.mjs`

If all assertions pass, the game is verified playable.

---

## Implementation Plan (Next Step)

The single HTML file will be built sequentially:

1. HTML skeleton: tabs, canvas, toolbar layout
2. Color palette + pixel grid canvas utilities
3. Tile Editor mode (paint, erase, tile browser, CRUD)
4. Sprite Editor mode (pixel grid, save to player sprite)
5. Level Editor mode (grid rendering, tile placement, player start marker)
6. Data model: save/load JSON, export playable HTML
7. Play mode: player rendering, keyboard input
8. Physics: gravity, movement, collision detection/resolution
9. Camera system
10. Playwright test script + fixture test project

Each step produces a working state; steps 7-9 are the playability core.

---

## Scope & Future

**v1 (this spec):** Tile editor, sprite editor, level editor, playable game with physics. Platform-only gameplay, no enemies, no scoring, no sound.

**Future (deferred):** Enemies and sprites, collectibles/coins, scoring/lives, scrolling camera enhancements, title screen, chiptune sound, multiple levels/worlds, undo/redo in editors.
