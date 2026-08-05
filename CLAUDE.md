# Learn Harness Engineering - Study Notes

My learning progress and sharing space for the Learn Harness Engineering course.

## Site conventions (Jekyll + GitHub Pages)

This repo is served as a GitHub Pages site built with Jekyll (legacy builder, branch `main`, no external build service). Markdown files remain the source of truth; Jekyll renders them.

### Page styling rule

| Front matter in the file | Result |
|---|---|
| none | Served raw (as `.md`), untouched by Jekyll. Intentional for agent artifacts (`docs/`, `CLAUDE.md`, `.superpowers/`). |
| `layout: default` | Rendered to HTML with the shared layout, top nav, and theme toggle. |
| `layout: default` + `permalink: /lectureNN/` | Lecture page rendered at a clean URL. |

Every lecture note must start with:

```yaml
---
layout: default
permalink: /lectureNN/
---
```

There is no config-level auto-conversion: a Markdown file without front matter stays raw.

### Link conventions

- Link to a lecture as `lectureNN/` (its permalink), not `lectureNN/README.md`.
- Link to a sub-project as `<dir>/` (its permalink), not `<dir>/README.md` or `<dir>/README.html`.
- A `<dir>/` URL serves that directory's `index.html` (e.g. a game app) when one exists.

### Build

- GitHub Pages builds from `main` at `/`. `_site/` and `.jekyll-cache/` are local-build artifacts and must never be committed.
