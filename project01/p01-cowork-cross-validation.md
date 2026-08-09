---
layout: default
---

# Cross-validation: same protocol, second agent (Cowork)

On 2026-08-09 the Project 01 protocol on this page (same task prompt, same
harness files, same isolation rule) was run a second time by a **different
agent** - Cowork, a harnessed coding agent running on
[OpenWorker](https://openworker.com/) - to check whether the weak/strong
gap reproduces outside the original run. The full experiment report (zh-TW +
en) lives in the experiment workspace; this page is the cross-validation
summary.

## Method honesty (read first)

This second run is **not** a clean replication:

- The agent had read the course `solution/` harness files before running, so
  the weak run was stronger than a truly prompt-only agent would be.
- The agent carries its own built-in harness (todo lists, file/shell tools,
  self-verification, memory), so "weak harness" here means "built-in harness
  only".
- Memory carried from the weak run into the strong run.

All three biases shrink the measured gap, so these numbers are a **lower
bound** on the harness benefit. The Claude Code run on the main page
(deepseek-v4-flash, fresh session, no prior exposure to the solution) is the
cleaner estimate. The two runs agree in direction.

## Results (Cowork run)

| Metric | Weak harness | Strong harness |
|---|---|---|
| Result | complete (4 aspects) | complete (4/4 features pass) |
| First successful launch | after 3 failed iterations (electron install, path.txt newline, sandboxed preload `require`) | 1st attempt |
| Retries / human interventions | 0 (agent self-served) | 0 |
| Tests | none | 2/2 vitest |
| Architecture | flat (`main.ts` + `App.tsx`) | 4 strict layers + services injection + components |
| Console at launch | clean after 3 fixes | zero errors |
| Session time | ~6 min | ~3 min |

## Cross-run comparison

| Metric | Claude Code run (main page) | Cowork run (this page) |
|---|---|---|
| Weak session time | 25m 54s | ~6 min |
| Strong session time | 13m 16s | ~3 min |
| Time ratio | ≈ 2x | ≈ 2x |
| Weak result | works, then 4 bugs found | works, after 3 launch-fix rounds |
| Strong verification | 15/15 tests, all checks green | 2/2 tests, all checks green |
| Strong cost | $0.0365 | not recorded |
| Input tokens (weak → strong) | 291,897 → 42,789 | not recorded |

## Findings that reproduced

1. **Environment pitfalls are agent-independent.** npm 11's allow-scripts gate
   blocked the electron/esbuild postinstall in *both* agents' runs. `init.sh`
   only builds - it never launches - so it cannot catch this; you need a launch
   check or `npm approve-scripts`. Both runs hit it and both concluded the same
   thing: harness files cannot fix environment-level issues.
2. **The strong harness's core value is verification written into the
   process.** The Claude Code run got `init.sh` + 15 tests; the Cowork run got
   "launches with zero console errors" from the Definition of Done in
   `AGENTS.md`. In both weak runs, problems only surfaced *after* the agent
   declared itself done.
3. **A weak run's "done" is whatever the agent decides.** The Claude Code weak
   run shipped 4 bugs (incl. a chat that silently needs env vars); the Cowork
   weak run would have declared done at tsc/build while the app could not
   launch. The harness exists to make "done" verifiable.

### Why the allow-scripts gate breaks Electron

npm 11 (11.16+, May 2026) ships a per-package **install-script allowlist**:
any dependency's `postinstall`/`preinstall` script that is not explicitly
approved is silently skipped at `npm install`, with only a warning. This
machine's npm 11.17.0 printed exactly that in both runs:

```
npm warn allow-scripts 2 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   electron@33.4.11 (postinstall: node install.js)
npm warn allow-scripts   esbuild@0.21.5 (postinstall: node install.js)
```

The chain that turns this into a broken app:

1. The `electron` npm package is a JS wrapper, not the app. The real binary
   (~240 MB `Electron.app`) is not in the tarball.
2. Its `postinstall` (`node install.js`) downloads the platform zip and
   extracts it to `node_modules/electron/dist/`, then writes `path.txt`.
3. At runtime `index.js` reads `path.txt` via `getElectronPath()`. No
   postinstall -> no `path.txt` -> the crash both runs hit:
   `Error: Electron failed to install correctly, please delete
   node_modules/electron and try installing again`.

npm blocks these scripts on purpose: a `postinstall` is arbitrary code
execution from the registry, the vector behind supply-chain attacks such as
`event-stream`. The allowlist is the mitigation, and legitimate
script-using packages like Electron get caught in the same net.

Why no harness file can fix this: the block lives in the **package manager's
security policy on the machine**, not in the project. `AGENTS.md` / `init.sh` /
`CLAUDE.md` are instructions to the agent; they cannot change npm's policy. The
only options are environment-level workarounds - which is exactly what both
runs did (delete the broken `dist/`, manually extract the cached zip, write
`path.txt`).

Why `init.sh` missed it: it is build-only (`npm install` + `npm run check` +
`npm run build`). esbuild's binary happened to be present, so `vite build`
passed, but Electron's binary is only needed at **launch** - `tsc` and Vite
never touch it. "Build green, launch broken" is invisible to a build-only
check, which is why the problem only surfaced at `npm start` in both runs.

### The fix: a flow that survives `npm install`

First, the nuance: **only `electron` is strictly required** - without its
postinstall there is no binary and launch dies. `esbuild`'s real binary comes
from an optional dependency, so builds pass either way; approving it just
silences the warning.

**Route A - commit the approval to the repo (recommended).** `npm
approve-scripts` can only approve *installed* packages, so the first install
still gets blocked - the sequence is:

```bash
npm install                                  # 1. blocked: script skipped, warning printed
npm approve-scripts electron esbuild         # 2. writes allowScripts into package.json (pinned to installed versions)
npm rebuild electron esbuild                 # 3. runs the skipped scripts now (downloads the binary)
npm start                                    # 4. verify launch - it should just work
git add package.json package-lock.json
git commit -m "chore: approve electron/esbuild install scripts"
```

Step 5 is the point: once `allowScripts` is committed, every future clone's
`npm install` reads it and runs the scripts directly - one-shot pass for
everyone.

**Route B - one-off, without touching the repo.**

```bash
npm install --allow-scripts=electron,esbuild
```

**Caveats.**

- **Version upgrades break the pin.** Approvals are pinned by default
  (`electron@33.4.11: true`); a future electron upgrade leaves the new version
  unapproved and the warning returns. `--no-allow-scripts-pin` writes
  name-only entries (`electron: true`) - fine for a course project.
- **First install still needs the network.** Approving only guarantees the
  script *runs*; the ~100 MB binary still has to download. Both experiment
  runs were lucky - the zip was already in `~/Library/Caches/electron/`.
- **Approving is necessary, not sufficient.** "One-shot pass" also requires a
  launch/smoke-test step in `init.sh`; otherwise a green build still hides
  runtime-only breakage (like the sandboxed-preload `require` issue) until
  `npm start`.

## Conclusion

Two agents, two models, two protocol implementations - same direction: the
strong harness produced a verified result in about half the time, and the weak
run's problems only surfaced after the agent declared itself done. The one
thing harness files cannot fix is environment-level issues; fix those with
environment-level tools.
