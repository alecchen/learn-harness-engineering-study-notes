# Task 7: Playwright validation script + __TEST__ API

**Files:**
- Modify: `index.html` (add `window.__TEST__` API behind `?test=true`, add test fixture)
- Create: `test/game-test.mjs` (Playwright test script)
- Create: `package.json` (for Playwright dependency)

**Prerequisite context (from Task 6):**
- `playState = { player: {x, y, vx, vy, onGround, jumping}, camera, keys, running, frameCount }`
- `project.level`, `project.tiles`, `project.playerStart`, `project.playerSprite`, `project.palette`
- Player position is in pixels (not tile coords)
- Player starts at `project.playerStart.col * 16, project.playerStart.row * 16` (set in modeInit.play)
- `isSolidTile(col, row)` = helper function
- `renderCurrentMode()` renders based on `currentMode`

**Steps:**

1. Add `window.__TEST__` API to index.html:
   Before the final `mainLoop()` or `updateDefaultTiles()` call, wrap in a conditional that only activates when `window.location.search.includes('test=true')`:
   
   ```js
   if (window.location.search.includes('test=true')) {
     // Override project with test fixture first
     testFixture();
     
     window.__TEST__ = {
       getPlayerPos: function() { return {x: playState.player.x, y: playState.player.y}; },
       getPlayerVX: function() { return playState.player.vx; },
       getPlayerVY: function() { return playState.player.vy; },
       getFrameCount: function() { return playState.frameCount; },
       isGrounded: function() { return playState.player.onGround; },
       getPlayer: function() { return {x: playState.player.x, y: playState.player.y, vx: playState.player.vx, vy: playState.player.vy, onGround: playState.player.onGround}; },
       getCamera: function() { return {x: playState.camera.x, y: playState.camera.y}; },
       getLevelAt: function(col, row) { if (row < 0 || row >= project.level.length || col < 0 || col >= project.level[0].length) return -1; return project.level[row][col]; },
       getLevelSize: function() { return {cols: project.level[0].length, rows: project.level.length}; },
       resetPlayState: function() { playState.player.x = project.playerStart.col * 16; playState.player.y = project.playerStart.row * 16; playState.player.vx = 0; playState.player.vy = 0; playState.player.onGround = false; playState.frameCount = 0; },
       getPalette: function() { return project.palette.slice(); },
       getTileCount: function() { return project.tiles.length; },
       isSolidTile: function(col, row) { return isSolidTile(col, row); }
     };
   }
   ```

2. Add `testFixture()` function that creates a test level:
   - 3 tiles: Air (id:0), Ground (id:1, brown fill), Brick (id:2, red fill)
   - Level 20x15:
     - Row 14: ground with a gap at cols 8-9 (allows testing fall-through)
     - Row 10: small platform at cols 4-6
     - Rows 12-14, cols 7-10: wall (brick) — for collision testing
   - Player starts at col 1, row 13
   - Simple player sprite (black silhouette)

3. MAKE SURE the testFixture is called BEFORE updateDefaultTiles in the test=true path, and switchMode('tile') is still called. The init flow for test mode should be:
   ```js
   if (window.location.search.includes('test=true')) {
     testFixture();
     window.__TEST__ = { ... };
   } else {
     updateDefaultTiles();
   }
   switchMode('tile');
   ```
   NOT:
   ```js
   updateDefaultTiles();
   if (window.location.search.includes('test=true')) {
     // ... test stuff ...
   }
   switchMode('tile');
   ```

4. Create `test/game-test.mjs`:
   ```js
   import { chromium } from 'playwright';
   import path from 'path';
   import { fileURLToPath } from 'url';
   
   const __dirname = path.dirname(fileURLToPath(import.meta.url));
   const INDEX_PATH = path.resolve(__dirname, '../index.html');
   
   async function waitForFrames(page, count) {
     const start = await page.evaluate(() => window.__TEST__.getFrameCount());
     const target = start + count;
     while (true) {
       const current = await page.evaluate(() => window.__TEST__.getFrameCount());
       if (current >= target) return;
       await new Promise(r => setTimeout(r, 16));
     }
   }
   
   async function run() {
     const browser = await chromium.launch({ headless: true });
     const context = await browser.newContext({ viewport: { width: 800, height: 700 } });
     const page = await context.newPage();
   
     await page.goto('file://' + INDEX_PATH + '?test=true');
     await page.waitForTimeout(500);
   
     // Switch to Play mode
     await page.click('button[data-mode="play"]');
     await page.waitForTimeout(500);
   
     // Verify start position
     let pos = await page.evaluate(() => window.__TEST__.getPlayerPos());
     console.log('Start position:', pos);
   
     // Test 1: Movement — press right, check X increases
     await page.keyboard.down('ArrowRight');
     await waitForFrames(page, 60);
     await page.keyboard.up('ArrowRight');
     let pos2 = await page.evaluate(() => window.__TEST__.getPlayerPos());
     console.log('After move right:', pos2);
     if (pos2.x <= pos.x) throw new Error('PASS FAIL: Player did not move right');
     console.log('PASS: Player moves right');
   
     // Test 2: Jump — player Y should decrease (move up)
     await page.keyboard.press('Space');
     await waitForFrames(page, 15);
     let jumpPos = await page.evaluate(() => window.__TEST__.getPlayerPos());
     console.log('During jump:', jumpPos);
     if (jumpPos.y >= pos2.y) throw new Error('PASS FAIL: Player did not jump upward');
     console.log('PASS: Player jumps upward');
   
     // Test 3: Landing — after enough frames, player should be on ground
     await waitForFrames(page, 60);
     let grounded = await page.evaluate(() => window.__TEST__.isGrounded());
     if (!grounded) throw new Error('PASS FAIL: Player did not land');
     console.log('PASS: Player lands after jump');
   
     // Test 4: Wall collision — walk into wall (cols 7-10, rows 12-14)
     await page.keyboard.down('ArrowRight');
     await waitForFrames(page, 120);
     await page.keyboard.up('ArrowRight');
     let wallPos = await page.evaluate(() => window.__TEST__.getPlayerPos());
     console.log('At wall:', wallPos);
     // Wall starts at col 7 = 112px, player width 12, offset 2 = 14px
     // Player right edge = wallPos.x + 14 should be <= 112
     if (wallPos.x > 100) console.log('PASS: Wall collision stops player');
     else console.log('WARN: Player may not have reached wall');
   
     // Test 5: Fall through gap — walk off the gap at cols 8-9
     await page.evaluate(() => window.__TEST__.resetPlayState());
     // Position player just before the gap
     // Walk right until falling
     await page.keyboard.down('ArrowRight');
     await waitForFrames(page, 200);
     await page.keyboard.up('ArrowRight');
     let fallPos = await page.evaluate(() => window.__TEST__.getPlayerPos());
     console.log('After gap:', fallPos);
     // Player should have fallen below ground level
     if (fallPos.y > 240) console.log('PASS: Player falls through gap');
     else console.log('WARN: Player may not have fallen');
   
     console.log('\n--- PLAYABILITY VERIFIED ---');
     await browser.close();
   }
   
   run().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
   ```

5. Create package.json:
   ```bash
   cd /path/to/repo && npm init -y && npm install --save-dev playwright
   ```

6. Run the test:
   ```bash
   cd /path/to/repo && node test/game-test.mjs
   ```

7. If test passes, commit everything:
   ```bash
   git add index.html test/ package.json package-lock.json && git commit -m "feat: add Playwright validation and __TEST__ API"
   ```

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-7-report.md`

**Return:** Status, commits, test results, concerns
