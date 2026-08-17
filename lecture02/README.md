---
layout: default
permalink: /lecture02/
---

# Lecture 02 — What a Harness Actually Is

Notes from [lecture 2](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/).

## Contents

- [CLAUDE.md](#claudemd)
- [Progress](#progress)
- [Verification](#verification)
- [Observation](#observation)
- [Key takeaway](#key-takeaway)
- [Exercises](#exercises)
- [References](#references)

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

## References

- [Claude Code in Actions](https://anthropic.skilljar.com/claude-code-in-action)