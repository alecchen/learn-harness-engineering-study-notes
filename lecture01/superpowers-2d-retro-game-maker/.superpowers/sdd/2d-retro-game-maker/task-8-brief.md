# Task 8: Final polish and edge cases

**Files:**
- Modify: `index.html` (handle edge cases, visual polish)
- Modify: `test/game-test.mjs` (final test run)

**Prerequisite context:**
- All 4 modes working: Tile Editor, Sprite Editor, Level Editor, Play
- Physics: gravity, collision, movement, jump, camera
- Save/Load/Export all functional
- Playwright test validates playability

**Steps:**

1. Handle edge cases:
   - Empty level (no tiles besides Air): level editor should still render grid with "No tiles" message
   - Delete last non-air tile: gracefully handled, toolbar updates
   - Load corrupt JSON: shows error alert (should already work from Task 5)
   - Rapid tab switching while playing: play state resets properly on re-enter
   - Canvas sizing on smaller screens: viewport meta and max-width handling
   - Player falling infinitely: clamp Y position to level bottom + buffer
   - Switch to Play mode with no level data: show warning message

2. Visual polish:
   - Tab button active/inactive colors are distinct
   - Toolbar visual spacing and group consistency
   - Color swatches have hover effect
   - Level editor preview tile scales properly
   - Player sprite visible against backgrounds

3. Test all 4 modes work end-to-end:
   - Tile Editor: paint, erase, new tile, delete tile, rename tile
   - Sprite Editor: paint, erase, clear, fill
   - Level Editor: place tile, erase tile, set start, hover preview
   - Play Mode: move, jump, collide, fall, camera

4. Run the Playwright test:
   ```bash
   cd /Users/alec/git/superpowers-2d-retro-game-maker && node test/game-test.mjs
   ```
   Fix any failures.

5. Commit:
   `git add index.html && git commit -m "chore: final polish and edge case handling"`

**Report file:** `.superpowers/sdd/2d-retro-game-maker/task-8-report.md`

**Return:** Status, commits, test summary, any remaining concerns
