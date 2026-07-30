# 2D Retro Game Maker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based NES-style platformer maker (Mario-like) in a single self-contained HTML file with tile editor, sprite editor, level editor, and playable game mode — verified by Playwright.

**Architecture:** Single `index.html` file containing all HTML, CSS, and JavaScript for the four modes. The file uses `<canvas>` for all rendering. A separate `test/game-test.mjs` Playwright script validates playability against a test project loaded via `?test=true`.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript (no build, no deps), Playwright for validation.

## Global Constraints

- Single HTML file: `index.html` — zero external dependencies, no build step
- Zero npm dependencies for the game file itself
- Canvas-based rendering for all modes
- 60fps game loop via requestAnimationFrame in play mode
- File opens from disk via `file://` protocol (no server needed)
- Playwright test runs via `npx playwright test`
- All project state held in a single global JS object (`project`)
- NES-style 8-color palette: `#000000`, `#FFFFFF`, `#E00808`, `#0028DC`, `#00A800`, `#FCF800`, `#8C4800`, `#78ACFC`
- Tile size: 16x16 pixels. Player sprite: 16x32 pixels. Default level: 20x15 tiles.
- Windows-style line endings and UTF-8 encoding

---

### Task 1: HTML skeleton, CSS layout, tab bar, empty canvases

**Files:**
- Create: `index.html`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: HTML structure with mode switching, CSS layout, canvas elements for each mode, and a `window.project` data object with default values. Tab bar with 4 buttons triggers `switchMode()`.

- [ ] **Step 1: Write HTML skeleton with CSS layout and tab bar**

```
[Tile Editor] [Sprite Editor] [Level Editor] [Play]
+------------------------------------------------------+
|                                                       |
|              Main canvas area                         |
|                                                       |
+------------------------------------------------------+
|  Bottom toolbar (placeholder)                         |
+------------------------------------------------------+
|  [Save] [Load] [Export Playable HTML]                 |
+------------------------------------------------------+
```

