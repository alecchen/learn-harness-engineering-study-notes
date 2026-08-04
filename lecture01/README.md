---
layout: default
permalink: /lecture01/
---

# Lecture 01 — SWE-bench & the Harness

## Contents

- [SWE-bench Verified](#swe-bench-verified)
- [2D Retro Game Maker — Three Approaches](#2d-retro-game-maker--three-approaches)
  - [1. Solo (no harness)](#1-solo-no-harness)
  - [2. Grill-me (skill-based harness)](#2-grill-me-skill-based-harness)
  - [3. Superpowers (framework-based harness)](#3-superpowers-framework-based-harness)
  - [Summary](#summary)
- [The five defense layers](#the-five-defense-layers)
- [Key insight: AGENTS.md as a map, not an encyclopedia](#key-insight-agentsmd-as-a-map-not-an-encyclopedia)
- [Observation: Harness engineering vs development methodologies](#observation-harness-engineering-vs-development-methodologies)
- [Exercises](#exercises)
  - [Exercise 1: Confluence-to-Markdown Conversion](#exercise-1-confluence-to-markdown-conversion)
  - [Exercise 2: Verification gap measurement](#exercise-2-verification-gap-measurement)
  - [Exercise 3: Diagnostic loop practice](#exercise-3-diagnostic-loop-practice)

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

---

## Exercises

### Exercise 1: Confluence-to-Markdown Conversion

I asked Claude to use an MCP fetch tool to retrieve a Confluence page and asked Qwen-3.6-27B to convert it to Markdown.

The MCP tool returned a truncated result. Instead of stopping and reporting that the source was incomplete, the agent generated a complete-looking Markdown document and fabricated content that was not in the original Confluence page.

#### Failure attribution

- **Execution environment**: The MCP fetch returned incomplete data and did not provide a reliable way to retrieve the full page.
- **Context provision**: Because the response was truncated, the agent did not have the complete source content.
- **Verification feedback**: No check detected truncation or prevented the agent from producing output based on missing information. This was the main reason the fabricated result was accepted.
- **Task specification**: The instructions did not explicitly say, "If the source is incomplete, stop and do not infer or fabricate."
- **State management**: Not relevant, since the failure occurred in a single run without problematic persisted state.

#### Conclusion

The main failure chain was:

Execution environment failure → incomplete context → insufficient verification → fabricated output

Adding an `AGENTS.md` with explicit instructions and a completeness check should make the agent stop and report the truncated fetch instead of generating inaccurate Markdown.

---

### Exercise 2: Verification gap measurement

Pick 5 coding tasks. After each task, record whether the agent claims completion, then verify actual correctness with independent tests. Calculate the proportion of times the agent claims done when it is actually not done - that is your verification gap. Then think: what verification commands would reduce this proportion?

#### The metric

The gap mixes two failure modes that need different fixes:

- **Process failure** - the agent claimed done without running the tests.
- **Test-quality failure** - the agent ran the tests, they passed, but the task was still wrong.

Measure both rates separately. A model swap does not close the gap: it is a harness property, not a model property. Detection does not scale with capability, and a more fluent model produces more plausible wrong "done" claims. Treat the 5-task run as a before/after experiment and report the delta after each fix.

#### Who writes the tests

The tests must be independent, or the agent can fabricate them four ways: claim a pass without running anything, encode its wrong assumption in the test, write a vacuous test, or write a test that matches its broken code.

- A **separate model** writes the tests from the task spec only, never from the agent's code. This breaks self-consistency: the verifier cannot look at the thing it verifies.
- A **human** audits the suite periodically (every N tasks) instead of per task, catching vacuous tests without becoming a bottleneck.

#### My approach

- Add a test suite and a CI pipeline.
- A separate model writes the tests from the spec, before the implementation exists.
- Run the suite after the agent finishes each task, enforced by a pre-commit hook or [gitlab-ci-local](https://github.com/firecow/gitlab-ci-local), not just a prompt rule.
- Keep improving the test suite in each iteration.

#### Enforcing the gate

A rule is task-spec: it asks, it does not enforce. `git commit --no-verify` skips local hooks entirely, so no commit-side hook can stop it. Push verification to layers the agent cannot skip:

- **Execution environment** - deny the `--no-verify` patterns (`git commit -n`, `git commit --no-verify`) via a tool permission rule, so the agent cannot even issue the command.
- **Local gate** - pre-commit hook or [gitlab-ci-local](https://github.com/firecow/gitlab-ci-local) runs the suite per task. Fast, but `-n`-able, so it is the per-task loop, not the floor.
- **Server floor** - a GitLab pre-receive hook, or a protected branch with required pipeline/merge checks. `-n` means nothing on the server; the suite must pass before the result lands as done.

#### Claude Code enforcement

Both live in the repo's Claude Code config: a deny rule in `.claude/settings.json` plus a PreToolUse hook. The hook blocks, the deny rule prevents prompting:

```json
{
  "permissions": {
    "deny": [
      "Bash(git commit --no-verify:*)",
      "Bash(git commit -n:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-git-bypass.sh"
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/block-git-bypass.sh` reads the tool input from stdin as JSON (PreToolUse passes no env var) and exits 2 to block:

```bash
#!/bin/bash
cmd=$(jq -r '.tool_input.command')
if printf '%s\n' "$cmd" | grep -Eq 'git[[:space:]]+commit([[:space:]]|$)' &&
   printf '%s\n' "$cmd" | grep -Eq -- '--no-verify|(^|[[:space:]-])-n([[:space:]]|$|-?)'; then
  echo "Blocked by policy: git commit --no-verify/-n" >&2
  exit 2
fi
exit 0
```

Exit 2 feeds the stderr text back to the agent as a block error; the alternative is exit 0 plus a JSON `permissionDecision: deny` on stdout. A deny rule overrides any allow rule and never prompts.

Limitations: the permission matcher is a word-boundary anchored glob, so it misses `git -C <dir> commit --no-verify`, reordered flags, and combined short flags like `-nm`. The hook greps the raw command and catches those, but both are blind to shell aliases and dynamic command strings - which is why the server floor is the real guarantee.

#### Summary

Verification gap = (claimed done and actually wrong) / (claimed done). The chain that closes it: independent tests from a separate model → local gate for the per-task loop → server CI as the un-bypassable baseline → regressions folded back into the suite each iteration. Each layer closes the fabrication hole that Exercise 1 exposed.

---

### Exercise 3: Diagnostic loop practice

Find a task where the agent repeatedly fails in your project. Run once, record the failure. Attribute it to one of the five layers. Fix that layer. Run again. Repeat three to five rounds, recording improvements each time.

#### The case: lean-ctx subprocess explosion

Running with lean-ctx, the agent sometimes spawned a subprocess that used `glob` to list directory contents or tree structure instead of the `ctx_tree` / MCP tools. Combined with a `.bashrc` that had no non-interactive-shell guard, each spawned bash could hang and time out; the agent respawned a new `ctx_shell`, which spawned more bash, until the Linux VM ran out of memory, the kernel killed Claude - and lean-ctx kept spawning bash. It happened several times.

#### Diagnostic rounds

| Round | Fix | Layer | Result |
|-------|-----|-------|--------|
| 1 | Added an instruction to prefer the ctx_* MCP tools over raw `glob` / bash file discovery | Task specification | Helped, but the agent still reached for bash |
| 2 | Added a permission denying bash usage in Claude | Execution environment | Blocked most bash, but direct file ops slipped through |
| 3 | Added a hook to block direct bash file ops (`cp`, `mv`, `mkdir`, ...) | Execution environment | Stopped the file-op path |
| 4 | Root cause: `.bashrc` had no non-interactive-shell guard, so every spawned bash ran interactive startup and hung. Added the guard | Execution environment | Seems to fix it |

#### Root cause and lesson

The defect was in the environment, not the agent: a `.bashrc` without a non-interactive-shell guard. Every bash spawned by the agent inherited it, hung on interactive-only startup, timed out, and the retry loop amplified one hang into a memory blowup. The instruction and permission fixes reduced the symptoms at their layers; the guard removed the cause. When fixes at one layer keep failing, the real defect may sit deeper - keep the loop going until you find the layer that actually stops the failure.
