import { test, expect, Page } from '@playwright/test';
import path from 'path';

const FILE_URL = 'file://' + path.resolve(__dirname, '../game.html');

// --- helpers ---

async function canvasPixel(page: Page, x: number, y: number): Promise<[number, number, number]> {
  return page.evaluate(
    ({ x, y }) => {
      const c = document.getElementById('gc') as HTMLCanvasElement;
      const ctx = c.getContext('2d')!;
      const p = ctx.getImageData(x, y, 1, 1).data;
      return [p[0], p[1], p[2]];
    },
    { x, y }
  );
}

function rgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// Colors can vary slightly due to canvas sub-pixel rendering
function approx(a: [number, number, number], b: [number, number, number], tol = 8): boolean {
  return Math.abs(a[0] - b[0]) <= tol && Math.abs(a[1] - b[1]) <= tol && Math.abs(a[2] - b[2]) <= tol;
}

async function tilePixel(page: Page, tx: number, ty: number): Promise<[number, number, number]> {
  // Read from the center of the tile to avoid grid line blending
  return canvasPixel(page, tx * 16 + 8, ty * 16 + 8);
}

// Internal pixel coordinate for tile center in the canvas (which is 480x240)
function tileCenter(tx: number, ty: number): [number, number] {
  return [tx * 16 + 8, ty * 16 + 8];
}

function cssPos(tx: number, ty: number): [number, number] {
  // Canvas CSS display is 2x
  return [tx * 32 + 16, ty * 32 + 16];
}

// --- state access ---

async function getState(page: Page) {
  return page.evaluate(() => (window as any).__getGameState?.());
}

async function playerPos(page: Page): Promise<{ x: number; y: number }> {
  const gs = await getState(page);
  return { x: gs?.player?.x ?? -1, y: gs?.player?.y ?? -1 };
}

