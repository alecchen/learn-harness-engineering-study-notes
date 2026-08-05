# Doc Chat — Build Summary

Built a complete Electron app ("Doc Chat") from scratch in this directory
(empty except for `task-prompt.md`).

## What was done

1. **Scaffolded the project** — `package.json`, installed `electron@43.3.0`,
   `@anthropic-ai/sdk@0.115.0`, `pdf-parse@2.4.5` (verified its v2 API from
   source before using it).

2. **Built the main process** — `main.js` (window, native menu, dialog /
   drag-drop file open, IPC handlers), `preload.js` (sandboxed `contextBridge`
   API), and three libs:
   - `documents.js` — parses `.txt/.md/.json/.csv/.html/.pdf` (HTML tag
     stripping, PDF via pdf-parse, footer cleanup, 10 MB cap)
   - `retriever.js` — chunks docs into ~600-char passages, lexical TF-IDF
     scoring for retrieval
   - `qa.js` — streams grounded answers via the Anthropic SDK (lower-level
     `messages.create({ stream: true })` after discovering the SDK's
     `MessageStream` wrapper crashes on the configured relay's SSE)

3. **Built the renderer** — three-pane UI (document list / markdown preview /
   chat), streaming answers with clickable source chips, token/model metadata,
   Stop button, scope selector, drag-drop, paste-text modal. Self-contained
   XSS-safe markdown renderer.

4. **Verified end-to-end** — syntax checks, Node tests of parsing/retrieval
   (including a hand-built PDF), Electron smoke test (no console/JS errors),
   then a full live run: added a document, asked a question, received a
   streamed answer with the correct source and citation.

## Notes

- The environment routes the Anthropic API through a relay
  (`ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL`, serving `deepseek-v4-flash`),
  which is why the status pill reports reachability rather than a specific
  model. The app degrades gracefully with "LLM not configured" if no
  credentials exist.

## Run

```
npm start
```

## Session stats

| Metric                 | Value          |
| ---------------------- | -------------- |
| Session duration       | 25m 54s        |
| Total cost             | $7.28          |
| Total duration (API)   | 12m 14s        |
| Total duration (wall)  | 29m 23s        |
| Total code changes     | 2050 added / 154 removed |

Usage by model:
- `claude-sonnet-4-6`: 291.9k input, 69.1k output, 17.9m cache read ($7.28)
- `claude-haiku-4-5`: 40 input, 227 output, 384 cache read ($0.0012)
