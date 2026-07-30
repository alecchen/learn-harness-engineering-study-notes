# Task 3: Sprite Editor mode

**Files:**
- Modify: `index.html` (add sprite editor mode)

**Prerequisite context (known from Tasks 1-2):**
- `canvases.sprite` = canvas element for sprite mode (ID: `canvas-sprite`)
- `project.playerSprite = { pixels: Uint8Array(512), width: 16, height: 32, name: 'Player' }`
- `drawPixelGrid(ctx, offsetX, offsetY, cellSize, pixels, gridW, gridH, palette, showGrid)` — shared utility
- `project.palette` — 8-color array
- Sentinel value 255 = transparent/empty (palette indices 0-7)
- `modeInit` dispatch pattern: add `modeInit.sprite = function() { ... }`
- `initMode(mode)` calls `modeInit[mode]()` if it exists
- Toolbar builds via `document.getElementById('toolbar')`
- Right-click uses `e.preventDefault()` for context menu, `e.button === 2` for erase

**Steps:**

1. Add sprite editor state after tileEditor declaration:
   ```js
   var spriteEditor = {
     selectedColor: 0,
     mouseDown: false
   };
   ```

2. Implement `modeInit.sprite`:
   - Clear toolbar, add color palette swatches (same pattern as tile editor)
   - Add a 2x scaled preview canvas showing current sprite (32x64 CSS px), drawn with `drawPixelGrid`
   - Add a "Clear" button that fills `project.playerSprite.pixels` with 255 (transparent)
   - Add a "Fill" button that fills with the selected color

3. Add sprite canvas mouse handlers (same pattern as tile editor):
   - On `canvas-sprite`: mousedown, mousemove, mouseup, mouseleave, contextmenu
   - Handler: compute pixel index from mouse position (grid starts at {x:0, y:0}, cellSize=16, for a 16x32 grid)
   - Left-click: set pixel to `spriteEditor.selectedColor`
   - Right-click: set pixel to 255 (transparent)

4. Add sprite rendering to `renderCurrentMode`:
   When `currentMode === 'sprite'`:
   - Draw the 16x32 pixel grid at position {x: 192, y: 16}, cellSize=16, showGrid=true
   - Draw a red border around the grid
   - Show a label "Sprite (16x32) — draw the player character"
   - The sprite editor canvas should show elements within the 640x480 area

5. Commit:
   `git add index.html && git commit -m "feat: add sprite editor mode"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-3-report.md`

**Report contract:** Status (DONE/DONE_WITH_CONCERNS/BLOCKED), commits, test summary (open in browser and verify: sprite editor shows 16x32 grid with current sprite, color palette works, painting/erasing works, preview thumbnail updates, clear/fill buttons work), concerns
