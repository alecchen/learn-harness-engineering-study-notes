---
layout: default
permalink: /lecture01/
---

# Lecture 01 — SWE-bench & the Harness

## SWE-bench Verified

[SWE-bench](https://www.swebench.com/) evaluates AI models on real-world software engineering: ~2,300 GitHub issues from Python repos (Django, pylint, sympy, etc.). The model gets the issue + codebase and must produce a passing patch.

**SWE-bench Verified** is a human-filtered subset of ~500 issues, curated for clarity and reliability.

### Data contamination

Since these are public GitHub issues, they may appear in model training data. A model that "solved" an issue during training isn't really solving it at test. Two mitigations:

1. **Instruction-based**: ask the model to ignore prior knowledge. Weak: you're trusting it to un-learn what it learned.
2. **Temporal holdout**: only use issues filed after the model's training cutoff. Stronger: the model genuinely hasn't seen them.

Modern SWE-bench runs enforce temporal holdout.

### Why it matters for this course

SWE-bench is a concrete example of a *harness*: a controlled evaluation environment (Docker + test suite). The course's concept of a harness is exactly this: the infrastructure that makes evaluation trustworthy.

---

## 2D Retro Game Maker — Three Approaches

Inspired by [Anthropic's blog post on harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps), which describes a 2D retro game harness test, I ran a similar experiment using Claude with DeepSeek-v4-flash across three harness approaches:

### 1. Solo (no harness)

[`solo-2d-retro-game-maker/`](solo-2d-retro-game-maker/) — [`index.html`](solo-2d-retro-game-maker/index.html) ([README](solo-2d-retro-game-maker/README.html))

A single prompt to Claude asking it to build the game in one shot. No scaffolding, no iterative feedback, no structured evaluation. The model produces what it produces in a single pass. Whatever quality emerges is whatever the model guessed the user wanted.

Requires a static file server to play (ES modules are blocked on `file://`):
```sh
python3 -m http.server 8080
```

**Result:** A basic game maker, but limited by the lack of iteration. The model had to infer intent with no chance to course-correct.

### 2. Grill-me (skill-based harness)

[`grill-me-2d-retro-game-maker/`](grill-me-2d-retro-game-maker/game.html) — [`game.html`](grill-me-2d-retro-game-maker/game.html) ([README](grill-me-2d-retro-game-maker/README.html))

Uses the [`/grill-me` skill](https://github.com/mattpocock/skills) as the harness. The skill defines a structured prompt sequence: it grills the user on requirements before writing code, validates the output against those requirements, and iterates on failure. The harness is the skill itself. It enforces a protocol the model follows.

**Result:** More structured output than solo mode. The grilling surface forced clarification of requirements before generation, catching ambiguity early. Still limited: the skill provides process but no automated evaluation (no test suite, no scoring).

### 3. Superpowers (framework-based harness)

[`superpowers-2d-retro-game-maker/`](superpowers-2d-retro-game-maker/) — [`index.html`](superpowers-2d-retro-game-maker/index.html) ([README](superpowers-2d-retro-game-maker/README.html))

Uses the [Superpowers framework](https://github.com/obra/superpowers) as the harness. Superpowers provides a complete agentic workflow: specification-driven development (SDD), structured task decomposition, planning, execution, review, and iteration loops. The harness orchestrates multiple model calls: one to plan, one to write, one to review, one to fix, with each stage validating the output of the prior one.

**Result:** The most comprehensive output. The framework's review-and-fix loop caught issues the other approaches missed. But heavier: more tokens, more rounds, more to configure. The harness itself becomes the product.

---

### Summary

| Approach | Harness | Iteration | Validation | Token cost |
|----------|---------|-----------|------------|------------|
| Solo | None | None | None | Lowest |
| Grill-me | Skill protocol | Requirements feedback loop | Implicit (skill checks) | Low |
| Superpowers | Full agentic framework | Plan → Code → Review → Fix | Structured (reviews, test reports) | High |

The spectrum shows a clear tradeoff: more harness = more reliable output = more tokens. The right choice depends on whether you need a quick sketch (solo), a solid first pass (grill-me), or production-quality code (superpowers).

**Real-world data point:** [Vyom Goyal (@hellovyom)](https://x.com/hellovyom/status/2083177530287353961) built an arcade racing game, [Wave Racer](https://wave-racer.vercel.app/), with a single Opus 5 prompt and no harness. His write-up: "690 million tokens, $423 and just 1 prompt is all it took." It is the solo approach pushed to its limit, moving the iteration budget from a structured harness into one very long agent run.

---

## The five defense layers

A harness guards against agent failure on five layers:

1. **Task specification** - what the agent is asked to do: a clear, testable goal.
2. **Context provision** - what the agent is told: docs, references, constraints.
3. **Execution environment** - what the agent is allowed to run: tools, permissions, sandbox.
4. **Verification feedback** - what the agent is measured against: tests, checks, scoring.
5. **State management** - what the agent remembers across runs: persistence, checkpointing.

Each layer catches a different failure class. When an agent fails, ask which layer was weak, not which model to swap in.

### 1. Task specification

What the agent is asked to do. A weak spec makes the agent guess intent - the failure mode of the solo approach in the 2D Retro Game Maker section, where the model inferred what the user wanted with no chance to course-correct.

**Example.** Vague: "fix the bug in the game." Precise: "The game crashes when the player collects a power-up. Reproduce with `npm test`. Keep the scoring logic unchanged and add a regression test." The precise version is testable and bounds the change.

**Real-world usage.**
- SWE-bench: the task is the GitHub issue itself. The Verified subset is human-curated - that curation *is* task-spec refinement: only issues a human could solve from the text alone survive.
- The course's core loop: treat the spec as a hypothesis, not a contract. Each failure tightens it. You add "don't touch scoring logic" only after the agent first breaks it.
- `/grill-me` forces requirements out of you before any code - an interrogation-based spec.
- Superpowers SDD writes a spec file first and validates the code against it.

### 2. Context provision

What the agent is told. Too little context and the agent misses constraints; too much and it drowns in tokens. The fix is the map, not the encyclopedia - the AGENTS.md insight in the Key insight section.

**Example.** An `AGENTS.md` that says "build steps in `docs/build.md`, test layout in `tests/README.md`, architecture decisions in `ADR/`" instead of inlining all of it. The agent fetches only what the current task needs.

**Real-world usage.**
- SWE-bench hands the agent the repo plus the issue and nothing else - the barest context, part of what makes it hard.
- `CLAUDE.md`, `AGENTS.md`, and skills are the context layer of Claude Code. MCP tool descriptions are also context: the model reads them before acting.
- Over-provisioning shows up as wasted tokens and off-target edits. Under-provisioning shows up as the agent reinventing conventions it could have read.

### 3. Execution environment

What the agent is allowed to run. Sandboxing and permissions bound the blast radius and make runs reproducible.

**Example.** SWE-bench pins each repo in a Docker image with a fixed toolchain, so every run is the same environment. The game experiments hit an environment constraint too: ES modules are blocked on `file://`, so the game needs `python3 -m http.server` to run.

**Real-world usage.**
- Docker containers as the eval sandbox (SWE-bench); CI runners as the build sandbox.
- Permission modes and tool allowlists - read-only vs read-write. Claude Code's permission prompts are an execution-environment control.
- Network egress blocking and secret-scope control: the environment decides what the agent can touch.

### 4. Verification feedback

What the agent is measured against, and the loop that returns that signal. Without it the agent never learns whether it succeeded - the solo run produced a game, but nothing said whether it was "right."

**Example.** SWE-bench's `FAIL_TO_PASS` and `PASS_TO_PASS` tests: the verification *defines* done. In the Superpowers run, the review-and-fix loop used one model's critique as feedback for another's patch.

**Real-world usage.**
- CI is the verification layer at scale - the mapping in the methodology table.
- Cheap gates first (lint, types) before expensive ones (full test suite): feedback you actually run.
- Human review as the manual fallback. Grill-me's implicit checks are weaker verification - process, not proof.

### 5. State management

What the agent remembers across runs. Long runs lose context; the harness must persist progress so work resumes instead of restarting.

**Example.** Anthropic's harness design for long-running apps is largely state management: checkpoints, durable artifacts, resumable loops. Wave Racer's single 690M-token run is the extreme case - a long-running agent that must not lose its place.

**Real-world usage.**
- Checkpoint and resume in agent CLIs; todo lists and partial results written to disk so a crash is a restart point, not a do-over.
- Deterministic replay from a checkpoint to reproduce a failure.
- The layer production agents depend on most: invisible until missing, then everything re-runs from zero.

---

## Key insight: AGENTS.md as a map, not an encyclopedia

From reading [lecture 1](https://walkinglabs.github.io/learn-harness-engineering/zh-TW/lectures/lecture-01-why-capable-agents-still-fail/) and its reference to [OpenAI's Harness Engineering](https://openai.com/zh-Hant/index/harness-engineering/):

`AGENTS.md` should not be an exhaustive reference file. It should be a **brief map** pointing to available references. The agent reads the map, then only fetches the references it needs for the task at hand, reducing context usage and keeping focus on the goal.

Same principle as `SKILL.md` in agent skills: a concise entry point that directs the agent to check specific files rather than loading everything upfront.

---

## Observation: Harness engineering vs development methodologies

At first glance, harness engineering looks like **waterfall** because it emphasizes planning the harness upfront (task spec, verification, environment). But the actual loop is iterative:

| Methodology | Loop | Shared with harness engineering |
|-------------|------|--------------------------------|
| **Waterfall** | Requirements → Design → Implementation → Verification | Looks similar on paper (spec first, then build, then verify), but waterfall assumes the spec is complete upfront. Harness engineering treats the spec as a hypothesis: you tighten it each iteration based on what the agent got wrong. |
| **TDD** | Red → Green → Refactor | TDD is the closest parallel at the micro level: the test is the harness for one behavior. Harness engineering scales this to full agent tasks. In both, "what does done look like?" is the first question, not an afterthought. |
| **Scrum** | Sprint → Review → Retro → Refine | Scrum's MVP-and-iterate is almost a direct map: MVP harness (minimum prompt + one check) → agent run = sprint → failure diagnosis = retro → fix the layer = backlog refinement. Each cycle tightens the system. |
| **XP (Extreme Programming)** | Test-first, CI, pair programming, collective ownership | XP's engineering practices map to harness layers: CI is the verification layer, pair programming is similar to multi-agent review, collective ownership is akin to evolving the harness as a shared artifact. |
| **Agile (general)** | Inspect & adapt | That's the essence of harness engineering. You don't design the perfect harness. You start small, observe where the agent fails, patch that layer, re-run. |

The surface similarity to waterfall dissolves when you realize: **the harness itself is built incrementally, driven by failures.** You don't specify every check, every context document, every tool permission before the first agent run. You start with the minimum, see what breaks, and add what's missing. That's inspect-and-adapt, not big-design-upfront.

The core mindset shift: when an agent fails, ask "which layer of my harness is weak?", not "which better model do I need?"
