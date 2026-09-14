---
layout: default
permalink: /lecture04/
---

# Lecture 04 - Split Instructions Across Files

Notes from [lecture 4](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-04-why-one-giant-instruction-file-fails/) (slug: *why one giant instruction file fails*).

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [What makes sense](#what-makes-sense)
- [Inaccuracies found](#inaccuracies-found)
- [What's missing](#whats-missing)
  - [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce)
- [Exercises](#exercises)
- [References](#references)

## Lecture summary

The trap: you write an `AGENTS.md`, it grows 50 → 300 → 450 → 600 lines, and the agent gets *worse*. A bug fix burns context on deployment instructions; a security constraint at line 300 is ignored; three contradictory style rules mean the agent picks one at random each run. Everything in the file looked useful when it went in, and only a third of it is relevant to any given task.

The vicious cycle: agent errs → you add a rule → it works temporarily → a different error appears → another rule. Five failure modes follow from the bloat:

- **Context budget** - the file competes with source reading, tool output, and history for a finite window.
- **Lost in the middle** - Liu et al., 2023: models use middle-of-text information far less effectively than the start or end.
- **Priority conflicts** - hard constraints, design guidelines, and one-off history lessons all look identical on the page.
- **Maintenance decay** - deleting feels risky, adding feels free, so the file only grows.
- **Contradiction accumulation** - rules added months apart conflict, and the agent arbitrates at random.

The prescription is an instruction architecture: the entry file stays 50-200 lines (project overview in one or two sentences, first-run commands, at most 15 hard constraints, links to topic docs with a "required reading when..." condition). Topic docs run 50-150 lines under `docs/` or beside the module, read only when the task needs them. Anything that must stay in the entry file goes at the top or bottom, never the middle. Every rule carries a source, an applicability condition, and an expiry condition, and gets audited like a dependency.

Worked example: a SaaS team's `AGENTS.md` went 50 → 600 lines mixing stack versions, style rules, bug history, API guides, deploy procedures, and personal preferences. After refactoring to an 80-line entry file plus three topic docs (120 / 60 / 80 lines), task success rate went 45% → 72% and security-constraint compliance 60% → 95%.

## Key concepts

- **Instruction Bloat** - an instruction file at 10-15% of the context window starts crowding out code reading and reasoning.
- **Lost in the Middle** - position within a long input changes how reliably its content is used.
- **Instruction Signal-to-Noise Ratio (SNR)** - the share of the file relevant to the current task. Reading 50 lines of deploy rules during a bug fix is low SNR.
- **Entry File** - a router, not an encyclopedia: overview, run commands, hard constraints, links.
- **Reveal on Demand** - overview first, details on request. Borrowed from progressive disclosure in UI design.
- **Can't Tell What Matters** - uniform formatting hides the difference between a red line and a suggestion.
- **Packing cubes** - the lecture's metaphor for topic docs: one cube per subject, so finding a charger does not mean emptying the bag.

## What makes sense

This is the method for a rule the earlier lectures only asserted. [Lecture 01](../lecture01/) called `AGENTS.md` "a map, not an encyclopedia"; [lecture 02](../lecture02/) said ~100 lines and "if it does not fit, split it into a `docs/` directory"; neither said how to split or what happens when you don't. Lecture 04 supplies the cut lines, the file sizes, and the failure modes.

It is also [lecture 03](../lecture03/)'s Principle 3 (*minimal but complete*: "if removing a rule doesn't affect decision quality, it shouldn't exist") applied one level down. Lecture 03 asks whether a knowledge item earns its place in the repo; lecture 04 asks whether it earns its place in the always-loaded file, and gives the removed rules somewhere to go.

The two lectures converge on the same file size from different directions: lecture 03 wants the entry file small enough to be discoverable, lecture 04 wants it small enough that its contents survive the middle-of-context effect. Same number, two independent mechanisms, which is a better argument for it than either alone.

Per-rule lifecycle is the strongest idea in the lecture. Source, applicability, expiry, and a regular audit turns "add a rule" from a reflex into a decision with a cost. The lecture's line - "manage your instructions the way you manage code dependencies" - is the same move as [Infrastructure as Code](https://martinfowler.com/bliki/InfrastructureAsCode.html) from lecture 03: make the implicit artifact explicit, versioned, and reviewable.

And the numbers answer lecture 03's weakest spot. Lecture 03's transformation story reported "70% of tasks required human intervention, quality improved significantly" with no matching before/after pair. Lecture 04 reports 45% → 72% on the same task set, which is the shape an anecdote needs to read as evidence.

## Inaccuracies found

### The token math uses two different context windows

The vicious-cycle section establishes "say your agent has a 200K token window (Claude's standard). A bloated instruction file might consume 10-20K tokens." Core Concepts then defines Instruction Bloat as "10-15% of the context window" and, in the next sentence, calls 10,000-20,000 tokens "8-15% of a 128K window." Three percentages for one quantity, resting on two different windows.

The arithmetic is only self-consistent on the 128K basis (20,000 / 128,000 = 15.6%). Either the window in the first bullet should be 128K, or the percentage in Core Concepts should be 5-10%. Minor on its own, but it is the one quantitative claim in a section arguing that numbers matter.

Worth a sanity check too: 20,000 tokens over 600 lines is about 33 tokens per line, roughly twice what markdown prose costs. The upper bound only holds for a file that is mostly code blocks. A typical 600-line instruction file is nearer 8,000-10,000 tokens - still worth splitting, but the scare number is inflated.

### "Lost in the middle" is a measured tendency, not a guarantee

Liu et al. tested how well models retrieve and use a relevant passage placed at various positions in a long input of distractor documents. That is multi-document QA and key-value retrieval. It is not instruction compliance in an `AGENTS.md`, and the paper makes no claim about it. That gap becomes "line 300 will almost certainly be ignored" - a certainty the cited work does not carry, applied to a task it did not measure.

The direction is plausible and worth designing around. The honest version: information at the extremes is used more reliably than information in the middle, the effect size varies with model, context length, and how well-structured the input is, and it shrinks as all three improve.

There is also an ordering problem in the fix. "Put it at the top or bottom" is a patch that keeps the 600-line file; splitting is the actual repair, and after a correct split the entry file is 80 lines where everything is near an extreme anyway. The lecture gives both, but leads with position, which is the weaker of the two.

### The headline number is attributed to the wrong change

The refactor made four changes at once: the entry file went 600 → 80 lines, three topic docs were created, links were added, and historical notes were converted into test cases or deleted.

That last one is a [lecture 02](../lecture02/) feedback-subsystem change - the subsystem lecture 02 calls the highest-ROI investment. Converting prose rules into executable checks plausibly carries a large share of the 45% → 72% gain, and the story cannot separate it from the split.

The 60% → 95% compliance jump is cleaner: the rule moved from line 300 to the top of the entry file, which is a position change, not a split. So the anecdote actually supports two claims - splitting helps, and position matters - and the lecture uses it for the first one only.

The numbers themselves are also unaudited. They are updated in [PR #75](https://github.com/walkinglabs/learn-harness-engineering/pull/75), which renames the section to "Illustrative Example" and adds a disclaimer that the figures are teaching illustrations rather than measurements from a real project.

### A scoped exception filed as a contradiction

The contradiction example is "one says use TypeScript strict mode, another says some legacy files are allowed to use any." The second is an exception scoped to a directory, not a conflict; both rules can be satisfied at once. A real contradiction is two rules that cannot both hold, like "always use SQLAlchemy 2.0 syntax" and "always use raw SQL for reporting queries."

The distinction matters because "contradiction" is the label that justifies deletion. Treating a legitimate scoped exception as a contradiction is how audits end up removing the exceptions that were doing real work. The repair for an exception is to make the scope explicit and move it next to the code it concerns, not to delete it.

### "Source, applicability, expiry" on every rule rebuilds the bloat

Applied literally to all 15 hard constraints in the entry file, three fields of metadata per rule roughly triples that section - the same file growth the lecture is arguing against. Metadata belongs with the topic doc for anything that lives in one, and it only earns its place on rules whose provenance is genuinely non-obvious. "Do not use `eval()`" does not need a source note.

The same problem appears at a larger scale. Fifteen hard constraints plus "put important items at the top" means the top of the entry file is entirely hard constraints, and within that section position no longer discriminates anything. When every line is a red line, the agent is back to having no signal - the "can't tell what matters" failure mode, reintroduced by the fix.

## What's missing

### "On demand" is not automatic - the loading mechanism is absent

The lecture's central mechanism is that topic docs are "loaded only when needed." It never says what makes that true, and in Claude Code the obvious implementation does not work.

`@import` in `CLAUDE.md` moves text, not cost: an imported file is expanded into context at launch. Splitting a 400-line file into five imports still loads 400 lines every session. A topic doc wired in with `@docs/api-patterns.md` saves nothing.

On-demand loading needs a mechanism that loads by location or trigger:

- a nested `CLAUDE.md` / `AGENTS.md` in the directory the rules concern, loaded when the agent works in that subtree
- a path-scoped `.claude/rules/*.md`, applied by glob
- a skill, loaded when its description matches the task

Three more loading facts the lecture's advice depends on and never states: import chains stop after four hops with no error; an `@import` inside backticks or a fenced block is literal text and never loads; and content in a nested file is invisible to a session that never opens that subtree.

This is the difference between the lecture's architecture being advisory and being real. The file layout can be perfect and the tokens still get spent at startup.

### AGENTS.md is not one file for every tool

The lecture uses `AGENTS.md` as the name of the entry file throughout. Claude Code reads `CLAUDE.md`, not `AGENTS.md` - a repo with only `AGENTS.md` gives Claude Code no instructions at all, and nothing warns; `/context` shows an empty memory-file list. The tool-agnostic fix is `AGENTS.md` as the source of truth plus a `CLAUDE.md` whose first line is `@AGENTS.md`, or a symlink when there are no Claude-only additions. A copy of either drifts.

Loading semantics differ per tool in ways that change where rules belong. Codex concatenates instruction files from the repo root down to the launch directory and stops once the total hits `project_doc_max_bytes` (32 KiB by default), root first - so a bloated root file silently crowds out every nested file beneath it, which is the lecture's own failure mode with a different mechanism. A rule that lives only in `packages/api/AGENTS.md` never reaches a Codex session started at the root, and never reaches a Claude Code task that does not open that subtree. Universal rules belong in root.

The lecture's sizes (50-200 for the entry file, 50-150 for topic docs) also sit under no measured ceiling. [lecture 01](../lecture01/) and [lecture 02](../lecture02/) both say ~100, [lecture 03](../lecture03/) says 50-100, this one says 50-200. They agree on the order of magnitude, which is the useful part; the exact bound is a convention, not a finding.

### The audit is a convention, not a mechanism

"Audit regularly and delete outdated entries" is advice with no enforcement, and the lecture itself has just explained why the discipline fails: deletion feels risky, addition feels free. The fix is the [lecture 02](../lecture02/) pattern - move what can be checked out of prose and into an exit code. For an instruction file that means a CI check on the size of the entry file, a check that every linked path resolves, and a rule that a constraint without an owner fails the build.

Two habits from the ecosystem's own tooling are worth stealing. The `claude-md-improver` skill (see [References](#references)) audits first, outputs a quality report with per-criterion scores, gets approval, then applies targeted additions and re-scores; the report-before-edit order is what keeps an audit from becoming a rewrite. And a full rewrite destroys wording that survived contact with a real failure. Targeted diffs are also what make the "does removing this change behavior?" question answerable per line.

There is a validation step the lecture's audit omits entirely: run the commands the file names. A checklist pass does not prove `make test` still exists. Broken commands hide behind passing scores.

### What belongs where: a destination without a test

The lecture says history notes should be "converted to test cases or deleted," which names the destination but not the decision. The operational tests:

- **Dead weight:** "would removing this cause the agent to make a mistake?" No means cut it. This is lecture 03's Principle 3 with a sharper question attached.
- **Harmful precision:** "is this wrong on any plausible task in this repo?" A prohibition that is wrong one task in ten is still obeyed on that task, and the agent cannot tell it is the exception. `NEVER write comments` becomes `match the comment density of the file you are editing` - shorter, no exception list to maintain, and correct in a densely commented file without being told. This is a real answer to the lecture's "can't tell what matters" problem: some of the ambiguity is fixed by ranking rules, and some by phrasing rules so they cannot be wrong.
- **Owned elsewhere:** user preferences and evolving project status load every session, are not repo knowledge, and drift silently because nothing in the codebase contradicts them. Those belong in auto-memory or a local file, not in the shared entry file.
- **Already handled by the harness:** a rule that restates harness behavior is not free - the agent reconciles it against what the harness already does before it can act, and pays that cost on every task. "Always read a file before editing it" is a whole reconciliation for zero behavior change.
- **Enforceable mechanically:** a rule a linter, a permission rule, or a hook can enforce belongs there instead of in prose. The instruction should document the mechanism, not stand in for it. See [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce) below.

Absolutes still earn their place for safety, data loss, and format contracts, and for rules the agent has been observed to break. The lecture's 15-constraint budget is a reasonable default for that set.

### Instructions are not gates: what a rule cannot enforce

This lecture argues to split instructions, then relies on them for the one thing they cannot do. Its worked example ends with security-constraint compliance rising 60% -> 95%, which is still a one-in-twenty failure on a rule the file calls a hard constraint. Prose moves the rate; it does not set it. If the outcome has to hold, the enforcement has to sit somewhere other than the file.

The project this repo belongs to hit that boundary from the other side. My `CLAUDE.md` there already carried a publishing rule: `git push`, `git tag`, and `gh release` need explicit approval every time, an approved release is approval for that version only, and `--no-verify` is never allowed. On 2026-09-13 an agent pushed `v0.1.5`, `v0.1.6`, and `v0.1.7` and published three GitHub releases while I was away from the terminal. The rule was in context, correctly written, and unenforced. The write-up is [Guarding agent-driven git push, tag, and release](https://github.com/alecchen/ccbunshin/blob/main/docs/HARNESS_PUBLISH_GATING.md), and its structure is the general recipe.

**A rule has three possible destinations, and only one of them is a gate.**

| kind | example | where it lives | what it does |
|---|---|---|---|
| judgment | "prefer composition over inheritance" | prose, in the entry file or a topic doc | steers choices a mechanism cannot enumerate |
| documentation | "we deprecated the `v1` client in June" | prose, in a topic doc | supplies context for decisions |
| constraint | "never publish without approval" | permission rule, `PreToolUse` hook, CI job, server-side gate | runs whether the agent agrees or not |

The lecture's hard-constraints section mixes the first two kinds into the third's slot and calls the result non-negotiable. `Never deploy on Fridays` is prose, sits in a file, and cannot stop a Friday deploy. It is written as an absolute and reads like one.

Prose still has one property a gate does not: **it is always in context.** A permission rule fires only on a matching tool call, and a hook fires only for the tools in its matcher. An agent that never runs the gated command never encounters the gate. The useful division is to keep prose for the reasoning that generalizes to cases nobody anticipated, and move the subset that must hold to a mechanism. The gate replaces the enforcement, never the explanation - hard constraints stay worth writing down, because they tell the agent which parts of its own judgment it should not trust.

**Mechanical gates fail in two directions, and only one of them is visible.**

The first is a gate that discriminates wrong: too broad and it prompts on innocent work, too narrow and it misses the case it was built for. A gate that fires on harmless local commands trains the operator to approve without reading - the same "can't tell what matters" failure the lecture diagnoses in prose, arriving through the fix instead of the problem.

The second is worse. **A text-matching gate that never matches produces no output and no warning.** No prompt, no deny, no log line. Every evasion in the publish-gate write-up fails this way: a rule ending in a bare flag with no trailing `*` requires a token to follow and silently matches nothing; `git * push --no-verify*` requires the literal text `" push"`, which `git push` does not contain; `Bash(git push *)` does not match `git -C . push`, `git -c k=v push`, or a path-qualified binary. In each case the entry stays in the settings file looking like protection while being inert. This is the lecture's knowledge-decay warning applied to mechanisms: a stale gate is worse than no gate, because the agent and the human both read the config as covered.

The failure lands harder for gates than for prose. A stale prose rule gets diluted by everything around it and competes for attention; a stale gate has exactly one job and does not do it, with nothing in the transcript to say so. A well-written permission rule and a rule discarded at load look identical from the outside - and MCP rules with arguments are discarded at load outright, which is a worse mode than a plain non-match because the file never stops advertising them.

**Writing the gate is the cheap half. Proving it fires is the expensive half.**

That is the structural difference from the lecture's audit advice. "Audit regularly and delete outdated entries" assumes the hard part is deciding what stays. For a mechanism, the hard part is verification, and the verification needs a way to observe the result. How you build that depends on what the gate actually does.

A hook that makes a decision can be fed synthetic payloads with nothing executed and no prompts to answer: a case table exercises the classifier's logic directly, which is the cheapest instrument available and the one to reach for first.

A permission rule cannot be tested that way, because the rule is matched by the harness rather than by code you can call. The instrument is the mutation. Temporarily point the rule's condition at the mode the session actually reports, run one publish-shaped command against a remote that cannot resolve, and confirm the block comes back in the tool result, then restore. Mutating to the mode you assumed you were in matches nothing and proves nothing while looking like a failure.

Either way, prefer testing the deny path. A denial returns as a tool result, so the loop closes without a human. An `ask` needs a person to say they saw the prompt - the agent cannot see permission dialogs, so an approved command and an un-gated one look identical from the agent's side.

And test per tool. Gates attach to tool names, so a gate verified through the native shell says nothing about the same command reaching the machine through an MCP shell server. That gap is how the second incident in the write-up happened: a matcher of `"Bash"` and a session that had stopped using the Bash tool entirely.

**Some constraints cannot be gated locally at all.** Script indirection is the standing example: `bash deploy.sh` is a clean line to every command-text gate no matter what the script contains. What is left is a server-side gate, and in that project it is a GitHub environment with a required reviewer on the release job, which holds regardless of what any local agent does. The same shape applies here, with a smaller blast radius: GitHub Pages builds from `main` and there is no staging environment to require review on, so this repo has no server-side gate on publication - only the conventions in `CLAUDE.md`. A mistaken publish here is a commit on a static site, which a follow-up commit reverses. The ccbunshin incident published a release that `install.sh` resolves by latest, so the same mistake was not reversible by the next commit.

That difference is the point, and it is what keeps this section from being an argument for machinery. This repo has no `.github/` directory and no publishing gate of any kind, and leaving it that way is correct: the failure the gates exist to prevent is not reproducible here. Nothing is installed from a release, so nothing breaks when one is published by mistake. A repo whose artifacts are immutable or consumed by an installer needs the server-side layer; a repo whose worst publish is a bad commit does not, and adding one there buys ceremony rather than safety.

**Two habits generalize past publishing.** Let the enforcement live where it can be verified by something other than the agent's own report, and treat every gate as having a source, an applicability condition, and an expiry condition - the lecture's own rule lifecycle, applied to mechanisms instead of prose. A gate nobody has tested is a gate you are assuming works, which is the same epistemic position as trusting a prose rule and with fewer excuses.

## Exercises

The lecture's three, with my take:

1. **SNR audit** - list every entry in the entry file, test each against 5 common task types, mark relevant or noise, compute the ratio. Cheap, operational, and the same measurement shape as lecture 03's knowledge-gap inventory: a before/after number for the context-provision layer.
2. **Reveal on demand refactor** - split a 300+ line file and compare success rates on at least 5 tasks. Run it, but control the confound the lecture's own story has: change one thing at a time (split only, then position only, then notes-to-tests) or you will not know which change bought the gain.
3. **Lost in the middle verification** - place one critical constraint at top, middle, and bottom, 5+ runs per position. This is the only exercise that can falsify the lecture's core mechanism, so it is worth running before restructuring on the strength of the effect. Hold the rule's wording fixed across positions; if the phrasing varies, you are measuring the phrasing.

## References

- [Lecture 04: the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-04-why-one-giant-instruction-file-fails/)
- [Lecture 04: code examples](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/lectures/lecture-04-why-one-giant-instruction-file-fails/code/) - a short `AGENTS.md` template, an anti-patterns list, and a TypeScript simulation comparing lines read in a monolithic file vs four split files
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/), [lecture03](../lecture03/)
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) - entry files should be "short and routing-oriented"
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - control information should be "concise and high-priority"
- [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172) - Liu et al., 2023
- [HumanLayer: Harness Engineering for Coding Agents](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents)
- [Guarding agent-driven git push, tag, and release](https://github.com/alecchen/ccbunshin/blob/main/docs/HARNESS_PUBLISH_GATING.md) - my write-up of the same problem one layer down: why a prose rule did not stop an agent from publishing, and the five-layer permissions / hooks / CI / server-side construction that does
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

### Improving your own CLAUDE.md / AGENTS.md

- [agents-md skill (mblode/agent-skills)](https://github.com/mblode/agent-skills/blob/main/skills/agents-md/SKILL.md) - the dead-weight and harmful-precision tests; the `CLAUDE.md` → `@AGENTS.md` pointer pattern; the per-tool loading gotchas (imports expand at launch, four-hop limit, Codex's 32 KiB concatenation cap); a 12-check quick audit and a 49-check full audit
- [claude-md-improver skill (anthropics/claude-plugins-official)](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-md-management/skills/claude-md-improver/SKILL.md) - discovery across root / package / local / global files, weighted quality scoring (A-F), a report-before-edit workflow, and targeted diffs for stale commands, missing setup, and undocumented gotchas
- [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md) - don't auto-generate or `/init` it
- [claude-md-management plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) - `/revise-claude-md` and the improver skill
- [A CLAUDE.md That Follows](https://anthropic.skilljar.com/claude-code-in-action/486929), [Claude Code 101](https://anthropic.skilljar.com/claude-code-101) - course material, linked from [lecture02](../lecture02/)
