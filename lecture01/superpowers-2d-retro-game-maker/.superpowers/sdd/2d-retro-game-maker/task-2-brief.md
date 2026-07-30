# Task 2: Pixel grid utility + color palette + Tile Editor

**Files:**
- Modify: `index.html` (add pixel grid utility, tile editor, color palette, mouse handlers, pixel art tiles)

**Prerequisite context (known from Task 1):**
- Canvas objects are `canvases` (e.g. `canvases.tile`)
- Canvas IDs: `canvas-tile`, `canvas-sprite`, `canvas-level`, `canvas-play`
- Project data is `var project` (a global, accessible as `window.project`)
- Tiles stored as `Uint8Array(256)` (256 = 16x16), values are palette indices or null
- Tiles added by direct index assignment: `project.tiles[N] = {...}`
- Default tiles exist at indices 0-3 but have NO `name` property and NO pixel art (just flat fills)
- `initMode(mode)` is empty stub `{}`
- `renderCurrentMode()` shows dark background + mode name text

**Steps:**

1. Add `drawPixelGrid(ctx, offsetX, offsetY, cellSize, pixels, gridW, gridH, palette, showGrid)` function. Iterates over the pixel grid, draws filled rects for each non-null pixel, and if `showGrid` is true, draws semi-transparent grid lines. Pixels array is indexed as `[row*width + col]`.

2. Add tile editor state object:
   ```js
   var tileEditor = {
     selectedColor: 0,
     editingTileId: 1,
     mouseDown: false
   };
   ```

3. Add `modeInit` object and wire `initMode` to dispatch to it. The plan previously defined `initMode` as empty — replace it:
   ```js
   var modeInit = {};
   function initMode(mode) {
     if (modeInit[mode]) modeInit[mode]();
   }
   ```

4. Implement `modeInit.tile` — builds the toolbar with:
   - 8 color palette swatches (buttons) from `project.palette`, with the selected color highlighted
   - Tile browser: thumbnail buttons for each non-air tile, with the editing tile highlighted
   - [+ New Tile] button that creates a new tile with the next available ID
   - [X] Delete button that removes the editing tile (can't delete tile 0/air)
   - Tile name input field for renaming the editing tile
   - Tile thumbnails drawn using `drawPixelGrid` at 1:1 scale on mini `<canvas>` elements

5. Add tile canvas mouse handlers:
   - `mousedown`: record position, call handler
   - `mousemove` (while down): call handler (drag-paint)
   - `mouseup`: release
   - `contextmenu`: prevent default
   - Handler: convert mouse position to pixel grid coordinates (grid starts at {x:192, y:112} with cellSize=16), find the pixel index, set it to `tileEditor.selectedColor` (left-click) or `null` (right-click), then `renderCurrentMode()`

6. Add tile rendering to `renderCurrentMode`:
   When `currentMode === 'tile'`:
   - Draw the 16x16 pixel grid at (192,112) with cellSize=16 and grid lines visible
   - Draw a red border around the grid
   - Show a label "Pixel grid (16x16) — paint with palette"

7. Update `updateDefaultTiles()` to replace flat fills with real pixel art:

   **Ground (id:1):** Brown with darker top row accent. Fill all with 6 (brown), top row (row 0) set to 7 (light blue) or keep brown.

   **Brick (id:2):** Red brick with brown mortar lines. Design:
   ```
   Rows 0-2: solid red (2), col 7=dark (6) [vertical mortar]
   Row 3: brown (6) all [horizontal mortar]
   Rows 4-6: red (2), col 7 shifted — col 3=dark, col 7 not (brick offset)
   Row 7: brown (6)
   Rows 8-10: repeat rows 0-2
   Row 11: brown (6)
   Rows 12-14: repeat rows 4-6
   Row 15: brown (6)
   ```

   **Question (id:3):** Yellow with white ? mark. Fill with 5 (yellow). Draw a ? pattern:
   ```
   Rows 4-11, centered around col 6-9:
   Row 4: col 6,9 = 0 (black) — top of ?
   Row 5: col 7-8 = 0 (black)
   Row 6: col 8 = 0 (black)
   Row 7: col 7 = 0 (black) — curve
   Row 8: col 6-7 = 0 (black) — stem start
   Row 9: col 6-7 = 0 (black)
   Row 10: (empty)
   Row 11: col 7 = 0 (black) — dot
   ```
   
   Add `name` property to each tile: "Air" (id:0), "Ground" (id:1), "Brick" (id:2), "Question" (id:3).

   Also add `name` property to the player sprite call for consistency.

8. Commit: `git add index.html && git commit -m "feat: add tile editor with pixel grid utility and pixel art tiles"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-2-report.md`

**Report contract:** Status (DONE/DONE_WITH_CONCERNS/BLOCKED), commits, test summary (open in browser and verify: tile editor shows 16x16 grid, color palette works, painting/erasing works, tile browser shows tiles with pixel art, new/delete tile works, name input works), concerns
