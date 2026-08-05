# Project 01: Prompt-Only vs Rules-First

Compare how much of the same Electron knowledge-base task a coding agent completes
when given only a prompt vs. a minimal harness.

Two packages:
- `p01-baseline-init.tar.gz`: weak harness. Only `task-prompt.md`.
- `p01-improved-init.tar.gz`: strong harness. Contains `AGENTS.md`, `CLAUDE.md`,
  `init.sh`, `feature_list.json` (schema preserved with empty values),
  `claude-progress.md` (title only), `docs/`, and `task-prompt.md`.

Both packages are derived from the repo's checked-in `starter/` and `solution/`,
with the app source excluded so the agent must build it from scratch in both
runs. The checked-in `starter/` already contains the finished app, so handing it
to the agent as-is would measure nothing.

The four features the harness measures (from `solution/feature_list.json`):
window launch, document list panel, question panel, and local data directory
creation.

## Isolation rule (read first)

The comparison is only valid if the two runs never see each other. A coding agent
has full filesystem access and will explore sibling directories and git branches.

1. Extract and run ONE package at a time.
2. Never extract both into the same folder, or into sibling folders, while a run
   is in progress.
3. After a run, archive the results, then delete the folder before the other run.
4. Do not make a git repo that contains both runs (as directories or branches).
   The agent will find the other run and the weak-harness test is contaminated.
   The course suggests git branches for comparing runs; this package avoids git
   entirely because an agent may explore branch refs. If you do use branches,
   keep one working directory and never check both out as siblings.

## Task prompt (identical for both runs)

> Build an Electron app that can show documents and answer questions.

## Clarifying questions during the runs

The course docs don't state whether the agent may ask clarifying questions, and it
happens anyway: in practice a weak-harness agent asked about document formats, tech
stack, and Q&A scope before writing any code.

The rule that keeps the comparison valid:

- The agent asking is fine. It is the agent's own autonomous behavior under the
  prompt. Record what it asked as experimental data.
- The operator answering with scope decisions is not: choosing "text + PDF +
  images", "Electron Forge + React", or "Claude Q&A grounded in the open document"
  injects external spec into the run. That is exactly the guidance the weak harness
  is meant to measure the absence of, and it breaks the "same task twice"
  comparison.
- If the agent asks, reply "use your best judgment" (or don't answer), and record
  the questions. Let it build to its own defaults.
- Subtler leak: with `AskUserQuestion`, the multiple-choice options are written by
  the agent, so they carry the agent's own priors (pdf.js, Forge, open-document
  QA). Even in a prompt-only run, answering nudges the outcome toward the agent's
  assumptions. Refusing to answer removes the nudge.
- To test pure autonomy instead, one line may be added to the task prompt: "Do not
  ask clarifying questions; assume sensible defaults and build." This adds no
  harness files, so the run remains prompt-only. Pick either approach, but use the
  SAME prompt for both runs.

## Prerequisites

- Claude Code, Codex, or GitHub Copilot (use the same one for both runs)
- Node.js + npm
- A timer, or AgentsView instead. It records tool-call time, token usage, and the
  agent's thinking per run, which gives better stats than a stopwatch.

## Run A: weak harness

1. `mkdir p01-a && cd p01-a`
2. `tar xzf ../p01-baseline-init.tar.gz`
3. Launch the agent in `p01-a`, paste the task prompt, start the timer.
4. When it stops, try `npm start` (or whatever it produced). If it doesn't
   launch, record that. Do NOT fix it.
5. Record: first-successful-launch time, retries, missing features, premature
   stop, the agent's final summary, key diff.
6. `zip -r ../p01-a-results.zip . && cd .. && rm -rf p01-a`

## Run B: strong harness

1. `mkdir p01-b && cd p01-b`
2. `tar xzf ../p01-improved-init.tar.gz`
3. Launch the agent, paste the SAME prompt, same timer as Run A.
4. When it stops, run `bash init.sh`. Record the result.
5. Confirm the app launches with `npm run dev` (the harness pins this command).
6. Check `feature_list.json`: which features are `"pass"`, and did the agent
   flip them itself?
7. Record the same metrics as Run A, then archive and delete.

## Compare

| Metric | A (weak) | B (strong) |
|---|---|---|
| Result (complete / partial / failed) | | |
| First successful launch | | |
| Retries / human interventions | | |
| Missing features at "done" | | |
| Premature stop | | |

Write a 1-2 page note: what differed, the data, your conclusion.

## Results are data, not verdicts

The English page is explicit: "This is a comparison experiment, not a requirement
that both agent runs produce a production-ready Electron app. Partial or broken
output is valid experimental evidence." A weak run that fails to launch is still
a valid data point. Record it, do not fix it or restart it.

## Claude Code and AGENTS.md

Claude Code auto-loads `CLAUDE.md`, not `AGENTS.md` (per the Claude Code memory
docs). The checked-in `solution/CLAUDE.md` is only a quick reference. It lacks
the startup rules, the `docs/` references, the Definition of Done, and the
`feature_list.json` status semantics that live in `AGENTS.md`. So for a Claude
Code run, the harness is weaker than for Codex or Copilot, which auto-load
`AGENTS.md`. Both `p01-improved-init.tar.gz` and the PR fix this: `CLAUDE.md`
starts with `@AGENTS.md`, importing the full spec.

The import also duplicates CLAUDE.md's four "Architecture Rules" (they already
live in AGENTS.md). That is a small token waste, but the copies agree, so it
does not affect the harness test result. Future cleanup: rewrite `CLAUDE.md` as
a reference derived from `AGENTS.md` instead of re-stating its rules.

## Course docs inconsistencies

These packages are self-contained. If the published course docs disagree with
them, trust the packages. Known gaps in the docs: the first and third have a
local fix ready to PR; the second is left for the maintainer to decide.

- **`docs/` is missing from the harness description.** The [English project page](https://walkinglabs.github.io/learn-harness-engineering/en/projects/project-01-baseline-vs-minimal-harness/) lists the strong-harness artifacts as `AGENTS.md`, `CLAUDE.md`, `init.sh`, `feature_list.json`, `claude-progress.md` and defines the harness as "AGENTS.md + init.sh + feature_list.json". Neither mentions `docs/`. But `solution/AGENTS.md` steps 2-3 order the agent to read `docs/ARCHITECTURE.md` and `docs/PRODUCT.md`, so they must be included or the strong run stalls. `p01-improved-init.tar.gz` includes them.
- **The zh-TW page adds a 30-min / 20-round limit the English page lacks.** The [zh-TW page](https://walkinglabs.github.io/learn-harness-engineering/zh-TW/projects/project-01-baseline-vs-minimal-harness/) has a "具體步驟" section that caps each run at "建議 30 分鐘 / 20 輪" and lists metrics and deliverables; the [English page](https://walkinglabs.github.io/learn-harness-engineering/en/projects/project-01-baseline-vs-minimal-harness/) has no steps section or limits at all, and adds a note that partial or broken output is valid experimental evidence, which the zh-TW page lacks. This README follows the English page and prescribes no time or round limit.
- **The zh-TW page mis-describes `init.sh`.** The [zh-TW page](https://walkinglabs.github.io/learn-harness-engineering/zh-TW/projects/project-01-baseline-vs-minimal-harness/) calls it "一鍵恢復可執行狀態（`npm install && npm start`）" (one-click restore to a runnable state). The actual `init.sh` runs `npm install` + `npm run check` + `npm run build`; it verifies the project builds and never launches the app. `npm start` isn't even a defined script in the checked-in `package.json` (the launch script is `npm run dev`).
