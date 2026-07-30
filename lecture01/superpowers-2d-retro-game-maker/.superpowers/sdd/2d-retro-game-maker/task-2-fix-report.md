# Task 2: Fix sentinel value for transparent pixels

## Problem

`Uint8Array` cannot store `null`. Right-click erasing wrote palette index 0 (black) instead of a distinguishable "empty" value, making black tiles indistinguishable from erased/empty tiles. New tiles were filled with all-0 (all black) instead of all-empty.

## Changes (commit `62a4552`)

1. **`drawPixelGrid` (line 202)**: Added `&& val !== 255` to the pixel-rendering condition, so the sentinel value 255 is skipped (treated as transparent/empty).

2. **Right-click erase (line 356)**: Changed `e.button === 2 ? 0 : tileEditor.selectedColor` to `e.button === 2 ? 255 : tileEditor.selectedColor`, so right-clicking writes the sentinel instead of palette index 0.

3. **New tile creation (line 302)**: Changed `p.fill(0)` to `p.fill(255)`, so new tiles are transparent rather than all black.

## Concerns

None. Palette indices are 0-7 (8 colors total), so 255 is safely outside the valid range and will never collide with a legitimate palette color.