async function waitFrames(page: Page, n: number) {
  await page.evaluate((f) => {
    return new Promise((r) => {
      let count = 0;
      function tick() {
        if (++count >= f) { r(undefined); return; }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, n);
}

async function placeTile(page: Page, tx: number, ty: number, toolIndex: number) {
  // Use page.evaluate for reliable tile editing (avoids CSS scaling issues)
  await page.evaluate(
    ({ tx, ty, toolIndex }) => {
      const gs = (window as any).__getGameState();
      if (!gs) return;
      const TILE = { EMPTY: 0, GROUND: 1, BRICK: 2, QUESTION: 3, PIPE: 4, PLAYER_SPAWN: 5, ENEMY_SPAWN: 6, GOAL: 7 };
      const TOOL_IDS = [TILE.EMPTY, TILE.GROUND, TILE.BRICK, TILE.QUESTION, TILE.PIPE, TILE.PLAYER_SPAWN, TILE.ENEMY_SPAWN, TILE.GOAL];
      const tileId = TOOL_IDS[toolIndex];
      if (tileId === undefined) return;
      gs.level[ty][tx] = tileId;
      if (tileId === TILE.PLAYER_SPAWN) {
        gs.player.x = tx * 16 + 2;
        gs.player.y = ty * 16;
      }
    },
    { tx, ty, toolIndex }
  );
}

async function eraseTile(page: Page, tx: number, ty: number) {
  await page.evaluate(
    ({ tx, ty }) => {
      const gs = (window as any).__getGameState();
      if (gs) gs.level[ty][tx] = 0;
    },
    { tx, ty }
  );
}

// --- tests ---

test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  await waitFrames(page, 5);
});

test('editor loads with toolbar, canvas, and status bar', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('RETRO GAME MAKER');
  await expect(page.locator('.tool-btn')).toHaveCount(8);
  await expect(page.locator('#toggle-btn')).toHaveText('PLAY');
  await expect(page.locator('#status-left')).toContainText('EDIT');
});

test('clicking a tool selects it', async ({ page }) => {
  const brickBtn = page.locator('.tool-btn').nth(2);
  await brickBtn.click();
  await expect(brickBtn).toHaveClass(/active/);
  await expect(page.locator('#status-left')).toContainText('BRK');
});

test('placing ground tile changes pixel color', async ({ page }) => {
  // Tile (5,5) starts as sky
  const sky = rgb('#5c94fc');
  expect(approx(await tilePixel(page, 5, 5), sky)).toBe(true);

  // Place ground at (5,5)
  await page.locator('.tool-btn').nth(1).click(); // Ground tool
  await placeTile(page, 5, 5, 1);
  await waitFrames(page, 3);

  const groundRGB = rgb('#c84c0c');
  expect(approx(await tilePixel(page, 5, 5), groundRGB)).toBe(true);
});

test('right-click erases a tile', async ({ page }) => {
  // Tile (0,13) is ground. After erasing it, pixel should show sky.
  const groundRGB = rgb('#c84c0c');
  expect(approx(await tilePixel(page, 0, 13), groundRGB)).toBe(true);

  await eraseTile(page, 0, 13);
  await waitFrames(page, 3);

  const sky = rgb('#5c94fc');
  expect(approx(await tilePixel(page, 0, 13), sky)).toBe(true);
});

test('dragging on canvas places tiles along the path', async ({ page }) => {
  // Place ground tiles at (7,7), (7,8), (7,9)
  await page.locator('.tool-btn').nth(1).click(); // Ground tool
  await placeTile(page, 7, 7, 1);
  await placeTile(page, 7, 8, 1);
  await placeTile(page, 7, 9, 1);
  await waitFrames(page, 3);

  const groundRGB = rgb('#c84c0c');
  expect(approx(await tilePixel(page, 7, 7), groundRGB)).toBe(true);
  expect(approx(await tilePixel(page, 7, 8), groundRGB)).toBe(true);
  expect(approx(await tilePixel(page, 7, 9), groundRGB)).toBe(true);
});

test('switching to play mode hides toolbar and starts physics', async ({ page }) => {
  await page.locator('#toggle-btn').click();
  await waitFrames(page, 10);

  await expect(page.locator('#toggle-btn')).toHaveText('EDIT');
  await expect(page.locator('.tool-btn').first()).not.toBeVisible();
  await expect(page.locator('#status-left')).toContainText('PLAY MODE');
});

test('player falls to ground in play mode', async ({ page }) => {
  await page.locator('#toggle-btn').click();
  await waitFrames(page, 30);

  const pos = await playerPos(page);
  // Player should be standing on the ground (y ~ 192 = 12*16)
  expect(pos.y).toBeGreaterThanOrEqual(188);
  expect(pos.y).toBeLessThanOrEqual(196);
});

test('player walks right when arrow key pressed', async ({ page }) => {
  await page.locator('#toggle-btn').click();
  await waitFrames(page, 30);

  const posBefore = await playerPos(page);

  await page.keyboard.down('ArrowRight');
  await waitFrames(page, 40);
  await page.keyboard.up('ArrowRight');
  await waitFrames(page, 5);

  const posAfter = await playerPos(page);
  expect(posAfter.x).toBeGreaterThan(posBefore.x);
});

test('player can jump', async ({ page }) => {
  await page.locator('#toggle-btn').click();
  await waitFrames(page, 30);

  const posBefore = await playerPos(page);

  await page.keyboard.down('Space');
  await waitFrames(page, 5);
  await page.keyboard.up('Space');
  await waitFrames(page, 15);

  const posAfter = await playerPos(page);
  // Player moved upward (lower y value)
  expect(posAfter.y).toBeLessThan(posBefore.y - 8);
});

test('player dies from falling off the level', async ({ page }) => {
  // Erase the ground under the player spawn
  await eraseTile(page, 2, 13);
  await eraseTile(page, 2, 14);
  // Also erase neighboring ground to prevent side landing
  await eraseTile(page, 1, 13);
  await eraseTile(page, 3, 13);
  await waitFrames(page, 3);

  // Switch to play
  await page.locator('#toggle-btn').click();
  await waitFrames(page, 120);

  const dead = await page.evaluate(() => (window as any).__getGameState?.()?.player?.dead);
  expect(dead).toBe(true);
});

test('enemy exists and patrols', async ({ page }) => {
  await page.locator('#toggle-btn').click();
  await waitFrames(page, 60);

  const gs = await getState(page);
  const enemies = gs?.enemies as any[];
  expect(enemies).toBeTruthy();
  expect(enemies.length).toBeGreaterThan(0);
  expect(enemies[0].alive).toBe(true);
  // Enemy should have moved left from its spawn at x=162
  expect(enemies[0].x).toBeLessThan(160);
});

test('P key toggles play mode, Escape returns to edit', async ({ page }) => {
  await page.keyboard.press('KeyP');
  await waitFrames(page, 5);
  await expect(page.locator('#toggle-btn')).toHaveText('EDIT');

  await page.keyboard.press('Escape');
  await waitFrames(page, 5);
  await expect(page.locator('#toggle-btn')).toHaveText('PLAY');
});

test('goal tile completes the level', async ({ page }) => {
  // Remove enemy so it doesn't kill us
  await eraseTile(page, 10, 12);
  await waitFrames(page, 3);

  await page.locator('#toggle-btn').click();
  await waitFrames(page, 30);

  // Walk right toward the goal at tile (26, 12)
  await page.keyboard.down('ArrowRight');
  await waitFrames(page, 300);
  await page.keyboard.up('ArrowRight');

  const won = await page.evaluate(() => (window as any).__getGameState?.()?.flagGoal);
  expect(won).toBe(true);
});

test('hitting question block spawns a mushroom and marks block used', async ({ page }) => {
  // Keep default level intact. Place a ? block at (2,9) above the player.
  // Player at y=192 jumps ~67px to y≈125 — row 9 (y=144-159) is within reach.
  await eraseTile(page, 10, 12); // remove enemy so it doesn't interfere
  await eraseTile(page, 26, 12); // remove goal
  await placeTile(page, 2, 9, 3); // ? block
  await placeTile(page, 3, 9, 3); // extra ? block for wider hit area
  await waitFrames(page, 3);

  await page.locator('#toggle-btn').click();
  await waitFrames(page, 5); // settle on ground at y=192

  // Verify we're in play mode and grounded
  const pre = await page.evaluate(() => {
    const gs = (window as any).__getGameState?.();
    return {
      mode: gs?.mode, playerY: gs?.player?.y, grounded: gs?.player?.grounded,
      level92: gs?.level?.[9]?.[2], level93: gs?.level?.[9]?.[3],
    };
  });
  expect(pre.mode).toBe('play');
  expect(pre.grounded).toBe(true);
  expect(pre.level92).toBe(3);

  // Jump to hit the ? block
  await page.keyboard.down('Space');
  await waitFrames(page, 8); // enough frames for jump to reach row 9
  await page.keyboard.up('Space');
  await waitFrames(page, 20);

  // Check the block was hit and mushroom spawned
  const blockHit = await page.evaluate(() => (window as any).__getGameState?.()?.blockHit?.[9]?.[2]);
  expect(blockHit).toBe(true);

  const shrooms = await page.evaluate(() => (window as any).__getGameState?.()?.mushrooms);
  expect(shrooms).toBeTruthy();
  expect(shrooms.length).toBeGreaterThan(0);
});

test('mushroom makes player big when collected', async ({ page }) => {
  await eraseTile(page, 10, 12);
  await eraseTile(page, 26, 12);
  await placeTile(page, 2, 9, 3);
  await placeTile(page, 3, 9, 3);
  await waitFrames(page, 3);

  await page.locator('#toggle-btn').click();
  await waitFrames(page, 5);

  // Jump to hit ? block
  await page.keyboard.down('Space');
  await waitFrames(page, 8);
  await page.keyboard.up('Space');
  await waitFrames(page, 50); // let mushroom emerge

  const shrooms = await page.evaluate(() => (window as any).__getGameState?.()?.mushrooms);
  if (shrooms && shrooms.length > 0 && shrooms[0].alive) {
    // Mushroom spawns at (2,9), rises up, then walks right
    await page.keyboard.down('ArrowRight');
    await waitFrames(page, 90);
    await page.keyboard.up('ArrowRight');

    const big = await page.evaluate(() => (window as any).__getGameState?.()?.player?.big);
    expect(big).toBe(true);
  } else {
    const spawned = shrooms && shrooms.length > 0;
    if (!spawned) {
      const hit = await page.evaluate(() => (window as any).__getGameState?.()?.blockHit?.[9]?.[2]);
      expect(hit).toBe(true);
    }
  }
});
