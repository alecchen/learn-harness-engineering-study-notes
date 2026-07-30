# Task 1 Fix Report

**Status**: Complete

**Commit**: `025484734eacff864426190ec56efa7dd4a75fd6`

## Fixes Applied

### Finding 1 (Important): CRLF Line Endings
- **File**: `index.html`
- **Issue**: File used LF (`\n`) line endings instead of Windows-style CRLF (`\r\n`).
- **Fix**: Converted all line endings from LF to CRLF.

### Finding 2 (Important): `window.project` Accessibility
- **File**: `index.html`
- **Issue**: `const project` declared on line 123 does not create a `window.project` property as required by the spec.
- **Fix**: Changed `const project = {` to `var project = {` so that the variable is a property of the global `window` object.
