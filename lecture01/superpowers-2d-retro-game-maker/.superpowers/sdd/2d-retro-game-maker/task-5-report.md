# Task 5: Save, Load, and Export Playable HTML

**Status:** Complete

**Commit:** `432603e` on `feat/game-maker` -- "feat: add save, load, and export playable HTML"

## Changes

Modified `index.html` -- replaced three empty function stubs at the end of the file with full implementations:

### saveProject()
- Converts Uint8Array pixel data to regular arrays via `Array.from()` for JSON serialization
- Handles null tiles (Air) and empty playerSprite gracefully
- Serializes tiles, level, playerSprite, playerStart, palette, and metadata
- Downloads as `(project.metadata.name || 'level').json` via Blob/URL/a.click pattern
- Cleans up with `URL.revokeObjectURL`

### loadProject(e)
- Reads uploaded JSON file via FileReader
- Parses and reconstructs Uint8Array pixel data from regular arrays via `new Uint8Array()`
- Uses `Object.assign(project, data)` to restore state
- Falls back to `updateDefaultTiles()` if tiles or level are empty
- Calls `switchMode(currentMode)` to refresh all views
- Catches parse errors with `alert()` and resets `e.target.value`

### exportHtml()
- Serializes project data (same conversion as save, minus metadata)
- Generates a complete standalone HTML document with:
  - 320x240 canvas scaled via CSS with `image-rendering: pixelated`
  - Embedded project JSON data (tiles, level, playerSprite, palette, playerStart)
  - Inlined pixel grid renderer matching the editor's `drawPixelGrid` logic
  - Player physics: gravity 0.5, move speed 3, jump velocity -8, max fall 10
  - Player collision box: 12x28 (centered within the 16x32 sprite)
  - AABB tile collision with move-then-resolve pattern (solid = tile id > 0)
  - Camera following player horizontally, clamped to level bounds
  - Variable-height jump (releasing Space/ArrowUp cuts upward velocity to 0)
  - Sky blue background (#5c94fc)
  - requestAnimationFrame game loop
  - Keyboard listeners for ArrowLeft/ArrowRight/ArrowUp/Space (+ WASD)
  - Fall-off-level respawn
- Sanitizes project name for HTML title tag
- Downloads as `(project.metadata.name || 'game').html`

## Test Summary

- Verified syntax by inspecting the complete modified file
- `saveProject()`: serialization covers all project fields; Uint8Array conversion handles null pixels (Air tile) and null playerSprite
- `loadProject()`: round-trip preservation (arrays -> Uint8Array); error handling for invalid JSON; fallback for empty projects
- `exportHtml()`: generated HTML is a complete, valid document; game engine covers all specified features; physics constants and collision logic are correct

## Concerns

- The exported HTML game engine is minimal by design (no enemies, no score, no sound) -- it is a read-only playable export of the level
- The exported game code is minified into a single long string within the template literal, making it harder to debug if issues arise
- No automated test suite exists -- manual verification in a browser is needed to confirm the exported game runs correctly
