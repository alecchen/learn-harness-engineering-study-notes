---
layout: default
permalink: /lecture02/
---

# Lecture 02 — What a Harness Actually Is

Notes from [lecture 2](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/).

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [Explore, plan, code, commit](#explore-plan-code-commit)
- [Proof: the team story](#proof-the-team-story)
- [Observation](#observation)
- [Key takeaway](#key-takeaway)
- [Exercises](#exercises)
- [CLAUDE.md](#claudemd)
- [Progress](#progress)
- [Verification](#verification)
- [References](#references)

## Lecture summary

A harness is everything outside the model weights - "if it is not model weights, it is harness." It determines how much of a model's capability actually gets realized. The lecture breaks it into five subsystems:

1. **Instructions** - `CLAUDE.md` / `AGENTS.md`, ~100 lines, a directory page not an encyclopedia
2. **Tools** - shell access, linters, test runners; least-privilege, not locked down
3. **Environment** - reproducible setup: dep locks, `.nvmrc`, containers
4. **State** - `PROGRESS.md`; read at session start, updated at session end
5. **Feedback** - explicit verification commands (tests, type checks, lint); the highest-ROI subsystem

## Key concepts

- **Constrain, don't micromanage** - enforce invariants with executable rules, not prose. Verification commands belong in `AGENTS.md`:

  ```
  Tests: pytest tests/ -x
  Type check: mypy src/ --strict
  Lint: ruff check src/
  Full verification: make check
  ```

- **Separate the doer from the checker** - agents "confidently praise their own work," so the checker must be independent of the runner
- **Repo is the single source of truth** - "the agent can only see the files you put in front of it"; anything it cannot see does not exist
- **Keep it small** - `AGENTS.md` around 100 lines; if it does not fit, split it into a `docs/` directory
- **Harness rots like code** - audit regularly and pay down harness debt just like technical debt

## Explore, plan, code, commit

The lecture's harness concepts map directly onto this workflow ([reference - Claude Code 101](https://anthropic.skilljar.com/claude-code-101/469792)):

1. **Explore** - understand the codebase first. The repo is the single source of truth; anything the agent cannot see does not exist
2. **Plan** - constrain with rules, not prose. Define what "done" looks like before coding starts
3. **Code** - the agent does the work (doer). Keep `AGENTS.md` around 100 lines; split into `docs/` if it grows
4. **Commit** - verify. Separate the doer from the checker; enforce invariants via executable checks (`pytest`, `mypy`, `ruff`); the feedback subsystem is the highest-ROI step

## Proof: the team story

A team built a ~20K-line TypeScript + React frontend with GPT-4o. The model never changed; each iteration only added harness components:

| Stage | Harness addition | Success rate |
|-------|------------------|--------------|
| 1 | README only | 20% |
| 2 | `AGENTS.md` (stack, conventions, architecture) | 60% |
| 3 | verification commands (`yarn test && yarn lint && yarn build`) | 80% |
| 4 | progress file templates (done / in-progress) | 80-100% |

## Observation

Verification is only trustworthy if the checker cannot inherit the runner's mistakes. Three ways to guarantee that:

1. Different model, same agent
2. Different agent
3. Same agent and model, fresh session with no context from the run being verified

This is the lecture's "separate the doer from the checker" applied concretely: the wrong assumption must not travel into the verdict.

## Key takeaway

> Among the five subsystems, the feedback subsystem usually has the lowest investment and highest return. Get your verification commands right first.

Not always. Writing gtest/gmock in a large C++ EDA project is difficult.

## Exercises

1. twlapi: `TWOPC-896` has no gtest. Working on it.
2. Component value ranking: verification > CLAUDE.md > progress.md > environment > tools
3. I wrote a Confluence tool for page view and status, but agents need to know whether it's cloud or data center, the API version, the access point, and the JSON layout it returns. That is a Gulf of Execution. Agents also need to know what right and wrong look like to finish the task.

## CLAUDE.md

- [claude-md-management](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management)
- [claude-token-efficient](https://github.com/drona23/claude-token-efficient)
- [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md), don't use `/init` or auto-generate your `CLAUDE.md`
- [A CLAUDE.md That Follows](https://anthropic.skilljar.com/claude-code-in-action/486929)

## Progress

- [mattpocock/skills /handoff](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md)
- [planning-with-files](https://github.com/OthmanAdi/planning-with-files)

## Verification

[Trust It: Verifying Unsupervised Runs](https://anthropic.skilljar.com/claude-code-in-action/486938)

| Runtime | Verifier |
|---------|----------|
| bash | bats |
| python | pylint, pytest, unittest |
| cpp | cppcheck, clang-tidy, gtest, gmock, gmake |
| ci | gitlab-ci-local, github actions |
| github pages | jekyll build |

## References

- [Explore, plan, code, commit (verification)](https://anthropic.skilljar.com/claude-code-101/469792)
- [Claude Code in Actions](https://anthropic.skilljar.com/claude-code-in-action)
- [Claude Code 101](https://anthropic.skilljar.com/claude-code-101)