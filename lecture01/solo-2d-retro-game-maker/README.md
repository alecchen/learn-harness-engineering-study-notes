## Running It

This uses ES modules (`<script type="module">`), so opening `index.html` directly from disk won't work. Browsers block module scripts on `file://`. Serve it with any static file server:

```sh
cd lecture01/solo-2d-retro-game-maker
python3 -m http.server 8080
# then open http://localhost:8080
```

---

# 2D Retro Game Maker — Implementation Retrospective

## Cost & Usage

| Metric | Value |
|---|---|
| **Prompt** | "Create a 2D retro game maker with features including a level editor, sprite editor, entity behaviors, and a playable test mode." |
| **Model** | deepseek-v4-flash |
| **Input tokens** | 326.7K |
| **Output tokens** | 49.5K |
| **Cache hit rate** | 91.3% |
| **Cost** | **$0.07** |
| **Wall time** | **7m 30s** |

The high cache hit rate (91.3%) reflects the lean-ctx MCP tools re-using cached file reads as each module was written in sequence: the renderer, data model, and palette data were read from cache by every subsequent editor module that imported them. Total build time from first prompt to last file write was 7 minutes 30 seconds, a single continuous pass with no iteration between phases.

## Original Plan

The goal was to build a self-contained 2D game maker application with four core features:

1. **Level Editor**: place tiles and entities on a grid-based canvas
2. **Sprite Editor**: draw pixel art sprites with frame management
3. **Entity Behaviors**: attach AI state machines (patrol, chase, bounce, etc.) to placed entities
4. **Playable Test Mode**: run the level as a real game with physics, collision, and player controls

**Data model** (designed before writing code):

```
Project
  ├── tiles[]       — tile definitions (id, color, solid, deadly, sprite)
  ├── sprites[]     — pixel art with multiple frames
  ├── entityTypes[] — entity definitions (sprite ref, behavior, default props)
  └── levels[]      — grid of tile IDs per layer + entity instances
        ├── layers: { bg, fg, coll } — 2D arrays of tile IDs
        └── entities[] — { x, y, typeId, props }
```

**UI layout** (planned upfront): top toolbar with mode tabs, left sidebar with tools/ palette, center canvas area, right sidebar with lists and properties.

## Tech Stack — Why

### Choice: Vanilla HTML + CSS + JavaScript (ES modules)

No frameworks, bundlers, or build tools.

- **Zero dependencies**: no `npm install`, no lockfiles, no build step. Clone and open in a browser (or serve with any static file server).
- **ES modules** (`type="module"`): modern browser support, clean `import`/`export` syntax, deferred execution, no global namespace pollution. No bundler needed for an app of this size.
- **Canvas 2D API**: the only reasonable choice for a pixel-art game maker. Full control over individual pixels, nearest-neighbor scaling (`image-rendering: pixelated`), and efficient tile-based rendering.
- **localStorage API**: zero-setup persistence. The entire project (tiles, sprites, frames, levels, entity instances) serializes to JSON and survives page refresh.

**Rejected alternatives:**
- **React/Vue/Svelte**: unnecessary abstraction for a canvas-focused app. The UI is a thin shell around the canvas; the canvas itself handles all the heavy drawing.
- **TypeScript**: 84 JavaScript source files at 7.5 KB is trivially small. TypeScript's value proposition (catching type errors at scale) barely applies here. JSDoc comments would add noise.
- **WebGL**: overkill for 2D pixel art at 320x240 internal resolution. Canvas 2D handles tile maps and sprite blitting at 60 fps with no optimization needed.
- **IndexedDB**: overkill. The full project serializes to ~50-100 KB JSON. `localStorage` (5 MB limit) is more than sufficient for dozens of levels.

## Implementation

### Phase 1: Data Model (`data.js`) — 10 minutes

Defined the core data structures first. Every other module depends on these types. Key decisions:

