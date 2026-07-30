# Task 3: Fix sprite grid layout

## Problem

In sprite editor mode, the sprite grid was 32 rows x 16px cell = 512px tall. The canvas is 480px. Placed at y=16, the grid extended to y=528, putting the bottom ~3 rows off-screen and uneditable.

## Fix

Changed cell size from 16 to 14, making the grid 32 x 14 = 448px tall, fitting within the 480px canvas with room for the label.

### Changes (3 locations in `renderCurrentMode`, 2 in `getSpritePixelIndex`)

| Location | Before | After |
|---|---|---|
| `drawPixelGrid` call, line 509 | cellSize 16 | cellSize 14 |
| `strokeRect` border, line 513 | 256, 512 (16x16x32) | 224, 448 (14x16x32) |
| Label y position, line 517 | y=12 | y=6 |
| `getSpritePixelIndex` col, line 457 | `/ 16` | `/ 14` |
| `getSpritePixelIndex` row, line 458 | `/ 16` | `/ 14` |

Tile editor mouse handler (lines 419-420) was left unchanged since its grid (16x16) fits fine at 16px cells (256x256 in a 480px canvas).

## Commit

`10361347d0111d81810f89cc79146338d12b3e03`

## Concerns

None. The sprite pixel data itself (512-element Uint8Array, 16x32 logical pixels) was never changed -- only the on-screen rendering and click-to-pixel mapping were adjusted. The preview canvas (2x scale, lines 524-526) was also unaffected since it uses cellSize=2 independently.
