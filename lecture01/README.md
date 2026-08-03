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