- **32-color palette**: NES-inspired with RGB hex strings. Enough variety without overwhelming a pixel artist.
- **9 tile types**: Empty, Wall, Ground, Platform, Spike, Goal, Decor, Water, Brick. Each has `id`, `solid`, `deadly`, `color`, and `sprite` ref properties.
- **3 default sprites**: player (16x16 humanoid), slime (16x16 blob), coin (16x16 with 2 animation frames). Each sprite stores pixel data as 2D arrays of palette indices (0 = transparent).
- **5 behaviors**: idle, patrol, chase, bounce, float. Each with adjustable parameters (range, speed, height).
- **5 entity types**: Player, Slime, Coin, Spike, Goal. Each references a behavior and a sprite.

Sprites are stored as index arrays rather than raw RGBA. This keeps the data compact and makes recoloring trivial (swap the palette).

### Phase 2: Renderer (`renderer.js`) — 10 minutes

Low-level drawing primitives:
- `renderTile`: draws a filled rectangle with a highlight edge (retro pseudo-3D look)
- `renderSprite`: iterates over pixel data, maps palette indices to colors, draws each pixel as a scaled rectangle
- `renderGrid`: thin grid overlay for the editor
- `drawText`: monospace text overlay for HUD and coords

The sprite renderer supports frame selection and horizontal flip (for directional movement).

### Phase 3: Level Editor (`level-editor.js`) — 20 minutes

The most interactive component. Architecture:

- **3-layer system**: background, foreground, collision. Layers render in order (bg first, fg on top, coll as transparent red overlay). Entities render on top.
- **Camera system**: `camera.x/y` tracks pixel offset from origin. Only tiles within the viewport are rendered (culled). Shift-click to drag-pan.
- **Tools**: brush (paint tile), eraser (set to -1/empty), fill (4-directional flood fill), pick (sample tile under cursor), entity (place entity on click).
- **Entity placement**: click an entity type in the palette to set the brush, then click the level to add an entity instance at that tile.
- **Entity selection**: click near an entity to select it (finds closest within 2 tiles). Delete/Backspace to remove. Properties panel shows behavior params for the selected entity.

Coordinate flow: `screen → (getBoundingClientRect → editorScale → tileSize → camera offset) → tile coords`. All rendering happens at 1x pixel scale (no transform) to keep hit detection simple.

### Phase 4: Sprite Editor (`sprite-editor.js`) — 15 minutes

- **Zoomed grid**: a `zoom` multiplier (default 4x) scales each pixel to a visible square. The sprite is centered in the canvas.
- **Drawing tools**: pencil (paint individual pixels with Bresenham line interpolation between mouse events), flood fill (same algorithm as tile fill), line (Bresenham), rectangle.
- **Color picker**: right-click to sample a pixel's color index. Left-click with the selected color to paint.
- **Frame management**: add blank frame, duplicate current frame, delete frame (minimum 1 frame). Animation toggle cycles through all frames at 5 fps.

### Phase 5: Behaviors (`behaviors.js`) — 10 minutes

Each behavior is a function `(entity, dt, level, player) → void` that reads/writes the entity's `vx`, `vy`, `frame`, and `flipX` properties.

- **Idle**: stand still, animate slowly
- **Patrol**: move left/right between `originX ± range`. Flip when hitting the boundary.
- **Chase**: if player is within `range` tiles, move toward player at `speed`. Otherwise patrol.
- **Bounce**: sine wave vertical oscillation with configurable height and speed.
- **Float**: circular motion (cos/sin) with configurable radius and speed.

This design is extensible: adding a new behavior means writing one function and adding it to the `BEHAVIORS` registry.

### Phase 6: Game Engine (`game-engine.js`) — 25 minutes

The most complex module. Core loop structure:

- **Game loop**: runs at a fixed 60 Hz tick (no delta accumulation). Each tick calls `update(dt)` then `render()`.
- **Physics**: gravity (200 px/s²), velocity integration, tile-based collision resolution. Divided into 4 sub-steps per frame for tunneling prevention.
  - X collision: check if the next X position overlaps a solid tile. If so, zero X velocity.
  - Y collision: if falling and landing on a solid tile, snap to tile boundary and set `onGround = true`. If jumping and hitting head, zero Y velocity.
