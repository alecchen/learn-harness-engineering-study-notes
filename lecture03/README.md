---
layout: default
permalink: /lecture03/
---

# Lecture 03 — Why the Repository Must Become the System of Record

Notes from [lecture 3](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/).

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [What makes sense](#what-makes-sense)
- [Inaccuracies found](#inaccuracies-found)
- [What's missing](#whats-missing)
- [Exercises](#exercises)
- [References](#references)

## Lecture summary

The lecture argues the repository must become the system of record for AI agents. Teams scatter decisions across Slack, Confluence, Jira, and engineers' heads; humans can improvise around that, agents cannot. An agent's only inputs are system prompts and task descriptions, file contents from the repository, and tool execution output — everything outside the repo is invisible to it. The repo is the only stable, reliably accessible storage the agent has.

The flow: problem (scattered knowledge) → principle (repo as the only input) → concrete structure (what goes where) → state management (ACID) → worked example (30-microservice e-commerce team) → exercises.

## Key concepts

- **Knowledge Visibility Gap** — the portion of project knowledge missing from the repo. Larger gaps correlate with higher agent failure rates.
- **Fresh Session Test** — open a brand-new agent session with only the repo as input; ask five questions: What is this system? How is it organized? How do I run it? How do I verify it? What's the current progress? "If it can't answer, the map has blank spots" — wrong guesses become bugs, excessive guessing wastes context.
- **Four principles**
  1. Knowledge lives next to code — short docs in each module directory (responsibilities, interfaces, constraints).
  2. Standardized entry file — `AGENTS.md` as the agent's landing page: what the project is, how to run it, how to verify it, in 50-100 lines.
  3. Minimal but complete — every knowledge piece needs a use case; "if removing a rule doesn't affect decision quality, it shouldn't exist."
  4. Update with code — bind knowledge changes to code changes; CI can remind devs to check docs.
- **Canonical repo structure** — `AGENTS.md` at root, `ARCHITECTURE.md` / `CONSTRAINTS.md` per module, `PROGRESS.md` tracking done/in-progress/blocked, `Makefile` with standardized commands.
- **ACID principles for agent state** — Atomicity (a logical operation commits as a whole only once complete and verified), Consistency (verification predicates: tests pass, lint clean), Isolation (concurrent agents use separate progress files or branches), Durability (critical knowledge in git-tracked files; "what's in your head doesn't count").
- **Knowledge decay is the biggest enemy** — stale docs are worse than none: they send the agent in the wrong direction while it thinks it's on the right track.

## What makes sense

- The core claim matches the harness-engineering discourse: OpenAI's [Harness Engineering](https://openai.com/index/harness-engineering/) and Anthropic's [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) both center on the repo as the agent's reliable input channel. This is lecture 02's "repo is the single source of truth" ([lecture02](../lecture02/)) made concrete.
- The fresh session test is measurable and actionable — a good repo-quality metric, and it is lecture 01's "AGENTS.md as a map, not an encyclopedia" ([lecture01](../lecture01/)) in test form: the map is what lets a fresh session find answers.
- Knowledge next to code matches local-context best practice: the agent encounters the doc exactly where the relevant code is.
- "Minimal but complete" guards against the failure mode lecture 01 warned about — over-provisioned context is wasted tokens and off-target edits.
- The knowledge-decay warning is the most important line in the lecture: stale docs actively mislead, which is worse than absence (absence forces a guess the agent knows is a guess).

## Inaccuracies found

### Atomicity: `git stash` is not a rollback — fixed in [PR #65](https://github.com/walkinglabs/learn-harness-engineering/pull/65)

The original Atomicity bullet said a logical operation gets one git commit, and if it fails midway, `git stash` to roll back. Two problems:

1. `git stash` is suspend/resume, not discard — it preserves the working tree so it can be popped back later. A DB rollback erases the failed attempt. The original sentence contradicted its own "all or nothing."
2. If a commit fails, no commit is produced — nothing to roll back at the commit level. What can be inconsistent is the uncommitted working tree, not commit history. The bullet conflated the two failure points.

Filed and merged; the live page now reads:

> A "logical operation" (say, adding an endpoint and updating its tests) is committed as a whole only once it's complete and verified. A failed or abandoned attempt gets discarded, not partially merged. All or nothing.

### Consistency: "run tests" is not the DB meaning of consistency

In a database, consistency means invariants hold — every transaction moves the system from one valid state to another. The lecture's bullet defines it as "define verification predicates, run verification after each operation," which conflates the verification *mechanism* with the *property*. The invariant itself would be "the codebase is in a valid state" (tests pass, lint clean, docs match code). Notably, "docs match code" is the lecture's own Principle 4 ("update with code") — the repair aligns the letter with the lecture's existing content.

There is also a cross-lecture tension: "the agent runs verification after each operation" is the doer checking its own work. Lecture 02's "separate the doer from the checker" says the checker must be independent — otherwise the Consistency guarantee inherits the agent's mistakes.

Suggested repair:

> Consistency: In a database this means invariants hold — every transaction moves the system from one valid state to another. The repo equivalent: define your invariants (all tests pass, lint clean, docs match code) and verify them after each operation. An operation that leaves the state invalid is not committed.

### The deeper hazard: ACID implies guarantees the repo doesn't provide

ACID in a database is enforced by the system — you get atomicity whether you want it or not. In a repo, none of these are automatic; they are discipline the harness and agent must enforce: choosing to commit complete work, run verification, avoid clobbering, write knowledge down. Calling that "ACID" risks implying the repo provides guarantees it doesn't. One caveat sentence would make the analogy safe:

> One caveat: in a database, ACID is guaranteed by the system. Here none of it is automatic — these are practices the harness and agent must enforce. The repo is not a DBMS.

The analogy is still worth keeping: Atomicity, Isolation, and Durability map well (concurrent agents ≈ concurrent transactions; git-tracked knowledge surviving session death ≈ committed data surviving a crash). Only Consistency is a stretch, and it is repairable — dropping the analogy for a plain checklist ("commit complete work, verify after each step, avoid concurrent writes, write knowledge to files") is the fallback if the repair work isn't wanted.

## What's missing

### Agents write back to the repo

The lecture presents the repo as one-way: humans write, agents read. The stronger framing — and what makes it a *living* system of record rather than a static spec — is that agents write back too: updating `PROGRESS.md`, recording decisions as they work. The lecture half-implies this in the Isolation bullet (agents owning their own progress files) but never states it.

A prompt rule is not enough — it is task-spec, it asks but does not enforce. The write-back should live in the execution environment: hooks that run on `Stop` (end of turn) or `SessionEnd` (session exit) regardless of what the agent decides to do. A hook script can write the progress file itself, nudge the agent to update it, or block the turn from completing until the plan is current. This is lecture 02's state subsystem — `PROGRESS.md` read at session start, updated at session end ([lecture02](../lecture02/)) — enforced mechanically instead of by convention.

[planning-with-files](https://github.com/OthmanAdi/planning-with-files) is a concrete implementation, wired across the whole session lifecycle. The hooks are declared in the skill's `SKILL.md` frontmatter — Claude Code applies a skill's frontmatter `hooks:` while the skill is active:

| Hook | What it does |
|------|--------------|
| `UserPromptSubmit` / `PreToolUse` | Injects the plan head + progress into context at every turn and tool call, so the agent always sees current state |
| `PostToolUse` (Write/Edit) | Nudges the agent to update `progress.md` / `task_plan.md` after each change |
| `Stop` | Runs a completion gate (`gate-stop.sh`); in gated mode it can block the agent from finishing until the plan is current |
| `PreCompact` | Re-injects the plan before context compaction, so the plan survives a compress |

It persists three files — `task_plan.md` (phases, resume point), `findings.md` (research notes, decisions), `progress.md` (session log, results) — and a fresh session re-reads them to resume. Cited result: 5 turns to recover after a context wipe vs 13.3 without. Note the write-back is a mix of two patterns: `PostToolUse` nudges the agent to write, while the `Stop` gate verifies the files are current.

### Git history is part of the record

"System of record" implies an audit trail, but the lecture never mentions git history. Commit messages are durable record of *why* decisions were made — the exact thing the opening complains is scattered across Slack and heads.

### No boundary on what stays out of the repo

Given the title, a reader could over-apply the principle: secrets, generated artifacts, and environment config do not belong in the repo. One short "what stays out" bullet (secrets → secret store, generated → build output, config → env) would prevent over-commitment — and it is the natural hook for the Twelve-Factor reference in Further Reading (see [12factor.md](12factor.md)).

### "Only inputs" claim is slightly overstated

"System prompts, repo files, tool output" is true for a default harness, but agents also get web access, MCP servers, and other channels. One caveat clause ("in a default setup") keeps the point without overstating it.

### The transformation story has vague metrics

"70% of tasks required human intervention... quality improved significantly" — no comparable before/after number on the same metric. A concrete pair (e.g., fresh-session questions answerable 2/5 → 5/5, intervention rate 70% → X%) would make the anecdote read as evidence.

### "System of record" is never defined

The term is used as a metaphor from enterprise IT (the authoritative source for a data element) but never defined. One sentence early — "the repo is the authoritative, durable, single source of truth for anything the agent needs to know" — would make the title land.

## Exercises

The lecture's three exercises, with my take:

1. **Fresh session test** — 5 questions, no context given. This is lecture 01's verification-gap measurement applied to context instead of code: the repo's context-provision layer, measured.
2. **Knowledge externalization quantification** — inventory decisions, mark each inside/outside the repo, compute the gap, plan to bring it below 10%. A good before/after experiment, same shape as lecture 02's team-story table.
3. **ACID assessment** — evaluate your project's state management on the four letters. Worth doing with the Consistency and the guarantee-vs-practice caveats above in mind.

## References

- [Lecture 03 — the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/)
- [PR #65: Fix inaccurate git analogy in Lecture 03](https://github.com/walkinglabs/learn-harness-engineering/pull/65) — my Atomicity fix, merged
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Infrastructure as Code — Martin Fowler](https://martinfowler.com/bliki/InfrastructureAsCode.html)
- [ADR: Architecture Decision Records](https://adr.github.io/)
- [The Twelve-Factor App](https://12factor.net/) — companion note: [12factor.md](12factor.md)
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/)