# Task 4: Level Editor mode

**Files:**
- Modify: `index.html` (add level editor mode)

**Prerequisite context:**
- `project.level` = 2D array (15 rows x 20 cols), values are tile IDs
- `project.tiles` = array of tile objects `{id, pixels: Uint8Array(256), width: 16, height: 16, name}`
- `project.tiles[0]` = Air tile (id:0, pixels: null)
- `project.playerStart = {col: 2, row: 10}`
- `drawPixelGrid(ctx, offsetX, offsetY, cellSize, pixels, gridW, gridH, palette, showGrid)` — shared utility
- Sentinel 255 = transparent/empty
- `modeInit.level` pattern for toolbar
- `canvases.level` = canvas element (ID: `canvas-level`)
- Render mode: `currentMode === 'level'` in `renderCurrentMode`

**Steps:**

1. Add level editor state:
   ```js
   var levelEditor = {
     selectedTileId: 1,
     mouseDown: false,
     placing: true,
     placingStart: false,
     hoverCol: -1,
     hoverRow: -1
   };
   ```

2. Implement `modeInit.level`:
   - Clear toolbar
   - Tile palette: for each tile in `project.tiles` (skip null entries), create an inline-block wrapper with a small canvas thumbnail (16x16 internal, ~24px CSS) showing the tile pixel art via `drawPixelGrid`. Highlight the selected tile with a white border
   - Click on a tile thumbnail sets `levelEditor.selectedTileId` to that tile's ID and disables start-placing mode
   - "Place/Erase" toggle button
   - "Set Start" button that toggles `levelEditor.placingStart`
   - If `placingStart` is true, show "Click on level to place start..." text

3. Add level canvas mouse handlers:
   - Compute tile coordinates from mouse position. Level is 20 columns x 15 rows. Center if smaller than canvas: `offsetX = Math.max(0, Math.floor((640 - 20*16)/2))`, `offsetY = Math.max(0, Math.floor((480 - 15*16)/2))`
   - `mousedown`: call handler, set `mouseDown = true`
   - `mousemove`: if mouseDown, call handler. Also always update `hoverCol`/`hoverRow` for preview
   - `mouseup`/`mouseleave`: `mouseDown = false`
   - `contextmenu`: prevent default
   - Handler logic: if `placingStart`, set `project.playerStart = {col, row}` and toggle off. Else if `e.button === 2` or erasing, set level cell to 0 (air). Else set to `levelEditor.selectedTileId`
   - After each placement, call `renderCurrentMode()`

4. Add level rendering to `renderCurrentMode`:
   When `currentMode === 'level'`:
   - For each row/col, find the tile by ID and render using `drawPixelGrid` at cellSize=16
   - Air tiles (id:0 or null tiles) should not be drawn (pixels: null means skip)
   - Draw grid lines at semi-transparent white
   - Draw player start marker as a red circle with "S" label
   - Draw hover preview: if `hoverCol/Rov >= 0` and selectedTileId > 0 and not placingStart, draw the tile semi-transparently (use `ctx.globalAlpha = 0.5`) at the hover position

5. Commit:
   `git add index.html && git commit -m "feat: add level editor mode"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-4-report.md`

**Return:** Status, commits, test summary, concerns