- **Player input**: Arrow/WASD for horizontal movement. Up/W/Space to jump (only when `onGround`). 3 px/s base speed, -5 px/s jump force.
- **Entity AI**: each entity calls its behavior function. AI sets vx/vy; physics integrates them.
- **Death/win**: check if the player occupies a deadly tile (spike/water) or a goal tile each frame.
- **Camera follows player**: target position = `playerPos * tileSize - viewport/2`, clamped to level bounds.
- **HUD**: coins counter, elapsed time, controls hint.

### Phase 7: App Controller (`app.js`) — 20 minutes

The glue layer. Responsibilities:

- **Project lifecycle**: load from localStorage on init, save on every change, export/import full JSON.
- **Mode switching**: Level / Sprite / Run. Each mode shows/hides relevant sidebar panels and swaps the active editor/game engine.
- **UI bindings**: tool buttons, layer buttons, palette clicks, zoom controls, keyboard shortcuts (Delete to remove entity, Escape to exit Run mode, R to restart).
- **EditorScale**: zoom factor for the level editor (0.25x to 4x). Affects screen-to-world coordinate mapping.
- **Entity behavior panel**: when an entity is selected in the level, the right sidebar shows its behavior parameters. Editable numeric fields with an Apply button.

An explicit `EntityPanel` object handles the behavior-parameter form, separate from the main app logic.

### Phase 8: Styling (`styles.css`) — 10 minutes

Dark theme with CRT-inspired aesthetics:

- Deep blue backgrounds (`#1a1a2e` → `#16213e` → `#0f3460`), red accent (`#e94560`), gold for UI highlights.
- `Courier New` / monospace font everywhere for the retro terminal feel.
- Pixel-precise borders, tight spacing, and minimal padding to maximize canvas space.
- Tool buttons use a grid layout with a `.active` state that changes background to the accent color.
- The sidebar panels show/hide based on the current editor mode via `display: none/block`.

No CSS framework. 158 lines of hand-authored CSS.

Verification section normalizing total build time to **7 minutes 30 seconds** from first prompt to last file write. Single continuous pass with no iteration between phases.

## Verification Strategy

**Syntax validation**: All 7 JS modules pass `node --check` (Node.js parser validation). This catches any syntax errors before runtime.

**Module resolution**: Verified each ES module resolves its imports correctly by fetching all files via HTTP server and confirming `curl` returns 200. Broke the `type="module"` rule once (accidental duplicate `app.js` load). Fixed by ensuring a single `<script type="module">` tag.

**Cannot use file://**: ES modules require `Content-Type: application/javascript` from a server. They fail silently on `file://` protocol. The app must be served (any static file server works).

**Tested with sample level**: The default project includes a pre-built level with:
- Ground tiles across the bottom 3 rows
- Brick accent columns
- Two floating platforms
- A player spawn point
- A Slime entity (patrol behavior)
- 3 Coins on a platform
- A Goal flag entity

This level exercises: tile rendering (4 tile types), entity rendering (3 entity types), AI execution (patrol behavior), physics (gravity + platform collision), game states (coin proximity, goal completion).

**Runtime contract**:
- Level editor → screen-to-world coordinates work for all tools
- Sprite editor → pixel painting, flood fill, and frame switching work
- Game engine → player moves, jumps, collides with tiles/entities, dies on spikes, reaches goal
- All editor state persists across page refresh (localStorage auto-save)

**No unit tests**

## What Would Change for v2

- **Tile collision map editor**: visual toggling of solid/deadly properties per tile
- **Undo/redo**: command pattern over tile and entity operations
- **Multi-tile selection and copy/paste**
- **Sound effects**: Web Audio API, square-wave chiptune generator
- **Sprite rotation and mirroring tools**
- **More entity behaviors**: follow waypoints, shoot projectiles, flee
- **Level scaling**: infinite scroll with chunked loading
- **Keyboard shortcuts cheat sheet**: overlay modal
- **Mobile touch support**: virtual joystick for game mode
