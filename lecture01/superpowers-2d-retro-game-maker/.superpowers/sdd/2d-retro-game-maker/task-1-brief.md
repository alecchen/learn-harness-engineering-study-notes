# Task 1: HTML skeleton, CSS layout, tab bar, empty canvases

**Files:**
- Create: `index.html` (single file at repo root)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: HTML structure with mode switching, CSS layout, canvas elements for each mode, and a `window.project` data object with default values. Tab bar with 4 buttons triggers `switchMode()`.

**Context:** This is Task 1 of 8 for the 2D Retro Game Maker. Task 2 adds pixel grid drawing + tile editor; Task 3 adds sprite editor; Task 4 adds level editor; Task 5 adds save/load/export; Task 6 adds play mode with physics; Task 7 adds Playwright tests; Task 8 polishes. Each built on top of the previous into the same index.html.

**Exact values (use verbatim):**
- Palette: `['#000000','#FFFFFF','#E00808','#0028DC','#00A800','#FCF800','#8C4800','#78ACFC']`
- Tile size: 16x16 pixels. Player sprite: 16x32. Default level: 20x15 tiles.
- Canvas size: 640x480

**Steps:**

1. Write `index.html` with the full HTML skeleton, CSS layout, tab bar, 4 canvas elements per mode, toolbar area, footer with Save/Load/Export buttons (stubs for JS functions), and `<script>` block containing:
   - `project` data object with empty tiles/level, playerSprite, playerStart {col:2,row:10}, palette (8 NES colors above), metadata {name:'My Level'}
   - `currentMode = 'tile'`
   - Canvas element references by mode key
   - `switchMode(mode)` — updates tab active state, shows/hides canvases, calls `initMode(mode)` and `renderCurrentMode()`
   - `initMode(mode)` — empty stub (filled by later tasks)
   - `renderCurrentMode()` — clears canvas, draws dark background, renders mode name text centered
   - `updateDefaultTiles()` — creates 4 default tiles: air (id:0, null pixels), ground (id:1, palette[6]=brown fill), brick (id:2, palette[2]=red fill), question (id:3, palette[5]=yellow fill). Creates 20x15 level with bottom row (row 14) filled with ground tiles (id:1). Player sprite: 16x32 black silhouette.
   - Stub functions: `saveProject()`, `loadProject(e)`, `exportHtml()`
   - Call `updateDefaultTiles()` then `switchMode('tile')`

2. Commit: `git add index.html && git commit -m "feat: add HTML skeleton with tab layout and default project data"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-1-report.md`

**Report contract:** After completing, write to the report file:
- Status (DONE / DONE_WITH_CONCERNS / BLOCKED)
- Commits created
- Brief test summary (open index.html in browser and verify: tabs render, switching shows correct active state, canvas shows mode name text)
- Any concerns
