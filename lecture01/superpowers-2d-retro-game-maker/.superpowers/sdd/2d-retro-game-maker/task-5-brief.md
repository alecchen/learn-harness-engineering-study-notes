# Task 5: Save, Load, and Export

**Files:**
- Modify: `index.html` (implement save, load, export stubs)

**Prerequisite context:**
- `var project` = all game data (tiles, level, playerSprite, playerStart, palette, metadata)
- Tiles: `project.tiles[N]` by index, `{id, pixels: Uint8Array(256), width: 16, height: 16, name}`
- Default tiles at indices 0-3: Air, Ground, Brick, Question
- Tile 0 (Air) has `pixels: null`
- Level: `project.level` = 15 rows x 20 cols of tile IDs
- `saveProject()`, `loadProject(e)`, `exportHtml()` — currently empty stubs
- Footer has the three buttons already wired to these functions
- Hidden file input: `id="loadInput"` for load

**Steps:**

1. Implement `saveProject()`:
   - Create a JSON-serializable copy of the project. Convert Uint8Array pixel data to regular arrays (e.g., `Array.from(pixels)`) since `JSON.stringify` can't serialize Uint8Array natively
   - `JSON.stringify` the copy
   - Create a Blob, create an Object URL, trigger download via `<a>` element
   - Filename: `(project.metadata.name || 'level') + '.json'`
   - Clean up with `URL.revokeObjectURL`

2. Implement `loadProject(e)`:
   - Get the file from `e.target.files[0]`
   - Read as text with FileReader
   - `JSON.parse` the text
   - Reconstruct Uint8Array pixel data from the regular arrays
   - `Object.assign(project, data)` to restore
   - If tiles or level are empty after load, call `updateDefaultTiles()` as fallback
   - Then `switchMode(currentMode)` to re-render
   - Show `alert()` on parse error
   - Reset `e.target.value`

3. Implement `exportHtml()`:
   - Serialize the project data (same array conversion as save)
   - Generate a standalone HTML string that embeds the project data
   - This HTML file contains ONLY play mode (no editor) — it renders the level and player, with keyboard controls and physics
   - Use blob download same as saveProject
   - The exported HTML should be self-contained: no external dependencies, inline CSS/JS
   - Filename: `(project.metadata.name || 'game') + '.html'`

   The exported HTML needs:
   - A canvas at 320x240 (NES resolution, scaled with CSS)
   - The embedded project JSON data
   - Player physics: gravity (0.5), jump (-8), move speed (3), max fall (10)
   - Tile-based collision (AABB, move-then-resolve pattern)
   - Keyboard event listeners for ArrowLeft/Right/Space/ArrowUp
   - Game loop with requestAnimationFrame
   - Camera following player
   - Level rendering using embedded tile pixel data
   - Player sprite rendering
   - Scaling to fit the 320x240 canvas

4. Commit:
   `git add index.html && git commit -m "feat: add save, load, and export playable HTML"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-5-report.md`

**Return:** Status, commits, test summary, concerns