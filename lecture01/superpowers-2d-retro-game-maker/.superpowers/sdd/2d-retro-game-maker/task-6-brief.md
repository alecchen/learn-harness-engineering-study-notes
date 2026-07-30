# Task 6: Play mode — game loop, physics, collision, camera

**Files:**
- Modify: `index.html` (add play mode game engine)

**Prerequisite context:**
- `canvases.play` = canvas element (ID: `canvas-play`)
- `project.level` = 15x20 tile ID grid
- `project.tiles[N]` = tile objects with `{id, pixels: Uint8Array(256), ...}`
- `project.playerSprite = {pixels: Uint8Array(512), width: 16, height: 32}`
- `project.playerStart = {col, row}`
- `project.palette` = 8 colors
- `drawPixelGrid(ctx, offsetX, offsetY, cellSize, pixels, gridW, gridH, palette, showGrid)`
- Sentinel 255 = transparent/empty (not drawn)
- `modeInit.play` pattern for toolbar
- `initMode(mode)` → `modeInit[mode]()`
- `renderCurrentMode()` — just add `currentMode === 'play'` branch

**Physics constants (use verbatim):**
```js
var PHYS = {
  GRAVITY: 0.5,
  MOVE_SPEED: 3,
  JUMP_VEL: -8,
  MAX_FALL: 10,
  PLAYER_W: 12,
  PLAYER_H: 28,
  PLAYER_OFF_X: 2,
  PLAYER_OFF_Y: 4
};
```

**Steps:**

1. Add play state:
   ```js
   var playState = {
     player: { x: 0, y: 0, vx: 0, vy: 0, onGround: false, jumping: false },
     camera: { x: 0, y: 0 },
     keys: {},
     running: false,
     frameCount: 0
   };
   ```

2. Add collision helpers:
   - `isSolidTile(col, row)` — returns true if tile at level[row][col] > 0 (or row >= level height for bottom-of-world solid)
   - `getPlayerBox()` — returns `{left, right, top, bottom}` tile coordinates from player position + offsets
   - `resolveCollisionX()` — after player moves X, check for overlap with solid tiles on left/right, push out
   - `resolveCollisionY()` — after player moves Y, check for overlap with tiles above/below, push out. If below and solid, set `onGround = true`
   - Check if ground disappears (edge detection): after resolving, if player was on ground, check if tile below is still solid

3. Add `updatePlay()`:
   - Read arrow keys from `playState.keys`
   - Apply horizontal movement (left/right)
   - Apply jump logic (space/up initiates jump if on ground, variable height on release)
   - Apply gravity
   - Move X → resolve X → Move Y → resolve Y
   - Update camera to follow player (centered, clamped to level bounds)

4. Add `renderPlay(ctx)`:
   - Sky blue background (#5c94fc)
   - Camera offset (translate by -camera.x, -camera.y)
   - Draw visible tiles only (culling: start/end col/row based on camera position)
   - Draw player sprite at player position
   - OPTIMIZATION: only draw tiles within viewport to avoid drawing all 300 tiles

5. Implement `modeInit.play`:
   - Reset player position to `project.playerStart`
   - Show controls text in toolbar: "Arrow keys: Move | Space/Up: Jump"
   - Set `playState.running = true`

6. Wire up keyboard:
   - Already has global keydown/keyup listeners (from Task 1 stub area)
   - Keydown: set `playState.keys[e.key] = true`
   - Keyup: set `playState.keys[e.key] = false`
   - Prevent default for ArrowUp, ArrowDown, Space

7. Game loop:
   The plan uses a `mainLoop()` via `requestAnimationFrame` that calls `updatePlay()` + `renderCurrentMode()` when `currentMode === 'play'` and `playState.running` is true.
   Replace the existing `mainLoop()` with this version that handles play mode specifically.

8. Add play rendering to `renderCurrentMode`:
   When `currentMode === 'play'`:
   - Call `renderPlay(ctx)`

9. Commit:
   `git add index.html && git commit -m "feat: add play mode with platformer physics"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-6-report.md`

**Return:** Status, commits, test summary, concerns