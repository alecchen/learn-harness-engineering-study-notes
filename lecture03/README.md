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

The lecture's claim is simple: the repository has to become the system of record for AI agents. Teams scatter decisions across Slack, Confluence, Jira, and engineers' heads. Humans can improvise around that mess; agents can't. Everything an agent sees comes from a short list of inputs - system prompts, task descriptions, repository files, tool output - and everything outside the repo is invisible to it. The repo is the only storage the agent can reliably reach, session after session.

The lecture then walks a fixed path: problem (scattered knowledge) → principle (repo as the only input) → concrete structure (what goes where) → state management (ACID) → worked example (30-microservice e-commerce team) → exercises.

## Key concepts

- **Knowledge Visibility Gap** - the share of project knowledge missing from the repo. Larger gaps correlate with higher agent failure rates.
- **Fresh Session Test** - open a brand-new session with only the repo as input and ask five questions: What is this system? How is it organized? How do I run it? How do I verify it? What's the current progress? "If it can't answer, the map has blank spots" - wrong guesses become bugs, and excessive guessing burns context.
- **Four principles**
  1. Knowledge lives next to code - short docs in each module directory covering responsibilities, interfaces, constraints.
  2. Standardized entry file - `AGENTS.md` as the agent's landing page: what the project is, how to run it, how to verify it, in 50-100 lines.
  3. Minimal but complete - every knowledge piece needs a use case; "if removing a rule doesn't affect decision quality, it shouldn't exist."
  4. Update with code - bind knowledge changes to code changes; CI can remind devs to check the docs.
- **Canonical repo structure** - `AGENTS.md` at root, `ARCHITECTURE.md` / `CONSTRAINTS.md` per module, `PROGRESS.md` tracking done/in-progress/blocked, `Makefile` with standardized commands.
- **ACID principles for agent state** - Atomicity (a logical operation commits as a whole only once complete and verified), Consistency (verification predicates: tests pass, lint clean), Isolation (concurrent agents use separate progress files or branches), Durability (critical knowledge in git-tracked files; "what's in your head doesn't count").
- **Knowledge decay is the biggest enemy** - stale docs are worse than none: they send the agent in the wrong direction while it thinks it's on the right track.

## What makes sense

The core claim matches the harness-engineering discourse. OpenAI's [Harness Engineering](https://openai.com/index/harness-engineering/) and Anthropic's [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) both center on the repo as the agent's reliable input channel. This is lecture 02's "repo is the single source of truth" ([lecture02](../lecture02/)) made concrete.

The fresh session test is measurable and actionable - a good repo-quality metric. It's lecture 01's "AGENTS.md as a map, not an encyclopedia" ([lecture01](../lecture01/)) in test form: the map is what lets a fresh session find answers.

Knowledge next to code matches local-context best practice: the agent meets the doc exactly where the relevant code is. And "minimal but complete" guards against the failure mode lecture 01 warned about - over-provisioned context is wasted tokens and off-target edits.

The knowledge-decay warning is the most important line in the lecture: stale docs actively mislead, which is worse than absence. Absence forces a guess the agent knows is a guess; a stale doc is a confident guess in the wrong direction.

## Inaccuracies found

### Atomicity: `git stash` is not a rollback - fixed in [PR #65](https://github.com/walkinglabs/learn-harness-engineering/pull/65)

The original Atomicity bullet said a logical operation gets one git commit, and if it fails midway, `git stash` to roll back. Two problems:

1. `git stash` is suspend/resume, not discard - it preserves the working tree so it can be popped back later. A DB rollback erases the failed attempt. The original sentence contradicted its own "all or nothing."
2. If a commit fails, no commit is produced - nothing to roll back at the commit level. What can be inconsistent is the uncommitted working tree, not commit history. The bullet conflated the two failure points.

Filed and merged; the live page now reads:

> A "logical operation" (say, adding an endpoint and updating its tests) is committed as a whole only once it's complete and verified. A failed or abandoned attempt gets discarded, not partially merged. All or nothing.

