# Task 2 Report: Pixel grid utility + color palette + Tile Editor

**Status: DONE**

## Commits

- `f89ef1b` — feat: add tile editor with pixel grid utility and pixel art tiles

## Changes

Modified `index.html` (266 insertions, 12 deletions across 459 lines).

1. **CSS**: Added `.toolbar-group`, `.swatch`, `.tile-thumb`, `.tile-label`, `.toolbar-input`, `.toolbar-btn` styles for the tile editor toolbar.

2. **`drawPixelGrid(ctx, offsetX, offsetY, cellSize, pixels, gridW, gridH, palette, showGrid)`**: General-purpose pixel grid renderer. Iterates over pixel data, draws filled rects for valid palette indices, and optionally draws semi-transparent grid lines.

3. **`tileEditor` state**: `{ selectedColor: 0, editingTileId: 1, mouseDown: false }`.

4. **`modeInit` dispatch**: Replaced empty `initMode(mode)` with `modeInit` object and dispatch `if (modeInit[mode]) modeInit[mode]()`.

5. **`modeInit.tile`**: Builds toolbar with:
   - 8 color swatch buttons from `project.palette`, selected color highlighted
   - Tile browser with 24x24 pixel art thumbnails (16x16 canvas at 1:1, CSS-scaled) and name labels for non-air tiles
   - [+New] button creating tiles at the next available index
   - [X] Delete button (cannot delete tile 0/air)
   - Tile name input field

6. **Canvas mouse handlers**: `mousedown`/`mousemove` (drag-paint), `mouseup`/`mouseleave` (release), `contextmenu` (prevent default). Left-click paints with `selectedColor`, right-click sets pixel to 0 (black). Grid mapped from `(192, 112)` with `cellSize=16`.

7. **Tile rendering in `renderCurrentMode`**: Draws 16x16 grid at `(192, 112)` with `cellSize=16`, grid lines, dark background area, red border, and label "Pixel grid (16x16) -- paint with palette". Other modes unchanged.

8. **Pixel art defaults**: Ground (brown + green top), Brick (red brick with brown mortar rows/columns), Question (yellow with black `?` mark). All tiles assigned `name` properties. Player sprite also gets `name: 'Player'`.

## Test Summary

Open in browser and verify:
- Tile editor shows 16x16 grid with Ground tile (brown + green top row)
- Color palette swatches visible and clickable (selecting changes paint color)
- Left-click paints pixels; right-click paints black (erase)
- Drag-paint across multiple cells
- Tile browser shows Ground, Brick, Question thumbnails with pixel art
- Clicking tile browser thumbnails switches editing tile
- [+New] creates a blank tile; [X] deletes current tile (not tile 0)
- Name input updates the tile's name property
- Tab switching works (other modes show mode name text)

## Concerns

- Right-click "erase" sets pixels to 0 (black/palette[0]) since Uint8Array cannot store null. This is visually equivalent to erasing on the black canvas background.
- Ground tile top row uses green (palette index 4) instead of the brief's suggested light blue (7) for a more natural grass-accent appearance. The brief offered this flexibility with "or keep brown" wording.
- Thumbnails use cellSize=1 on 16x16 mini canvases, CSS-scaled to 24x24 for visibility.
- No undo/redo — future task.