Write `index.html` with:
- DOCTYPE, meta charset, viewport meta
- `<style>` block with: body reset (margin 0, etc.), `.app` container with flex column, `.tabs` bar (display flex, 4 buttons), `.mode-canvas` container (grows, centers canvas), `.toolbar` area, `.footer` bar
- CSS for: tab buttons (active/hover states), canvas border, toolbar left-aligned layout, footer buttons right-aligned
- HTML: `.tabs` with 4 `<button>` elements (data-mode attributes), `.mode-canvas` with 4 `<canvas>` elements (one per mode, only active one visible), `.toolbar` div, `.footer` with Save/Load/Export buttons
- `<script>` block with:
  - `const APP = {}` namespace object
  - `project = { tiles: [], level: [], playerSprite: null, playerStart: {col:2,row:10}, palette: ["#000000","#FFFFFF","#E00808","#0028DC","#00A800","#FCF800","#8C4800","#78ACFC"], metadata: {name:"My Level"} }`
  - `currentMode = 'tile'`
  - `function switchMode(mode)` — show the selected tab's canvas, hide others, update toolbar content
  - Tab click handlers calling `switchMode`
  - `const CANVAS_SIZE = { w: 640, h: 480 }` — all canvases are this size
  - Canvas context references
  - `updateDefaultTiles()` — creates 4 default tiles: air (id:0, empty), ground (id:1, brown fill), brick (id:2, red fill with mortar lines), question (id:3, yellow fill with ? mark)
  - `renderCurrentMode()` — calls mode-specific render function or clears canvas with placeholder text
  - Call `switchMode('tile')` on load

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2D Retro Game Maker</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: monospace; background: #1a1a2e; color: #eee; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .app { background: #16213e; border: 2px solid #0f3460; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; gap: 4px; width: 660px; }
  .tabs { display: flex; gap: 2px; }
  .tabs button { flex: 1; padding: 8px; border: none; background: #0f3460; color: #aaa; cursor: pointer; font-family: monospace; font-size: 14px; }
  .tabs button:hover { background: #1a4a8a; }
  .tabs button.active { background: #e94560; color: #fff; font-weight: bold; }
  .canvas-wrap { background: #000; border: 2px solid #0f3460; border-radius: 4px; display: flex; justify-content: center; align-items: center; min-height: 400px; }
  .canvas-wrap canvas { display: none; }
  .canvas-wrap canvas.active { display: block; }
  .toolbar { background: #0f3460; border-radius: 4px; padding: 6px; min-height: 32px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .footer { display: flex; gap: 4px; justify-content: flex-end; }
  .footer button { padding: 4px 12px; border: none; background: #0f3460; color: #eee; cursor: pointer; font-family: monospace; }
  .footer button:hover { background: #1a4a8a; }
</style>
</head>
<body>
<div class="app">
  <div class="tabs">
    <button data-mode="tile" onclick="switchMode('tile')">Tile Editor</button>
    <button data-mode="sprite" onclick="switchMode('sprite')">Sprite Editor</button>
    <button data-mode="level" onclick="switchMode('level')">Level Editor</button>
    <button data-mode="play" onclick="switchMode('play')">Play</button>
  </div>
  <div class="canvas-wrap">
    <canvas id="c-tile" width="640" height="480"></canvas>
    <canvas id="c-sprite" width="640" height="480"></canvas>
    <canvas id="c-level" width="640" height="480"></canvas>
    <canvas id="c-play" width="640" height="480"></canvas>
  </div>
  <div class="toolbar" id="toolbar"></div>
  <div class="footer">
    <button onclick="saveProject()">Save</button>
    <button onclick="document.getElementById('load-input').click()">Load</button>
    <button onclick="exportHtml()">Export Playable HTML</button>
    <input id="load-input" type="file" accept=".json" style="display:none" onchange="loadProject(event)">
  </div>
</div>
<script>
// --- Project data ---
const project = {
  tiles: [],
  level: [],
  playerSprite: {width:16, height:32, pixels:[]},
  playerStart: {col:2, row:10},
  palette: ['#000000','#FFFFFF','#E00808','#0028DC','#00A800','#FCF800','#8C4800','#78ACFC'],
  metadata: {name:'My Level'}
};

let currentMode = 'tile';

const canvasEls = {};
['tile','sprite','level','play'].forEach(m => {
  canvasEls[m] = document.getElementById('c-'+m);
});

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  Object.keys(canvasEls).forEach(k => canvasEls[k].classList.toggle('active', k === mode));
  initMode(mode);
  renderCurrentMode();
}

function initMode(mode) {
  // Override per mode
}

function renderCurrentMode() {
  const ctx = canvasEls[currentMode].getContext('2d');
  ctx.clearRect(0,0,640,480);
  ctx.fillStyle = '#222';
  ctx.fillRect(0,0,640,480);
  ctx.fillStyle = '#666';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(currentMode.charAt(0).toUpperCase()+currentMode.slice(1)+' Mode', 320, 240);
}

function updateDefaultTiles() {
  function makePixels(w,h,fill) {
    const p = [];
    for(let i=0;i<w*h;i++) p.push(fill);
    return p;
  }
  project.tiles.push({id:0,name:'Air',pixels:makePixels(16,16,null)});
  project.tiles.push({id:1,name:'Ground',pixels:makePixels(16,16,6)}); // brown
  project.tiles.push({id:2,name:'Brick',pixels:makePixels(16,16,2)});  // red
  project.tiles.push({id:3,name:'Question',pixels:makePixels(16,16,5)}); // yellow
  for(let r=0;r<15;r++) {
    project.level[r]=[];
    for(let c=0;c<20;c++) project.level[r][c]=0;
  }
  for(let c=0;c<20;c++) project.level[14][c]=1; // ground row
  project.playerSprite.pixels = makePixels(16,32,0); // black silhouette
}

// Stubs
function saveProject() {}
function loadProject(e) {}
function exportHtml() {}

updateDefaultTiles();
switchMode('tile');
</script>
</body>
</html>
```

- [ ] **Step 2: Open index.html in browser**

Open `file:///Users/alec/git/superpowers-2d-retro-game-maker/index.html` and verify:
- 4 tab buttons visible, first one ("Tile Editor") is highlighted
- Tab switching works — clicking each tab changes the active state
- Canvas area shows mode name text centered
- Default layout renders correctly (no scrollbars, tabs fill width)

- [ ] **Step 3: Wire up Save/Load/Export stubs**

Add event listeners to the footer buttons. Save opens a download dialog, Load triggers the hidden file input. Keep stubs for now.

Take a screenshot of the working skeleton.

---

### Task 2: Pixel grid rendering utility + color palette + Tile Editor (core)

**Files:**
- Modify: `index.html` (add pixel grid rendering functions, color palette UI, tile editor logic)

**Interfaces:**
- Consumes: Task 1's HTML structure, canvas elements, `project` data, `currentMode`
- Produces: `drawPixelGrid(ctx, x, y, cellSize, pixels, width, height, palette, showGrid)` — renders a pixel grid at a position. `getPaletteSwatch(colorIndex)` returns hex color. Color palette rendering in toolbar. Tile editor mode paints to a 16x16 grid.

- [ ] **Step 1: Add pixel grid drawing utility**

Add to `<script>` before `updateDefaultTiles()`:

```js
function drawPixelGrid(ctx, offsetX, offsetY, cellSize, pixels, gridW, gridH, palette, showGrid) {
  for (let py = 0; py < gridH; py++) {
    for (let px = 0; px < gridW; px++) {
      const idx = py * gridW + px;
      const colorIdx = pixels[idx];
      if (colorIdx !== null && colorIdx !== undefined) {
        ctx.fillStyle = palette[colorIdx];
        ctx.fillRect(offsetX + px * cellSize, offsetY + py * cellSize, cellSize, cellSize);
      }
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX + px * cellSize, offsetY + py * cellSize, cellSize, cellSize);
      }
    }
  }
}

function getPaletteColor(index) {
  return project.palette[index] || '#000';
}
```

- [ ] **Step 2: Add tile editor canvas click handler**

Add tile-editing state variables after `let currentMode`:
```js
let tileEditor = {
  selectedColor: 0,
  editingTileId: 1,     // currently editing tile (0 = air, skip)
  mouseDown: false,
  drawing: true          // true=paint, false=erase
};
```

Add `initMode(mode)` implementation:
```js
const modeInit = {};
modeInit.tile = function() {
  // Build toolbar
  const tb = document.getElementById('toolbar');
  tb.innerHTML = '';
  // Color palette
  project.palette.forEach((c,i) => {
    const swatch = document.createElement('button');
    swatch.style.cssText = `width:24px;height:24px;background:${c};border:2px solid ${i===tileEditor.selectedColor?'#fff':'#555'};cursor:pointer;`;
    swatch.onclick = () => { tileEditor.selectedColor = i; initMode('tile'); };
    tb.appendChild(swatch);
  });
  // Tile browser
  project.tiles.forEach(t => {
    if(t.id===0) return;
    const btn = document.createElement('button');
    btn.style.cssText = `width:32px;height:32px;border:2px solid ${t.id===tileEditor.editingTileId?'#e94560':'#555'};cursor:pointer;background:#000;image-rendering:pixelated;`;
    // Draw tile thumbnail
    const c = document.createElement('canvas');
    c.width=16; c.height=16;
    const cx = c.getContext('2d');
    drawPixelGrid(cx, 0, 0, 1, t.pixels, 16, 16, project.palette, false);
    btn.appendChild(c);
    btn.onclick = () => { tileEditor.editingTileId = t.id; initMode('tile'); };
    tb.appendChild(btn);
  });
  // New tile button
  const newBtn = document.createElement('button');
  newBtn.textContent = '+';
  newBtn.onclick = () => {
    const maxId = project.tiles.reduce((m,t)=>Math.max(m,t.id),0);
    const newId = maxId+1;
    project.tiles.push({id:newId,name:'Tile '+newId,pixels:new Array(256).fill(null)});
    tileEditor.editingTileId = newId;
    initMode('tile');
  };
  tb.appendChild(newBtn);
  // Delete tile button
  if (tileEditor.editingTileId > 0) {
    const delBtn = document.createElement('button');
    delBtn.textContent = 'X';
    delBtn.onclick = () => {
      const idx = project.tiles.findIndex(t=>t.id===tileEditor.editingTileId);
      if(idx>0) {
        project.tiles.splice(idx,1);
        // Replace tiles in level with air
        for(let r=0;r<project.level.length;r++)
          for(let c=0;c<project.level[r].length;c++)
            if(project.level[r][c]===tileEditor.editingTileId)
              project.level[r][c]=0;
      }
      tileEditor.editingTileId = project.tiles[1]?.id || 1;
      initMode('tile');
    };
    tb.appendChild(delBtn);
  }
  // Tile name input
  const editingTile = project.tiles.find(t=>t.id===tileEditor.editingTileId);
  if(editingTile) {
    const nameInput = document.createElement('input');
    nameInput.value = editingTile.name;
    nameInput.style.cssText = 'background:#1a1a2e;color:#eee;border:1px solid #555;padding:2px 6px;font:14px monospace;width:120px;';
    nameInput.oninput = () => { editingTile.name = nameInput.value; };
    tb.appendChild(nameInput);
  }
};

// Canvas click handlers for tile editing
// Add after renderCurrentMode
const tileCanvasState = {px:-1,py:-1};

function handleTileClick(e) {
  const rect = canvasEls.tile.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cellSize = 16;
  const gridX = Math.floor((x - 192) / cellSize);
  const gridY = Math.floor((y - 112) / cellSize);
  if(gridX<0||gridX>=16||gridY<0||gridY>=16) return;
  const tile = project.tiles.find(t=>t.id===tileEditor.editingTileId);
  if(!tile) return;
  const idx = gridY*16+gridX;
  tile.pixels[idx] = e.button===2 ? null : tileEditor.selectedColor;
  renderCurrentMode();
}
```

Add event listeners in the init block:
```js
canvasEls.tile.addEventListener('mousedown', function(e) {
  tileCanvasState.mouseDown = true;
  handleTileClick(e);
});
canvasEls.tile.addEventListener('mousemove', function(e) {
  if(tileCanvasState.mouseDown) handleTileClick(e);
});
canvasEls.tile.addEventListener('mouseup', () => { tileCanvasState.mouseDown = false; });
canvasEls.tile.addEventListener('contextmenu', e => e.preventDefault());
```

- [ ] **Step 3: Implement tile editor rendering**

Replace `renderCurrentMode` to handle tile mode:

```js
function renderCurrentMode() {
  const ctx = canvasEls[currentMode].getContext('2d');
  ctx.clearRect(0,0,640,480);
  ctx.fillStyle = '#222';
  ctx.fillRect(0,0,640,480);

  if(currentMode === 'tile') {
    const size = 16;
    const tile = project.tiles.find(t=>t.id===tileEditor.editingTileId);
    if(tile) {
      drawPixelGrid(ctx, 192, 112, size, tile.pixels, 16, 16, project.palette, true);
    }
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 2;
    ctx.strokeRect(192-1, 112-1, 16*size+2, 16*size+2);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Pixel grid (16x16) — paint with palette', 192, 100);
  } else {
    ctx.fillStyle = '#666';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentMode.charAt(0).toUpperCase()+currentMode.slice(1)+' Mode', 320, 240);
  }
}
```

Add the `initMode` call to the `switchMode` function:
```js
function initMode(mode) {
  if(modeInit[mode]) modeInit[mode]();
}
```

- [ ] **Step 4: Test tile editor**

Open `index.html`, click "Tile Editor" tab. Verify:
- Color palette (8 swatches) visible in toolbar
- Default tiles shown as thumbnails
- Click a color swatch — it highlights
- Click on the 16x16 pixel grid — pixel colors with selected color
- Right-click on a pixel — erases it (makes it dark/empty)
- [+] button creates a new tile
- [X] button deletes the current tile
- Tile browser thumbnails update as you draw

Take screenshot.

- [ ] **Step 5: Default tile designs**

Replace the simple flat color default tiles with recognizable pixel designs:

Ground (id:1): Brown top row, alternating brown/dark brown rows below
Brick (id:2): Red with darker mortar line grid pattern
Question (id:3): Yellow block with centered white ? mark pixels

```js
function updateDefaultTiles() {
  // Air (id:0) — stay null
  project.tiles.push({id:0,name:'Air',pixels:new Array(256).fill(null)});

  // Ground (id:1) — brown
  const ground = new Array(256).fill(null);
  for(let r=0;r<16;r++) for(let c=0;c<16;c++) ground[r*16+c] = 6; // brown
  project.tiles.push({id:1,name:'Ground',pixels:ground});

  // Brick (id:2) — red brick pattern
  const brick = new Array(256).fill(null);
  for(let r=0;r<16;r++) for(let c=0;c<16;c++) {
    const mortar = (r%4===3) || (c%8===7) || (r%8<4 && c%8===3) || (r%8>=4 && c%8===7);
    brick[r*16+c] = mortar ? 6 : 2; // mortar=brown, brick=red
  }
  project.tiles.push({id:2,name:'Brick',pixels:brick});

  // Question block (id:3) — yellow
  const q = new Array(256).fill(null);
  for(let r=0;r<16;r++) for(let c=0;c<16;c++) q[r*16+c] = 5; // yellow fill
  // Draw ? mark
  const mark = [
    [0,1,1,0],[1,0,0,1],[0,0,0,1],[1,1,1,0],
    [0,0,1,0],[0,0,1,0],[0,0,0,0],[0,0,1,0]
  ];
  for(let r=0;r<8;r++) for(let c=0;c<4;c++) {
    if(mark[r][c]) q[(r+4)*16+(c+6)] = 0; // black
  }
  project.tiles.push({id:3,name:'Question',pixels:q});

  // Level: 20x15, bottom row ground
  project.level = Array.from({length:15}, (_,r) =>
    Array.from({length:20}, (_,c) => r===14 ? 1 : 0)
  );

  // Player sprite: 16x32 black silhouette
  project.playerSprite.pixels = new Array(512).fill(null);
  for(let r=0;r<32;r++) for(let c=0;c<16;c++) {
    const inside = c>=2 && c<14 && r>=2 && r<30;
    project.playerSprite.pixels[r*16+c] = inside ? 0 : null;
  }
}
```

---

### Task 3: Sprite Editor mode

**Files:**
- Modify: `index.html` (add sprite editor logic to existing script)

**Interfaces:**
- Consumes: Task 2's `drawPixelGrid`, `project.playerSprite`, color palette
- Produces: Sprite editor mode with 16x32 pixel grid, paint/erase, save to playerSprite

- [ ] **Step 1: Add sprite editor state and toolbar**

Add after `tileEditor`:
```js
let spriteEditor = {
  selectedColor: 0,
  mouseDown: false
};
```

Add sprite init to `modeInit`:
```js
modeInit.sprite = function() {
  const tb = document.getElementById('toolbar');
  tb.innerHTML = '';
  project.palette.forEach((c,i) => {
    const swatch = document.createElement('button');
    swatch.style.cssText = `width:24px;height:24px;background:${c};border:2px solid ${i===spriteEditor.selectedColor?'#fff':'#555'};cursor:pointer;`;
    swatch.onclick = () => { spriteEditor.selectedColor = i; initMode('sprite'); };
    tb.appendChild(swatch);
  });
  // Preview
  const preview = document.createElement('canvas');
  preview.width=32; preview.height=64;
  const px = preview.getContext('2d');
  px.imageSmoothingEnabled = false;
  drawPixelGrid(px, 0, 0, 2, project.playerSprite.pixels, 16, 32, project.palette, false);
  tb.appendChild(preview);
  // Clear button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => {
    project.playerSprite.pixels = new Array(512).fill(null);
    initMode('sprite');
  };
  tb.appendChild(clearBtn);
  // Fill button
  const fillBtn = document.createElement('button');
  fillBtn.textContent = 'Fill';
  fillBtn.onclick = () => {
    const fill = new Array(512).fill(spriteEditor.selectedColor===0?1:spriteEditor.selectedColor);
    project.playerSprite.pixels = fill;
    initMode('sprite');
  };
  tb.appendChild(fillBtn);
};
```

- [ ] **Step 2: Add sprite canvas click handler**

```js
function handleSpriteClick(e) {
  const rect = canvasEls.sprite.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const cellSize = 16;
  const gridX = Math.floor(x / cellSize);
  const gridY = Math.floor(y / cellSize);
  if(gridX<0||gridX>=16||gridY<0||gridY>=32) return;
  const idx = gridY*16+gridX;
  project.playerSprite.pixels[idx] = e.button===2 ? null : spriteEditor.selectedColor;
  renderCurrentMode();
}
```

Add event listeners:
```js
canvasEls.sprite.addEventListener('mousedown', function(e) {
  spriteEditor.mouseDown = true;
  handleSpriteClick(e);
});
canvasEls.sprite.addEventListener('mousemove', function(e) {
  if(spriteEditor.mouseDown) handleSpriteClick(e);
});
canvasEls.sprite.addEventListener('mouseup', () => { spriteEditor.mouseDown = false; });
canvasEls.sprite.addEventListener('contextmenu', e => e.preventDefault());
```

- [ ] **Step 3: Add sprite rendering to renderCurrentMode**

Add to the else-if chain in `renderCurrentMode`:
```js
else if(currentMode === 'sprite') {
  const size = 16;
  drawPixelGrid(ctx, 192, 16, size, project.playerSprite.pixels, 16, 32, project.palette, true);
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.strokeRect(192-1, 16-1, 16*size+2, 32*size+2);
  ctx.fillStyle = '#aaa';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Sprite (16x32) — draw the player character', 192, 0);
}
```

- [ ] **Step 4: Test sprite editor**

Open `index.html`, click "Sprite Editor" tab. Verify:
- 16x32 pixel grid visible with current sprite
- Preview thumbnail in toolbar updates on paint
- Painting and erasing work
- Clear and Fill buttons work

---

### Task 4: Level Editor mode

**Files:**
- Modify: `index.html` (add level editor logic)

**Interfaces:**
- Consumes: Task 2-3's `project.tiles`, `project.level`, `project.playerStart`
- Produces: Level grid rendering (16px per tile), tile palette from project tiles, click-to-place, player start marker

- [ ] **Step 1: Add level editor state and toolbar**

```js
let levelEditor = {
  selectedTileId: 0,
  mouseDown: false,
  placing: true, // true=place, false=erase
  placingStart: false, // placing player start
};
```

Level init:
```js
modeInit.level = function() {
  const tb = document.getElementById('toolbar');
  tb.innerHTML = '';
  // Tile palette — thumbnails of all tiles
  const paletteDiv = document.createElement('div');
  paletteDiv.style.cssText = 'display:flex;gap:2px;flex-wrap:wrap;max-height:64px;overflow-y:auto;';
  project.tiles.forEach(t => {
    const btn = document.createElement('button');
    btn.style.cssText = `width:32px;height:32px;border:2px solid ${t.id===levelEditor.selectedTileId?'#e94560':'#555'};cursor:pointer;background:#000;`;
    const c = document.createElement('canvas');
    c.width=16; c.height=16;
    const cx = c.getContext('2d');
    drawPixelGrid(cx, 0, 0, 1, t.pixels, 16, 16, project.palette, false);
    btn.appendChild(c);
    btn.title = t.name;
    btn.onclick = () => { levelEditor.selectedTileId = t.id; levelEditor.placingStart = false; initMode('level'); };
    paletteDiv.appendChild(btn);
  });
  tb.appendChild(paletteDiv);
  // Separator
  tb.appendChild(document.createTextNode(' '));
  // Eraser mode toggle
  const modeBtn = document.createElement('button');
  modeBtn.textContent = levelEditor.placing ? 'Place' : 'Erase';
  modeBtn.onclick = () => { levelEditor.placing = !levelEditor.placing; initMode('level'); };
  tb.appendChild(modeBtn);
  // Set start position button
  const startBtn = document.createElement('button');
  startBtn.textContent = levelEditor.placingStart ? 'Placing Start...' : 'Set Start';
  startBtn.onclick = () => { levelEditor.placingStart = !levelEditor.placingStart; initMode('level'); };
  tb.appendChild(startBtn);
};
```

- [ ] **Step 2: Add level canvas click handler**

```js
function handleLevelClick(e) {
  const rect = canvasEls.level.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const tileSize = 16;
  const levelW = project.level[0]?.length || 20;
  const levelH = project.level.length;
  const offsetX = Math.max(0, Math.floor((640 - levelW*tileSize)/2));
  const offsetY = Math.max(0, Math.floor((480 - levelH*tileSize)/2));
  const col = Math.floor((x - offsetX) / tileSize);
  const row = Math.floor((y - offsetY) / tileSize);
  if(col<0||col>=levelW||row<0||row>=levelH) return;

  if(levelEditor.placingStart) {
    project.playerStart = {col, row};
    levelEditor.placingStart = false;
    initMode('level');
    renderCurrentMode();
    return;
  }

  if(e.button===2) {
    project.level[row][col] = 0; // erase
  } else if(levelEditor.selectedTileId>0) {
    project.level[row][col] = levelEditor.selectedTileId;
  } else {
    project.level[row][col] = 0;
    levelEditor.selectedTileId = 0;
  }
  renderCurrentMode();
}
```

Event listeners:
```js
canvasEls.level.addEventListener('mousedown', function(e) {
  levelEditor.mouseDown = true;
  handleLevelClick(e);
});
canvasEls.level.addEventListener('mousemove', function(e) {
  if(levelEditor.mouseDown) handleLevelClick(e);
});
canvasEls.level.addEventListener('mouseup', () => { levelEditor.mouseDown = false; });
canvasEls.level.addEventListener('contextmenu', e => e.preventDefault());
```

- [ ] **Step 3: Add level rendering to renderCurrentMode**

```js
else if(currentMode === 'level') {
  const tileSize = 16;
  const levelW = project.level[0]?.length || 20;
  const levelH = project.level.length;
  const offsetX = Math.max(0, Math.floor((640 - levelW*tileSize)/2));
  const offsetY = Math.max(0, Math.floor((480 - levelH*tileSize)/2));

  for(let r=0; r<levelH; r++) {
    for(let c=0; c<levelW; c++) {
      const tileId = project.level[r][c];
      const tile = project.tiles.find(t=>t.id===tileId);
      if(tile) {
        drawPixelGrid(ctx, offsetX+c*tileSize, offsetY+r*tileSize, tileSize, tile.pixels, 16, 16, project.palette, false);
      }
    }
  }

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 0.5;
  for(let r=0;r<=levelH;r++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY+r*tileSize);
    ctx.lineTo(offsetX+levelW*tileSize, offsetY+r*tileSize);
    ctx.stroke();
  }
  for(let c=0;c<=levelW;c++) {
    ctx.beginPath();
    ctx.moveTo(offsetX+c*tileSize, offsetY);
    ctx.lineTo(offsetX+c*tileSize, offsetY+levelH*tileSize);
    ctx.stroke();
  }

  // Player start marker
  const ps = project.playerStart;
  if(ps) {
    ctx.fillStyle = '#e94560';
    ctx.beginPath();
    ctx.arc(offsetX+ps.col*tileSize+tileSize/2, offsetY+ps.row*tileSize+tileSize/2, 4, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('S', offsetX+ps.col*tileSize+tileSize/2, offsetY+ps.row*tileSize+tileSize/2+3);
  }
}
```

- [ ] **Step 4: Hover preview**

Add to level mouse handler:
```js
canvasEls.level.addEventListener('mousemove', function(e) {
  // ... (existing move handler for drag-paint)
  // Also track hover position for preview
  const rect = canvasEls.level.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const tileSize = 16;
  const levelW = project.level[0]?.length || 20;
  const levelH = project.level.length;
  const offsetX = Math.max(0, Math.floor((640 - levelW*tileSize)/2));
  const offsetY = Math.max(0, Math.floor((480 - levelH*tileSize)/2));
  const col = Math.floor((x - offsetX) / tileSize);
  const row = Math.floor((y - offsetY) / tileSize);
  levelEditor.hoverCol = col;
  levelEditor.hoverRow = row;
  if(!levelEditor.mouseDown) renderCurrentMode();
  // Draw preview on top if valid
  if(!(col<0||col>=levelW||row<0||row>=levelH) && levelEditor.selectedTileId>0 && !levelEditor.placingStart) {
    // This is handled in the render function by checking hover state
  }
});
```

Add after level rendering in `renderCurrentMode`:
```js
  // Hover preview
  if(levelEditor.hoverCol!==undefined && levelEditor.hoverRow!==undefined) {
    const hc = levelEditor.hoverCol, hr = levelEditor.hoverRow;
    if(hc>=0 && hc<levelW && hr>=0 && hr<levelH && levelEditor.selectedTileId>0 && !levelEditor.placingStart) {
      const tile = project.tiles.find(t=>t.id===levelEditor.selectedTileId);
      if(tile) {
        ctx.globalAlpha = 0.5;
        drawPixelGrid(ctx, offsetX+hc*tileSize, offsetY+hr*tileSize, tileSize, tile.pixels, 16, 16, project.palette, false);
        ctx.globalAlpha = 1;
      }
    }
  }
```

- [ ] **Step 5: Test level editor**

Open `index.html`, click "Level Editor". Verify:
- Level grid is visible with default ground row
- Tile palette thumbnails in toolbar
- Click a tile, then click on level grid — tile appears
- Right-click on tile — removes it
- "Set Start" tool — click on level to move the red S marker
- Semi-transparent preview follows cursor when placing
- Toggle Place/Erase mode button works

Take screenshot.

---

### Task 5: Save, Load, and Export

**Files:**
- Modify: `index.html` (implement save/load/export stubs)

**Interfaces:**
- Consumes: `project` data (tiles, level, playerSprite, playerStart, palette, metadata)
- Produces: JSON download, JSON upload restore, standalone playable HTML export

- [ ] **Step 1: Implement saveProject**

```js
function saveProject() {
  const data = JSON.stringify(project);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (project.metadata.name||'level')+'.json';
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Implement loadProject**

```js
function loadProject(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      Object.assign(project, data);
      // Restore default tiles if empty
      if(project.tiles.length===0) updateDefaultTiles();
      // Ensure level array exists
      if(!project.level.length) {
        project.level = Array.from({length:15}, (_,r) =>
          Array.from({length:20}, (_,c) => r===14 ? 1 : 0)
        );
      }
      // Ensure player sprite
      if(!project.playerSprite || !project.playerSprite.pixels || !project.playerSprite.pixels.length) {
        project.playerSprite = {width:16, height:32, pixels:new Array(512).fill(null)};
      }
      switchMode(currentMode);
    } catch(err) {
      alert('Failed to load project: '+err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
```

- [ ] **Step 3: Implement exportHtml**

```js
function exportHtml() {
  const projectData = JSON.stringify(project);
  // Generate a minimal playable HTML that only includes the play mode
  // inline the project data into the file
  const exportDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${project.metadata.name || 'My Game'} — Playable</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#1a1a2e;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:monospace}
  .game-wrap{background:#000;border:2px solid #0f3460;border-radius:8px;padding:8px;text-align:center}
  canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
  h2{color:#e94560;margin-bottom:8px}
  .controls{color:#aaa;margin-top:8px;font-size:12px}
</style>
</head>
<body>
<div class="game-wrap">
  <h2>${project.metadata.name || 'My Game'}</h2>
  <canvas id="game" width="320" height="240"></canvas>
  <div class="controls">Arrow keys to move, Space/Up to jump</div>
</div>
<script>
  const project = ${projectData};
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const TILE = 16;
  const COLS = project.level[0].length;
  const ROWS = project.level.length;
  const SCALE = Math.min(canvas.width / (COLS * TILE), canvas.height / (ROWS * TILE), 3);

  const player = { x: project.playerStart.col*TILE, y: project.playerStart.row*TILE, vx:0, vy:0, onGround:false, jumping:false };
  const keys = {};
  const GRAVITY = 0.5;
  const MOVE_SPEED = 3;
  const JUMP_VEL = -8;
  const MAX_FALL = 10;

  let camera = {x:0, y:0};

  document.addEventListener('keydown', e=>{ keys[e.key]=true; if(['ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault(); });
  document.addEventListener('keyup', e=>{ keys[e.key]=false; });

  function isSolid(col, row) {
    if(col<0||col>=COLS||row<0||row>=ROWS) return row>=ROWS; // bottom of screen is solid
    const id = project.level[row][col];
    return id > 0;
  }

  function getTile(col, row) {
    if(col<0||col>=COLS||row<0||row>=ROWS) return null;
    return project.tiles.find(t=>t.id===project.level[row][col]);
  }

  function drawPixelGrid(ox, oy, sz, pixels, gw, gh) {
    for(let py=0;py<gh;py++) for(let px=0;px<gw;px++) {
      const ci = pixels[py*gw+px];
      if(ci!==null && ci!==undefined) {
        ctx.fillStyle = project.palette[ci];
        ctx.fillRect(ox+px*sz, oy+py*sz, sz, sz);
      }
    }
  }

  function update() {
    // Horizontal
    let mx = 0;
    if(keys['ArrowLeft']) mx = -1;
    if(keys['ArrowRight']) mx = 1;
    player.vx = mx * MOVE_SPEED;

    // Jump
    if((keys[' ']||keys['ArrowUp']) && player.onGround) {
      player.vy = JUMP_VEL;
      player.onGround = false;
      player.jumping = true;
    }
    if(!(keys[' ']||keys['ArrowUp']) && player.vy < 0) {
      player.vy *= 0.85; // variable height — cut jump short on release
      player.jumping = false;
    }
    if(player.vy < -8) player.vy = -8;

    // Gravity
    player.vy += GRAVITY;
    if(player.vy > MAX_FALL) player.vy = MAX_FALL;

    // Move X, resolve X
    player.x += player.vx;
    resolveCollisionX();

    // Move Y, resolve Y
    player.y += player.vy;
    resolveCollisionY();

    // Player bounds within level
    const playerW = 12, playerH = 28;
    const playerOffX = 2, playerOffY = 4;

    function getPlayerTiles() {
      const left = Math.floor((player.x+playerOffX)/TILE);
      const right = Math.floor((player.x+playerOffX+playerW-1)/TILE);
      const top = Math.floor((player.y+playerOffY)/TILE);
      const bottom = Math.floor((player.y+playerOffY+playerH-1)/TILE);
      return {left,right,top,bottom};
    }

    function resolveCollisionX() {
      const {left,right,top,bottom} = getPlayerTiles();
      if(player.vx > 0) {
        if(isSolid(right, top)||isSolid(right, bottom)) {
          player.x = right*TILE - playerOffX - playerW;
          player.vx = 0;
        }
      } else if(player.vx < 0) {
        if(isSolid(left, top)||isSolid(left, bottom)) {
          player.x = (left+1)*TILE - playerOffX;
          player.vx = 0;
        }
      }
    }

    function resolveCollisionY() {
      const {left,right,top,bottom} = getPlayerTiles();
      if(player.vy > 0) {
        if(isSolid(left, bottom)||isSolid(right, bottom)) {
          player.y = bottom*TILE - playerOffY - playerH;
          player.vy = 0;
          player.onGround = true;
        }
      } else if(player.vy < 0) {
        if(isSolid(left, top)||isSolid(right, top)) {
          player.y = (top+1)*TILE - playerOffY;
          player.vy = 0;
        }
      }
      // Check if still on ground next frame
      const below = getPlayerTiles().bottom+1;
      if(player.onGround && !isSolid(left, below) && !isSolid(right, below)) {
        player.onGround = false;
      }
    }
  }

  function render() {
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    camera.x = player.x - canvas.width/2 + 8;
    camera.y = player.y - canvas.height/2 + 16;
    if(camera.x<0)camera.x=0;
    if(camera.y<0)camera.y=0;
    const maxCamX = COLS*TILE - canvas.width;
    const maxCamY = ROWS*TILE - canvas.height;
    if(camera.x>maxCamX)camera.x=Math.max(0,maxCamX);
    if(camera.y>maxCamY)camera.y=Math.max(0,maxCamY);

    ctx.save();
    ctx.translate(-camera.x*SCALE, -camera.y*SCALE);
    ctx.scale(SCALE, SCALE);

    // Draw level
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
      const tile = project.tiles.find(t=>t.id===project.level[r][c]);
      if(tile) drawPixelGrid(c*TILE, r*TILE, TILE, tile.pixels, 16, 16);
    }

    // Draw player
    const pOffX = 2, pOffY = 4;
    drawPixelGrid(player.x, player.y, TILE, project.playerSprite.pixels, 16, 32);

    ctx.restore();
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  loop();
</script>
</body>
</html>
  `.trim();

  const blob = new Blob([exportDoc], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (project.metadata.name||'game')+'.html';
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Test save/load/export**

1. Draw some custom tiles, build a level, draw a sprite
2. Click Save — verify `.json` file downloads
3. Reload the page fresh (blank state)
4. Click Load — select the saved JSON — verify tiles, level, sprite all restored
5. Click Export Playable HTML — verify `.html` file downloads
6. Open exported HTML in browser — verify game renders and is playable

---

### Task 6: Play mode — game loop, rendering, input, camera, physics

**Files:**
- Modify: `index.html` (add play mode rendering and game engine)

**Interfaces:**
- Consumes: `project` data, `project.playerSprite`, `project.level`, `project.playerStart`, `project.palette`
- Produces: Play mode with full game loop (60fps rAF), keyboard controls, scrolling camera, platformer physics

- [ ] **Step 1: Add play mode state**

```js
let playState = {
  player: { x:0, y:0, vx:0, vy:0, onGround:false, jumping:false, jumpHeld:false },
  camera: { x:0, y:0 },
  keys: {},
  running: false,
  lastTime: 0,
  frameCount: 0
};

const PHYS = {
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

- [ ] **Step 2: Implement physics functions**

Add inside the script block, before `renderCurrentMode`:

```js
function isSolidTile(col, row) {
  const cols = project.level[0]?.length || 20;
  const rows = project.level.length;
  if(col<0||col>=cols||row<0||row>=rows) return row >= rows; // ground below level
  return project.level[row][col] > 0;
}

function getPlayerBox() {
  const p = playState.player;
  return {
    left: Math.floor((p.x + PHYS.PLAYER_OFF_X) / 16),
    right: Math.floor((p.x + PHYS.PLAYER_OFF_X + PHYS.PLAYER_W - 1) / 16),
    top: Math.floor((p.y + PHYS.PLAYER_OFF_Y) / 16),
    bottom: Math.floor((p.y + PHYS.PLAYER_OFF_Y + PHYS.PLAYER_H - 1) / 16)
  };
}

function resolveCollisionX() {
  const p = playState.player;
  const box = getPlayerBox();
  if(p.vx > 0) {
    if(isSolidTile(box.right, box.top) || isSolidTile(box.right, box.bottom)) {
      p.x = box.right * 16 - PHYS.PLAYER_OFF_X - PHYS.PLAYER_W;
      p.vx = 0;
    }
  } else if(p.vx < 0) {
    if(isSolidTile(box.left, box.top) || isSolidTile(box.left, box.bottom)) {
      p.x = (box.left + 1) * 16 - PHYS.PLAYER_OFF_X;
      p.vx = 0;
    }
  }
}

function resolveCollisionY() {
  const p = playState.player;
  const box = getPlayerBox();
  if(p.vy > 0) {
    if(isSolidTile(box.left, box.bottom) || isSolidTile(box.right, box.bottom)) {
      p.y = box.bottom * 16 - PHYS.PLAYER_OFF_Y - PHYS.PLAYER_H;
      p.vy = 0;
      p.onGround = true;
    }
  } else if(p.vy < 0) {
    if(isSolidTile(box.left, box.top) || isSolidTile(box.right, box.top)) {
      p.y = (box.top + 1) * 16 - PHYS.PLAYER_OFF_Y;
      p.vy = 0;
    }
  }
  // Check if ground disappeared
  if(p.onGround) {
    const b = getPlayerBox();
    if(!isSolidTile(b.left, b.bottom+1) && !isSolidTile(b.right, b.bottom+1)) {
      p.onGround = false;
    }
  }
}

function updatePlay() {
  const p = playState.player;
  const keys = playState.keys;

  // Horizontal
  let mx = 0;
  if(keys['ArrowLeft']) mx = -1;
  if(keys['ArrowRight']) mx = 1;
  p.vx = mx * PHYS.MOVE_SPEED;

  // Jump
  const jumpPressed = keys[' '] || keys['ArrowUp'];
  if(jumpPressed && p.onGround) {
    p.vy = PHYS.JUMP_VEL;
    p.onGround = false;
    p.jumping = true;
  }
  if(!jumpPressed && p.vy < 0) {
    p.vy *= 0.85; // variable jump height
    p.jumping = false;
  }
  if(p.vy < -8) p.vy = -8;

  // Gravity
  p.vy += PHYS.GRAVITY;
  if(p.vy > PHYS.MAX_FALL) p.vy = PHYS.MAX_FALL;

  // Move X then Y
  p.x += p.vx;
  resolveCollisionX();
  p.y += p.vy;
  resolveCollisionY();

  // Camera
  const cols = project.level[0]?.length || 20;
  const rows = project.level.length;
  const targetCX = p.x - 640/2 + 8;
  const targetCY = p.y - 480/2 + 16;
  playState.camera.x = Math.max(0, Math.min(targetCX, cols*16 - 640));
  playState.camera.y = Math.max(0, Math.min(targetCY, rows*16 - 480));
  playState.frameCount++;
}
```

- [ ] **Step 3: Implement play mode rendering**

Add to `renderCurrentMode`:
```js
else if(currentMode === 'play') {
  renderPlay(ctx);
}
```

```js
function renderPlay(ctx) {
  const p = playState.player;
  const cam = playState.camera;
  const cols = project.level[0]?.length || 20;
  const rows = project.level.length;

  // Sky background
  ctx.fillStyle = '#5c94fc';
  ctx.fillRect(0, 0, 640, 480);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  // Tiles
  const startCol = Math.floor(cam.x/16);
  const endCol = Math.ceil((cam.x+640)/16)+1;
  const startRow = Math.floor(cam.y/16);
  const endRow = Math.ceil((cam.y+480)/16)+1;

  for(let r=Math.max(0,startRow); r<Math.min(rows,endRow); r++) {
    for(let c=Math.max(0,startCol); c<Math.min(cols,endCol); c++) {
      const tile = project.tiles.find(t=>t.id===project.level[r][c]);
      if(tile && tile.id>0) {
        drawPixelGrid(ctx, c*16, r*16, 16, tile.pixels, 16, 16, project.palette, false);
      }
    }
  }

  // Player
  drawPixelGrid(ctx, p.x, p.y, 16, project.playerSprite.pixels, 16, 32, project.palette, false);

  ctx.restore();
}
```

- [ ] **Step 4: Wire up keyboard + game loop + mode init**

```js
document.addEventListener('keydown', function(e) {
  if(currentMode !== 'play') return;
  playState.keys[e.key] = true;
  if(['ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', function(e) {
  playState.keys[e.key] = false;
});
```

Play mode init:
```js
modeInit.play = function() {
  const p = playState.player;
  p.x = project.playerStart.col * 16;
  p.y = project.playerStart.row * 16;
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.jumping = false;
  playState.camera = {x:0, y:0};
  playState.running = true;
  playState.frameCount = 0;

  // Show controls in toolbar
  const tb = document.getElementById('toolbar');
  tb.innerHTML = '<span style="color:#aaa;font-size:13px">Arrow keys: Move &nbsp; Space/Up: Jump &nbsp; Tab back to editor</span>';
};
```

Game loop runner:
```js
function gameLoop() {
  if(currentMode === 'play' && playState.running) {
    updatePlay();
    renderCurrentMode();
  }
  requestAnimationFrame(gameLoop);
}

// Start the game loop (runs always, only does work in play mode)
// Call after script initialization
```

Replace the final block in the script:
```js
updateDefaultTiles();
switchMode('tile');
// Start render/game loop
function mainLoop() {
  if(currentMode === 'play') {
    updatePlay();
    renderCurrentMode();
  }
  requestAnimationFrame(mainLoop);
}
mainLoop();
```

- [ ] **Step 5: Handle tab-away pause**

When switching away from play mode, pause the game:
```js
function switchMode(mode) {
  if(currentMode === 'play' && mode !== 'play') {
    playState.running = false;
  }
  currentMode = mode;
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  Object.keys(canvasEls).forEach(k => canvasEls[k].classList.toggle('active', k === mode));
  initMode(mode);
  renderCurrentMode();
}
```

- [ ] **Step 6: Test play mode**

1. Click "Play" tab — verify player renders at start position, level renders with sky background
2. Press Right arrow — player moves right, camera follows
3. Press Space — player jumps, variable height works (tap vs hold)
4. Walk into wall — player stops, can't walk through
5. Walk off platform — player falls with gravity
6. Land on ground — player can jump again
7. Camera stays within level bounds
8. Tab away pauses, tab back resumes with correct state

Take screenshot of player mid-jump.

---

### Task 7: __TEST__ API + Playwright validation script

**Files:**
- Create: `test/game-test.mjs`
- Modify: `index.html` (add `window.__TEST__` API behind ?test=true)

**Interfaces:**
- Consumes: Task 6's play mode with physics, project data, game loop
- Produces: Automated validation via `npx playwright test`

- [ ] **Step 1: Add __TEST__ API to index.html**

Add at the bottom of `<script>`, before `updateDefaultTiles()`:

```js
// --- Test API (only active with ?test=true) ---
if(window.location.search.includes('test=true')) {
  window.__TEST__ = {
    getPlayerPos: () => ({x: playState.player.x, y: playState.player.y}),
    getPlayerVX: () => playState.player.vx,
    getPlayerVY: () => playState.player.vy,
    getPlayerOnGround: () => playState.player.onGround,
    getCamera: () => ({x: playState.camera.x, y: playState.camera.y}),
    getLevelAt: (col, row) => {
      if(row<0||row>=project.level.length||col<0||col>=project.level[0].length) return -1;
      return project.level[row][col];
    },
    getTileCount: () => project.tiles.length,
    getTileName: (id) => { const t = project.tiles.find(t=>t.id===id); return t?t.name:null; },
    getFrameCount: () => playState.frameCount,
    getLevelSize: () => ({cols: project.level[0]?.length||0, rows: project.level.length}),
    isGrounded: () => playState.player.onGround,
    getPlayer: () => ({...playState.player}),
    resetPlayState: () => {
      const p = playState.player;
      p.x = project.playerStart.col * 16;
      p.y = project.playerStart.row * 16;
      p.vx = 0; p.vy = 0; p.onGround = false; p.jumping = false;
      playState.frameCount = 0;
    },
    getPalette: () => [...project.palette]
  };
}
```

- [ ] **Step 2: Create test project fixture**

Add in the `if(test)` block — a pre-built level designed for testing:

```js
if(window.location.search.includes('test=true')) {
  // Override project with test fixture
  testFixture();
  // ... (__TEST__ API as above)
}

function testFixture() {
  // Create test tiles
  project.tiles = [
    {id:0,name:'Air',pixels:new Array(256).fill(null)},
    {id:1,name:'Ground',pixels:new Array(256).fill(6)},
    {id:2,name:'Brick',pixels:new Array(256).fill(2)}
  ];

  // Build test level: 20x15
  // Row 14: full ground
  // Platform at row 10: cols 4-6
  // Wall at cols 7-10, rows 12-14  (3-tile high wall)
  // Gap in ground at cols 8-9 (to test falling)
  // Player starts at col 1, row 13
  project.level = Array.from({length:15}, (_,r) => {
    return Array.from({length:20}, (_,c) => {
      if(r===14 && (c<8||c>9)) return 1; // ground with gap at 8,9
      if(r===10 && c>=4 && c<=6) return 1; // platform
      if(r>=12 && r<=14 && c>=7 && c<=10) return 2; // wall
      return 0;
    });
  });

  project.playerStart = {col:1, row:13};

  // Player sprite: simple character shape
  const sprite = new Array(512).fill(null);
  for(let r=0;r<32;r++) for(let c=0;c<16;c++) {
    const inside = c>=2 && c<14 && r>=2 && r<30;
    sprite[r*16+c] = inside ? 0 : null;
  }
  project.playerSprite = {width:16, height:32, pixels:sprite};
}
```

Note: `testFixture()` must be called before `updateDefaultTiles()` in the initialization path. Update init:

```js
if(window.location.search.includes('test=true')) {
  testFixture();
  window.__TEST__ = { /* ... */ };
} else {
  updateDefaultTiles();
}
switchMode('tile');
mainLoop();
```

- [ ] **Step 3: Install Playwright**

```bash
cd /Users/alec/git/superpowers-2d-retro-game-maker
npm init -y
npm install --save-dev playwright
npx playwright install chromium
```

- [ ] **Step 4: Write test/game-test.mjs**

```js
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.resolve(__dirname, '../index.html');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForFrames(page, count) {
  // Wait for N animation frames by tracking __TEST__.getFrameCount()
  const start = await page.evaluate(() => window.__TEST__.getFrameCount());
  const target = start + count;
  let elapsed = 0;
  const timeout = count * 20 + 2000; // generous timeout per frame
  while (elapsed < timeout) {
    const current = await page.evaluate(() => window.__TEST__.getFrameCount());
    if (current >= target) return;
    await sleep(16);
    elapsed += 16;
  }
  throw new Error(`Timeout waiting for ${count} frames (start=${start}, current=?)`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 800, height: 700 } });
  const page = await context.newPage();

  // Navigate to index.html with test flag
  await page.goto('file://' + INDEX_PATH + '?test=true');
  await sleep(500);

  // Screenshot 1: Initial state
  await page.screenshot({ path: 'test/screenshots/01-initial.png', fullPage: false });
  console.log('PASS: Initial page loaded');

  // Switch to Play mode
  await page.click('button[data-mode="play"]');
  await sleep(300);
  await page.screenshot({ path: 'test/screenshots/02-play-mode.png', fullPage: false });
  console.log('PASS: Play mode loaded');

  // Verify player is at start position
  let pos = await page.evaluate(() => window.__TEST__.getPlayerPos());
  console.log(`  Player start: (${pos.x}, ${pos.y})`);
  if (pos.x !== 16) throw new Error(`Expected start x=16, got ${pos.x}`);
  if (pos.y !== 208) throw new Error(`Expected start y=208, got ${pos.y}`);
  console.log('PASS: Player at correct start position');

  // Test 1: Move right
  await page.keyboard.down('ArrowRight');
  await waitForFrames(page, 60); // ~1 second
  await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: 'test/screenshots/03-moved-right.png', fullPage: false });
  pos = await page.evaluate(() => window.__TEST__.getPlayerPos());
  if (pos.x <= 16) throw new Error(`Expected player X to increase, got ${pos.x}`);
  console.log(`  Player X after moving right: ${pos.x}`);
  console.log('PASS: Player moves right');

  // Test 2: Jump
  await page.keyboard.press('Space');
  await waitForFrames(page, 15); // ~250ms — should be in the air
  const airY = await page.evaluate(() => window.__TEST__.getPlayerPos().y);
  console.log(`  Player Y during jump: ${airY}`);
  if (airY >= 208) throw new Error(`Expected player to be in the air (Y < 208), got ${airY}`);
  console.log('PASS: Player jumps upward');

  // Wait for landing
  await waitForFrames(page, 90);
  const landed = await page.evaluate(() => window.__TEST__.isGrounded());
  if (!landed) throw new Error('Expected player to land back on ground');
  console.log('PASS: Player lands after jump');

  // Test 3: Gravity / fall
  // Walk right toward the gap in ground at cols 8-9
  await page.keyboard.down('ArrowRight');
  await waitForFrames(page, 180); // ~3 seconds to reach gap
  await page.keyboard.up('ArrowRight');

  // Wait a bit for falling
  await waitForFrames(page, 60);
  const fallPos = await page.evaluate(() => window.__TEST__.getPlayerPos());
  console.log(`  Player after gap (should be falling): (${fallPos.x}, ${fallPos.y})`);

  // Player should have fallen below ground level (Y > 240)
  if (fallPos.y <= 224) throw new Error(`Expected player to fall below ground, Y=${fallPos.y}`);
  console.log('PASS: Gravity pulls player down through gaps');

  // Reset for collision test
  await page.evaluate(() => window.__TEST__.resetPlayState());
  await waitForFrames(page, 30);

  // Test 4: Wall collision
  // Walk right toward wall at cols 7-10
  await page.keyboard.down('ArrowRight');
  await waitForFrames(page, 300); // walk to wall and try to go through
  await page.keyboard.up('ArrowRight');
  const wallPos = await page.evaluate(() => window.__TEST__.getPlayerPos());
  console.log(`  Player at wall: (${wallPos.x}, ${wallPos.y})`);
  // Player should be stopped by wall, not past it
  // Wall starts at col 7 = 7*16 = 112px. Player width ~12px, so max X before wall = ~100
  if (wallPos.x > 115) throw new Error(`Expected player to stop at wall, X=${wallPos.x}`);
  console.log('PASS: Wall collision stops player');

  // Screenshot final
  await page.screenshot({ path: 'test/screenshots/04-final.png', fullPage: false });
  console.log('\nAll tests passed!');

  await browser.close();
}

run().catch(err => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
```

- [ ] **Step 5: Create screenshots directory and run test**

```bash
mkdir -p /Users/alec/git/superpowers-2d-retro-game-maker/test/screenshots
cd /Users/alec/git/superpowers-2d-retro-game-maker
npx playwright test test/game-test.mjs
```

If it fails because playwright expects a different format, also provide a simpler runner:
```js
// test/run-test.mjs — wrap the import
import './game-test.mjs';
```

Run: `node test/run-test.mjs` (this doesn't need the Playwright test runner, just Node).

Wait — the script I wrote uses `import` and runs via `node`, not `npx playwright test`. Let me make it consistent — either make it a Playwright test file (using `test` and `expect`) or a plain Node script (using `chromium.launch` directly). Since I'm using `chromium.launch()` directly with manual assertions, it's a plain Node script. Run it with `node test/game-test.mjs`.

```bash
cd /Users/alec/git/superpowers-2d-retro-game-maker
node test/game-test.mjs
```

Expected: All assertions pass. Screenshots saved to `test/screenshots/`.

- [ ] **Step 6: Add package.json scripts**

Add to `package.json`:
```json
{
  "scripts": {
    "test": "node test/game-test.mjs"
  }
}
```

- [ ] **Step 7: Run test and verify all pass**

Run and capture output. Fix any issues found.

---

### Task 8: Final polish and edge cases

**Files:**
- Modify: `index.html`
- Modify: `test/game-test.mjs`

- [ ] **Step 1: Handle edge cases**

1. Empty level (no tiles added, only air) — level editor should still render grid
2. Delete last non-air tile — gracefully handled
3. Load corrupt JSON — shows error alert
4. Rapid tab switching while playing — play state resets properly
5. Canvas sizing on smaller screens — basic responsiveness
6. Player falling infinitely — clamp Y position to level bottom + a few tiles

- [ ] **Step 2: Visual polish**

1. Tab icons or color-coded active states
2. Toolbar spacing and visual grouping
3. Player sprite stands out against sky background
4. Cursor changes to crosshair in editors

- [ ] **Step 3: Final test run**

```bash
node test/game-test.mjs
```

All assertions pass, all screenshots show correct behavior.