### Consistency: "run tests" is not the DB meaning of consistency

In a database, consistency means invariants hold - every transaction moves the system from one valid state to another. The lecture's bullet defines it as "define verification predicates, run verification after each operation," which conflates the verification *mechanism* with the *property*. The invariant itself would be "the codebase is in a valid state" (tests pass, lint clean, docs match code). Notably, "docs match code" is the lecture's own Principle 4 ("update with code") - the repair aligns the letter with the lecture's existing content.

There is also a cross-lecture tension: "the agent runs verification after each operation" is the doer checking its own work. Lecture 02's "separate the doer from the checker" says the checker must be independent - otherwise the Consistency guarantee inherits the agent's mistakes.

Suggested repair:

> Consistency: In a database this means invariants hold — every transaction moves the system from one valid state to another. The repo equivalent: define your invariants (all tests pass, lint clean, docs match code) and verify them after each operation. An operation that leaves the state invalid is not committed.

### The deeper hazard: ACID implies guarantees the repo doesn't provide

ACID in a database is enforced by the system - you get atomicity whether you want it or not. In a repo, none of these are automatic; they are discipline the harness and agent must enforce: choosing to commit complete work, run verification, avoid clobbering, write knowledge down. Calling that "ACID" risks implying the repo provides guarantees it doesn't. One caveat sentence would make the analogy safe:

> One caveat: in a database, ACID is guaranteed by the system. Here none of it is automatic — these are practices the harness and agent must enforce. The repo is not a DBMS.

The analogy is still worth keeping: Atomicity, Isolation, and Durability map well (concurrent agents ≈ concurrent transactions; git-tracked knowledge surviving session death ≈ committed data surviving a crash). Only Consistency is a stretch, and it is repairable. If the repair work isn't wanted, drop the analogy for a plain checklist: commit complete work, verify after each step, avoid concurrent writes, write knowledge to files.

## What's missing

### Agents write back to the repo

The lecture presents the repo as one-way: humans write, agents read. The stronger framing - and what makes it a *living* system of record rather than a static spec - is that agents write back too: updating `PROGRESS.md`, recording decisions as they work. The lecture half-implies this in the Isolation bullet (agents owning their own progress files) but never states it.

A prompt rule is not enough - it is task-spec, it asks but does not enforce. The write-back should live in the execution environment: hooks that run on `Stop` (end of turn) or `SessionEnd` (session exit) regardless of what the agent decides to do. A hook script can write the progress file itself, nudge the agent to update it, or block the turn from completing until the plan is current. This is lecture 02's state subsystem - `PROGRESS.md` read at session start, updated at session end ([lecture02](../lecture02/)) - enforced mechanically instead of by convention.

[planning-with-files](https://github.com/OthmanAdi/planning-with-files) is a concrete implementation, wired across the whole session lifecycle. The hooks are declared in the skill's `SKILL.md` frontmatter - Claude Code applies a skill's frontmatter `hooks:` while the skill is active:

| Hook | What it does |
|------|--------------|
| `UserPromptSubmit` / `PreToolUse` | Injects the plan head + progress into context at every turn and tool call, so the agent always sees current state |
| `PostToolUse` (Write/Edit) | Nudges the agent to update `progress.md` / `task_plan.md` after each change |
| `Stop` | Runs a completion gate (`gate-stop.sh`); in gated mode it can block the agent from finishing until the plan is current |
| `PreCompact` | Re-injects the plan before context compaction, so the plan survives a compress |

It persists three files - `task_plan.md` (phases, resume point), `findings.md` (research notes, decisions), `progress.md` (session log, results) - and a fresh session re-reads them to resume. Cited result: 5 turns to recover after a context wipe vs 13.3 without. Note the write-back is a mix of two patterns: `PostToolUse` nudges the agent to write, while the `Stop` gate verifies the files are current.

### Git history is part of the record

"System of record" implies an audit trail, and the lecture never mentions git history. Commit messages are a durable record of *why* decisions were made - exactly the thing the opening complains is scattered across Slack and heads.

With one caveat: git history records *what* changed and *when*; the *why* survives only if the commit message carried it. So summarizing history for decisions means reading messages, reading structural diffs, and grepping for decision language. The techniques:

| Technique | Command | Surfaces |
|---|---|---|
| The arc | `git log --oneline --graph` | Milestones, branch topology, abandoned lines of work |
| Architecture births | `git log --diff-filter=A --name-only` | New files = decisions to introduce something |
| Architecture deaths | `git log --diff-filter=D --name-only` | Deletions = decisions to abandon something |
| Reorganizations | `git log --diff-filter=R --name-status` | Renames and moves = layout decisions |
| Decision language | `git log -E --grep='migrate\|rename\|consolidate\|rewrite\|remove\|drop\|standardize'` | The refactor and maintenance layer |
| Subsystem evolution | `git log --follow -p -- <file>` | How one file's design reasoning changed over time |
| When did X disappear | `git log -S '<symbol>' --oneline` | Pickaxe: the commit that removed a specific thing |
| Integration milestones | `git log --merges --oneline` | Each merge = an integration decision |

For thin-message repos, pair with PRs: `gh pr list --state all`, then `gh pr view <n>` for the discussion - the issues/PRs habit applied to history.

Running these passes on this repo reconstructs the arc cleanly. Phase 1 (07-30): bootstrap. Phase 2 (07-30 to 08-04): the layout decision was made through renames, not declared - "consolidate into README.md" then "rename session files to README.md" (two `R100` renames) lock in "one README.md per directory" as canonical. Phase 3 (08-03): the platform decision, "Migrate site to Jekyll" - and `CLAUDE.md` appears in the same commit, the agent-facing conventions written as part of the migration. Phase 4 (08-05 to 08-09): the first experiment, `strong-harness/` vs `weak-harness/` paired dirs, then the Cowork cross-validation. Phase 5 (08-17 to 08-29): lecture02, then lecture03. The grep pass adds the maintenance layer: `humanize` (style decision: em dashes out), dead-link removals, errata tracking.

But look at what's missing: almost no message says *why*. "Migrate site to Jekyll" gives no rationale - the rationale is in CLAUDE.md's conventions. "humanize: replace em dashes" - the why is the style rule, not the commit. So even here the log is a table of contents, not the record; the record is the tracked files. On a repo where the why was never written down, history summarization bottoms out: the what/when is recoverable, the why is not. That is the strongest argument for ADRs and decision-oriented commit messages - the lecture's prescription applied to the audit trail itself.

### No boundary on what stays out of the repo

Given the title, a reader could over-apply the principle and commit everything. The boundary matters because the repo's own guarantees cut both ways: git history is durable and immutable, which is exactly why some things must stay out - once pushed, a secret or a large artifact is in the history forever. The "what stays out" list:

- **Secrets and credentials** - keep in a secret store, env, or CI secrets. API keys, tokens, passwords, `.env` with real values (`.env.example` with placeholders is fine). Leakage is irreversible: git history never forgets, so the durability the lecture wants is precisely the property that makes secrets dangerous here.
- **Generated artifacts and build output** - `.gitignore`, build caches, CI artifact stores. `_site/`, `.jekyll-cache/`, `node_modules/`, `dist/`, `target/`, `__pycache__/`. Regenerable, so committing them is noise that churns diffs and bloats clones. This repo's `CLAUDE.md` already enforces it for `_site/` and `.jekyll-cache/`, and the history shows a "remove stray vim swap file" commit - the boundary enforced in practice.
- **Environment config and local state** - per-machine config, `.env` values, editor swap files, `.DS_Store`. Machine-specific, not knowledge; a fresh session would read a committed local config and mistake it for canonical.
- **Large binaries and data** - asset stores, databases, or Git LFS. Model weights, media, DB dumps. Git history grows without bound and every clone pays for it.
- **Ephemeral working notes** - scratch files, raw logs, one-off outputs. The lecture wants durable knowledge, not everything the agent touched; Principle 3 ("minimal but complete") is the filter - if removing it doesn't affect decision quality, it doesn't exist.

The mirror test for what stays out: is it (a) regenerable, (b) confidential, or (c) machine-specific? Yes to any means it doesn't belong. This is the natural hook for the Twelve-Factor reference (see [12factor.md](12factor.md)), which draws the same lines: config in env, build artifacts out.

### "Only inputs" claim is slightly overstated

"System prompts, repo files, tool output" is true for a default harness, but the real boundary isn't "inside the repo vs outside." It's *reachability*: an agent sees whatever its tools can reach. Three channels widen the picture beyond repo files:

1. **Platform conventions make some external sources self-discoverable.** GitHub issues and PRs are the canonical case: any GitHub repo has them, the repo identity is inferable from cwd, and `gh` reaches them with no setup. Asking a fresh agent to check issues or PRs on an unfamiliar repo works precisely because the source is reachable by a default tool - not because it lives in the repo.
2. **The repo can route the agent to external sources.** A line in `README.md` or `CLAUDE.md` ("design decisions live in Confluence, bugs tracked in Jira") turns the repo into an index. The external page then becomes an input, conditional on the agent having a working tool for it: web fetch for public pages, an MCP server, API credentials. Slack, Jira, and Confluence usually fail this test - auth walls and no wired tool - so the pointer pattern works for some sources and not others.
3. **Web and MCP servers are always-on channels**, as noted before.

The accurate claim is not "the repo is the only input" but "the repo is the only input guaranteed present and reachable on every fresh session." Everything else is conditional: conditional on a tool existing, conditional on credentials, and usually conditional on the repo pointing to it.

The prescription survives, for two reasons:

- **Pointed-to content rots and is not versioned with code.** A Confluence page can change under the agent; a git-tracked file cannot. This is the lecture's own knowledge-decay warning - the index pattern inherits it.
- **Issues and PRs are conversation, not record.** Reading them answers "what happened"; the decisions behind the code still need to land in the repo to be durable. Checking issues/PRs on a new repo is a good discovery move, not a substitute for the repo holding the outcome.

Repair sentence:

> The repo is the only input guaranteed to be present and reachable on a fresh session. Other sources - web, MCP servers, issue trackers, chat archives - become inputs only when a tool can reach them, and usually only when the repo points to them.

### The transformation story has vague metrics

The one claim missing teeth: "70% of tasks required human intervention... quality improved significantly" - no before/after number on the same metric. A concrete pair (e.g., fresh-session questions answerable 2/5 → 5/5, intervention rate 70% → X%) would make the anecdote read as evidence.

### "System of record" is never defined

"System of record" is a metaphor borrowed from enterprise IT - the authoritative source for a data element - and the lecture never defines it. One sentence early would make the title land: "the repo is the authoritative, durable, single source of truth for anything the agent needs to know."

## Exercises

The lecture's three exercises, with my take:

1. **Fresh session test** - 5 questions, no context given. This is lecture 01's verification-gap measurement applied to context instead of code: the repo's context-provision layer, measured.
2. **Knowledge externalization quantification** - inventory decisions, mark each inside/outside the repo, compute the gap, plan to bring it below 10%. A good before/after experiment, same shape as lecture 02's team-story table.
3. **ACID assessment** - evaluate your project's state management on the four letters. Worth doing with the Consistency and the guarantee-vs-practice caveats above in mind.

## References

- [Slides: The Repository as System of Record](repo-system-of-record.html)
- [Lecture 03 — the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-03-why-the-repository-must-become-the-system-of-record/)
- [PR #65: Fix inaccurate git analogy in Lecture 03](https://github.com/walkinglabs/learn-harness-engineering/pull/65) — my Atomicity fix, merged
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Infrastructure as Code — Martin Fowler](https://martinfowler.com/bliki/InfrastructureAsCode.html)
- [ADR: Architecture Decision Records](https://adr.github.io/)
- [The Twelve-Factor App](https://12factor.net/) — companion note: [12factor.md](12factor.md)
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/)