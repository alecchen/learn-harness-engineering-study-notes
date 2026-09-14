---
layout: default
permalink: /lecture04/
---

# Lecture 04 - Split Instructions Across Files

Notes from [lecture 4](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-04-why-one-giant-instruction-file-fails/) (slug: *why one giant instruction file fails*).

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [Where I land](#where-i-land)
- [What the lecture gets wrong](#what-the-lecture-gets-wrong)
  - [The token math uses two different context windows](#the-token-math-uses-two-different-context-windows)
  - [The citation is for the wrong genre of evidence](#the-citation-is-for-the-wrong-genre-of-evidence)
  - [The headline number cannot be attributed to the split](#the-headline-number-cannot-be-attributed-to-the-split)
  - [A scoped exception treated as a contradiction](#a-scoped-exception-treated-as-a-contradiction)
  - ["Source, applicability, expiry" on every rule rebuilds the bloat](#source-applicability-expiry-on-every-rule-rebuilds-the-bloat)
  - [AGENTS.md is not one file for every tool](#agentsmd-is-not-one-file-for-every-tool)
  - [The recommended sizes have no measured basis](#the-recommended-sizes-have-no-measured-basis)
- [What I would do instead](#what-i-would-do-instead)
  - [What belongs where](#what-belongs-where)
  - [Split, don't reposition](#split-dont-reposition)
  - [Make the split actually unload](#make-the-split-actually-unload)
  - [The audit needs a mechanism, not discipline](#the-audit-needs-a-mechanism-not-discipline)
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

## Where I land

The design advice holds. The defects are in the evidence: two inconsistent token counts, a paper cited for a conclusion it does not support, and a case study whose headline gain cannot be separated from a second change made at the same time.

This is the method for a rule the earlier lectures only asserted. [Lecture 01](../lecture01/) called `AGENTS.md` "a map, not an encyclopedia"; [lecture 02](../lecture02/) said ~100 lines and "if it does not fit, split it into a `docs/` directory"; neither said how to split or what happens when you don't. Lecture 04 supplies the cut lines, the file sizes, and the failure modes.

It is also [lecture 03](../lecture03/)'s Principle 3 (*minimal but complete*: "if removing a rule doesn't affect decision quality, it shouldn't exist") applied one level down. Lecture 03 asks whether a knowledge item earns its place in the repo; lecture 04 asks whether it earns its place in the always-loaded file, and gives the removed rules somewhere to go.

The two lectures converge on the same file size from different directions: lecture 03 wants the entry file small enough to be discoverable, lecture 04 wants it small enough that its contents survive the middle-of-context effect. Same number, two independent mechanisms, which is a better argument for it than either alone.

Per-rule lifecycle is the strongest idea in the lecture. Source, applicability, expiry, and a regular audit turns "add a rule" from a reflex into a decision with a cost. The lecture's line - "manage your instructions the way you manage code dependencies" - is the same move as [Infrastructure as Code](https://martinfowler.com/bliki/InfrastructureAsCode.html) from lecture 03: make the implicit artifact explicit, versioned, and reviewable.

The fix it leads with is the weaker of the two it gives, and the split it does recommend only buys anything if the moved file stops loading. Both are in [What I would do instead](#what-i-would-do-instead).

## What the lecture gets wrong

### The token math uses two different context windows

The vicious-cycle section establishes "say your agent has a 200K token window (Claude's standard). A bloated instruction file might consume 10-20K tokens." Core Concepts then defines Instruction Bloat as "10-15% of the context window" and, in the next sentence, calls 10,000-20,000 tokens "8-15% of a 128K window." Three percentages for one quantity, resting on two different windows.

The arithmetic is only self-consistent on the 128K basis (20,000 / 128,000 = 15.6%). Either the window in the first bullet should be 128K, or the percentage in Core Concepts should be 5-10%. Minor on its own, but it is the one quantitative claim in a section arguing that numbers matter.

Worth a sanity check too: 20,000 tokens over 600 lines is about 33 tokens per line, roughly twice what markdown prose costs. The upper bound only holds for a file that is mostly code blocks. A typical 600-line instruction file is nearer 8,000-10,000 tokens - still worth splitting, but the scare number is inflated.

### The citation is for the wrong genre of evidence

Liu et al. measured retrieval, not compliance. Their tasks are multi-document QA over NaturalQuestions-Open (2,655 paragraph-answer queries, one answer-bearing Wikipedia passage among k-1 Contriever distractors, at 10/20/30 documents) and synthetic key-value retrieval (75/140/300 UUID pairs), plus an open-domain retriever-reader case study. In every experiment the position being varied is the position of the answer-bearing span, and the model's job is to locate it and return it. The lecture's claim is about a rule at line 300 of an `AGENTS.md`, which differs on both axes that matter: compliance asks the model to change what it does rather than report what it found, and the rule competes with every other line in the file rather than sitting as the single relevant span among numbered distractors. The paper never places an instruction at varying positions, never measures rule-following, and never mentions system prompts or instruction files. Its closest sentence is about training-data layout - the task specification is "commonly placed at the beginning of the input context in supervised instruction fine-tuning data" - which is a hypothesis for primacy bias, not a measurement of it.

The paper also declines the generalization. Section 7 is a Conclusion with no Limitations section; "The answer to this question is ultimately downstream task-specific"; and the robustness criterion it states is a benchmark it is asking future work to run: "it is necessary to show that its performance is minimally affected by the position of the relevant information." The lecture reads that request as a result - "the agent will almost certainly ignore it," "very high probability of being ignored."

What the paper does establish is a real U-shaped trend on its own tasks, and it is not something scale removes. Llama-2 7B is "solely recency biased" while 13B and 70B show the U-curve, and 70B with and without fine-tuning shows "largely similar trends." Instruction fine-tuning only "slightly reduces the worst-case performance disparity," and on 70B "minimally changes the positional bias severity." Extended-context models are "not necessarily better at using their input context" and, where the input fits both windows, are "nearly superimposed" on their non-extended counterparts. Query-aware contextualization drives key-value retrieval to near-perfect while "minimally affects performance trends in the multi-document question answering task," which is task dependence rather than a structural fix. GPT-3.5-Turbo's multi-document QA can drop "more than 20%" on a position change and, at 20 and 30 documents, fall below its closed-book 56.1%.

The honest version: information at the extremes is used more reliably than information in the middle, on retrieval-style tasks where exactly one span is relevant. The magnitude varies with model, task, and context length, and it is not the kind of effect a larger model, a longer window, or instruction tuning reliably removes. That is the argument for the lecture's design advice, and it does not expire.

The citation is the part that does not hold. The design conclusion is sound, and something in the neighborhood of it is well supported - instruction adherence is generally observed to decay with context length, which is a real reason to keep the always-loaded file short. But Liu et al. is a retrieval result wearing the clothes of a compliance result. The lecture cites it for a claim about rule-following in an `AGENTS.md`, and no reading of that paper supports one, because retrieval is not what the lecture is talking about. It needs a study that places an instruction at varying positions and scores compliance. It has none, so exercise 3 - one critical constraint at top, middle, and bottom, 5+ runs per position - is the only instrument in the lecture that could settle the question, and the lecture leaves it as homework. The mismatch is not a matter of degree: at no strength does the lecture's citation license a conclusion about how an agent follows a rule.

### The headline number cannot be attributed to the split

The refactor made four changes at once: the entry file went 600 → 80 lines, three topic docs were created, links were added, and historical notes were either converted into test cases or deleted outright.

That last one is a [lecture 02](../lecture02/) feedback-subsystem change - the subsystem lecture 02 calls the highest-ROI investment. Deleting the notes was a second subtraction, alongside the trim; converting them into checks is a mechanism the story never tests. Either branch carries a share of the 45% → 72% gain that the story cannot separate from the split.

The 60% → 95% compliance jump reads as stronger evidence than it is. Two things changed at once: the rule moved from line 300 to the top, and the file around it went from 600 lines to 80. In an 80-line entry file the middle sits 40 lines from the top, so position and length moved together, and the anecdote does not say which one produced the gain. It is the lecture's one real before/after pair, and it is evidence for the position claim the lecture derives from the wrong source rather than for the split it is used to support.

The numbers themselves are also unaudited. They are updated in [PR #75](https://github.com/walkinglabs/learn-harness-engineering/pull/75), which renames the section to "Illustrative Example" and adds a disclaimer that the figures are teaching illustrations, not measurements from a real project.

### A scoped exception treated as a contradiction

The contradiction example is "one says use TypeScript strict mode, another says some legacy files are allowed to use any." The second is an exception scoped to a directory, not a conflict; both rules can be satisfied at once. A real contradiction is two rules that cannot both hold, like "always use SQLAlchemy 2.0 syntax" and "always use raw SQL for reporting queries."

The distinction matters because "contradiction" is the label that justifies deletion. Treating a legitimate scoped exception as a contradiction is how audits end up removing the exceptions that were doing real work. The repair for an exception is to make the scope explicit and move it next to the code it concerns, not to delete it.

### "Source, applicability, expiry" on every rule rebuilds the bloat

Applied literally to all 15 hard constraints in the entry file, three fields of metadata per rule roughly triples that section - the same file growth the lecture is arguing against. Metadata belongs with the topic doc for anything that lives in one, and it only earns its place on rules whose provenance is genuinely non-obvious. "Do not use `eval()`" does not need a source note.

The same problem appears at a larger scale, and it undercuts the lecture's own ordering advice. Fifteen hard constraints plus "put important items at the top" means the top of the entry file is entirely hard constraints, and once every line there is a red line, position stops discriminating anything - the "can't tell what matters" failure mode, reintroduced by the fix. See [Split, don't reposition](#split-dont-reposition) for what to do instead.

### AGENTS.md is not one file for every tool

The lecture uses `AGENTS.md` as the name of the entry file throughout. Claude Code reads `CLAUDE.md`, not `AGENTS.md` - a repo with only `AGENTS.md` gives Claude Code no instructions at all, and nothing warns; `/context` shows an empty memory-file list. The tool-agnostic fix is `AGENTS.md` as the source of truth plus a `CLAUDE.md` whose first line is `@AGENTS.md`, or a symlink when there are no Claude-only additions. A copy of either drifts.

Loading semantics differ per tool in ways that change where rules belong. Codex concatenates instruction files from the repo root down to the launch directory and stops once the total hits `project_doc_max_bytes` (32 KiB by default), root first - so a bloated root file silently crowds out every nested file beneath it, which is the lecture's own failure mode with a different mechanism. A rule that lives only in `packages/api/AGENTS.md` never reaches a Codex session started at the root, and never reaches a Claude Code task that does not open that subtree. Universal rules belong in root.

### The recommended sizes have no measured basis

The lecture's sizes (50-200 for the entry file, 50-150 for topic docs) sit under no measured ceiling. [lecture 01](../lecture01/) and [lecture 02](../lecture02/) both say ~100, [lecture 03](../lecture03/) says 50-100, this one says 50-200. They agree on the order of magnitude, which is the useful part; the exact bound is a convention, not a finding.

## What I would do instead

### What belongs where

The lecture says history notes should be "converted to test cases or deleted," which names the destination but not the decision. This is step 1 of the three-step order in [Split, don't reposition](#split-dont-reposition), which is why it comes first here. The operational tests:

- **Dead weight:** "would removing this cause the agent to make a mistake?" No means cut it. This is lecture 03's Principle 3 with a sharper question attached.
- **Harmful precision:** "is this wrong on any plausible task in this repo?" A prohibition that is wrong one task in ten is still obeyed on that task, and the agent cannot tell it is the exception. `NEVER write comments` becomes `match the comment density of the file you are editing` - shorter, no exception list to maintain, and correct in a densely commented file without being told. This is a real answer to the lecture's "can't tell what matters" problem: some of the ambiguity is fixed by ranking rules, and some by phrasing rules so they cannot be wrong.
- **Owned elsewhere:** user preferences and evolving project status load every session, are not repo knowledge, and drift silently because nothing in the codebase contradicts them. Those belong in auto-memory or a local file, not in the shared entry file.
- **Already handled by the harness:** a rule that restates harness behavior is not free - the agent reconciles it against what the harness already does before it can act, and pays that cost on every task. "Always read a file before editing it" is a whole reconciliation for zero behavior change.
- **Enforceable mechanically:** a rule a linter, a permission rule, or a hook can enforce belongs there instead of in prose. The instruction should document the mechanism, not stand in for it. See [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce) below.

Absolutes still earn their place for safety, data loss, and format contracts, and for rules the agent has been observed to break. The lecture's 15-constraint budget is a reasonable default for that set.

### Split, don't reposition

"Put it at the top or bottom" is a patch that keeps the 600-line file; splitting is the repair, and after a correct split the entry file is 80 lines where everything is near an extreme anyway. The lecture gives both, but leads with position, which is the weaker of the two.

The order that works:

1. **Does the rule need to be always-loaded at all?** Cut it or move it out - [What belongs where](#what-belongs-where) is the test. This is upstream of the two steps below and the only one that always helps.
2. **Split, and verify the split unloads.** A move that does not stop the file loading is a move in name only - see [Make the split actually unload](#make-the-split-actually-unload).
3. **Only for what stays, use position.** Top over middle, hard constraints first.

What may move at all depends on what happens when the rule is absent. A **judgment** rule ("prefer composition over inheritance") is fine in a conditional file - if the task never comes up, its absence costs nothing. A **universal constraint** ("never publish without approval") is not: absence there means it does not apply, and the condition that would have loaded it may never trip. Keep those at the top of the always-loaded file, and read [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce) before trusting either placement.

Position has a failure mode of its own, and the lecture walks into it: once the top of the entry file is fifteen hard constraints, position stops discriminating anything, because every line is at the top.

### Make the split actually unload

The lecture's central mechanism is that topic docs are "loaded only when needed." It never says what makes that true, and in Claude Code the obvious implementation does not work.

`@import` in `CLAUDE.md` moves text, not cost: an imported file is expanded into context at launch. Splitting a 400-line file into five imports still loads 400 lines every session. A topic doc wired in with `@docs/api-patterns.md` saves nothing.

On-demand loading needs a mechanism that loads by location or trigger:

- a nested `CLAUDE.md` / `AGENTS.md` in the directory the rules concern, loaded when the agent works in that subtree (documented, and reported not to fire in some clients - verify with `/context` or the `InstructionsLoaded` hook rather than assuming)
- a path-scoped `.claude/rules/*.md`, carrying a `paths` glob in its frontmatter, which is what makes it conditional at all
- a skill, loaded when its description matches the task

Three more loading facts the lecture's advice depends on and never states: import chains stop after four hops with no error; an `@import` inside backticks or a fenced block is literal text and never loads; and content in a nested file is invisible to a session that never opens that subtree.

`.claude/rules/` is the same trap one layer over. A rule file with no `paths` frontmatter loads at launch with the same priority as `.claude/CLAUDE.md`, so moving a paragraph out of the entry file into `.claude/rules/foo.md` and stopping there saves nothing. Only rules carrying a `paths` glob are conditional, and they load when the agent reads a matching file, not on any other trigger. Imports resolving outside the working directory are gated behind an approval dialog, and rules reached through a symlink to such a path need that approval too - after which only the ones without `paths` load, so adding a glob to a shared symlinked rule is what stops it loading.

The harness already ships the pattern the lecture is reaching for. Auto memory keeps an index in context every session (`MEMORY.md`, first 200 lines or 25 KB, whichever comes first) alongside one topic file per memory, read with ordinary file tools only when needed. That is "overview first, details on request" with the loading rule stated, and it is the same shape the lecture wants for `AGENTS.md` plus topic docs.

This is the difference between the lecture's architecture being advisory and being real. The file layout can be perfect and the tokens still get spent at startup - or a rule can be invisible because nothing ever tripped its condition.

### The audit needs a mechanism, not discipline

"Audit regularly and delete outdated entries" is advice with no enforcement, and the lecture itself has just explained why the discipline fails: deletion feels risky, addition feels free. The fix is the [lecture 02](../lecture02/) pattern - move what can be checked out of prose and into an exit code. For an instruction file that means a CI check on the size of the entry file, a check that every linked path resolves, and a rule that a constraint without an owner fails the build.

Two habits from the ecosystem's own tooling are worth stealing. The `claude-md-improver` skill (see [References](#references)) audits first, outputs a quality report with per-criterion scores, gets approval, then applies targeted additions and re-scores; the report-before-edit order is what keeps an audit from becoming a rewrite. And a full rewrite destroys wording that survived contact with a real failure. Targeted diffs are also what make the "does removing this change behavior?" question answerable per line.

There is a validation step the lecture's audit omits entirely: run the commands the file names. A checklist pass does not prove `make test` still exists. Broken commands hide behind passing scores.

**A gate can be tested; a rule can only be audited.** That asymmetry is why this section is short on mechanism. A permission rule fires or it does not, and the mutation test proves which. A prose rule has no output to observe. Its value is P(the situation arises) x (behavior change | it arises), and the second term is not cheaply measurable - you would have to know what the agent would have done without it.

The first term is measurable, and it is where the audit belongs. A rule whose condition never arose is indistinguishable from a rule that works, and that ambiguity is resolved by deletion, not by more analysis.

Five instruments, cheapest first:

1. **Convert what converts.** Any rule naming a specific action can often become a hook, permission rule, or CI check. It leaves the prose audit entirely and becomes testable by the methods in [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce). Run this pass first, because it shrinks the problem.
2. **Run what the file names.** Commands, linked paths, script names. Mechanical, no judgment needed.
3. **Take a trigger census.** For each remaining rule, did its condition ever occur? Grep the transcripts under `~/.claude/projects/` for the paths, commands, and task types the rule concerns. Better: a `PreToolUse` or `UserPromptSubmit` hook that logs when the condition arises and blocks nothing. False positives cost a log line, so it can be broad, and it gives a census you can trust instead of one you inferred.
4. **Take a violation census.** For "never X" rules, did X happen? A violation means the rule is failing and belongs in a gate. No violation *and* no near miss - the agent never met the temptation and pulled back - means inert.
5. **Judge relevance, not compliance, with a model.** "Was rule R relevant to any decision in this session?" is an easy question with a reliable answer. "Did the agent comply?" is not. Reading transcripts for relevance extends the census to rules grep cannot see.

A rule with zero triggers in a large corpus is not proven useless. It is unfalsifiable, and unfalsifiable rules never get deleted, which is how a file reaches 600 lines. When a rule matters and the census cannot settle it, run the deletion as an experiment: remove the rule, run the task set, compare. That is exercise 2's control applied to a rule rather than to a file split. The census exists to tell you which two or three rules are worth that cost.

Two structural moves matter more than any measurement. A rule whose source is not an observed failure is speculative - it does not need testing, it needs a source note saying which failure produced it, and absent one, it goes. And every rule that survives the audit gets an expiry date, so an unaudited rule expires to deletion instead of persisting by default. That inverts the incentive the lecture diagnoses: addition currently feels free, so make persistence carry the cost.

The output is not a grade per rule. It is a smaller file plus a trigger census, and the acknowledgement that what remains is managed by judgment with a date on it. Inert prose fails the same way a stale gate does: it costs tokens and attention every session, and nothing in the transcript says it is not working.

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

The harness's own documentation states the same boundary in one sentence: CLAUDE.md content "is delivered as a user message after the system prompt," settings "are enforced by the client regardless of what Claude decides to do," and memory files "shape Claude's behavior but are not a hard enforcement layer." That is the lecture's hard-constraints section, described from the other side.

**Mechanical gates fail in two directions, and only one of them is visible.**

The first is a gate that discriminates wrong: too broad and it prompts on innocent work, too narrow and it misses the case it was built for. A gate that fires on harmless local commands trains the operator to approve without reading - the same "can't tell what matters" failure the lecture diagnoses in prose, arriving through the fix instead of the problem.

The second is worse. **A text-matching gate that never matches produces no output and no warning.** No prompt, no deny, no log line. Every evasion in the publish-gate write-up fails this way: a rule ending in a bare flag with no trailing `*` requires a token to follow and silently matches nothing; `git * push --no-verify*` requires the literal text `" push"`, which `git push` does not contain; `Bash(git push *)` does not match `git -C . push`, `git -c k=v push`, or a path-qualified binary. In each case the entry stays in the settings file looking like protection while being inert. This is the lecture's knowledge-decay warning applied to mechanisms: a stale gate is worse than no gate, because the agent and the human both read the config as covered.

The failure lands harder for gates than for prose. A stale prose rule gets diluted by everything around it and competes for attention; a stale gate has exactly one job and does not do it, with nothing in the transcript to say so. A well-written permission rule and a rule discarded at load look identical from the outside - and MCP rules with arguments are discarded at load outright, which is a worse mode than a plain non-match because the file never stops advertising them.

**Writing the gate is the cheap half. Proving it fires is the expensive half.**

That is the structural difference from the lecture's audit advice. "Audit regularly and delete outdated entries" assumes the hard part is deciding what stays. For a mechanism, the hard part is verification, and the verification needs a way to observe the result. How you build that depends on what the gate actually does.

A hook that makes a decision can be fed synthetic payloads with nothing executed and no prompts to answer: a case table exercises the classifier's logic directly, which is the cheapest instrument available and the one to reach for first.

A permission rule cannot be tested that way, because the harness matches the rule, not code you can call. The instrument is the mutation. Temporarily point the rule's condition at the mode the session actually reports, run one publish-shaped command against a remote that cannot resolve, and confirm the block comes back in the tool result, then restore. Mutating to the mode you assumed you were in matches nothing and proves nothing while looking like a failure.

Either way, prefer testing the deny path. A denial returns as a tool result, so the loop closes without a human. An `ask` needs a person to say they saw the prompt - the agent cannot see permission dialogs, so an approved command and an un-gated one look identical from the agent's side.

And test per tool. Gates attach to tool names, so a gate verified through the native shell says nothing about the same command reaching the machine through an MCP shell server. That gap is how the second incident in the write-up happened: a matcher of `"Bash"` and a session that had stopped using the Bash tool entirely.

**Some constraints cannot be gated locally at all.** Script indirection is the standing example: `bash deploy.sh` is a clean line to every command-text gate no matter what the script contains. What is left is a server-side gate, and in that project it is a GitHub environment with a required reviewer on the release job, which holds regardless of what any local agent does. The same shape applies here, with a smaller blast radius: GitHub Pages builds from `main` and there is no staging environment to require review on, so this repo has no server-side gate on publication - only the conventions in `CLAUDE.md`. A mistaken publish here is a commit on a static site, which a follow-up commit reverses. The ccbunshin incident published a release that `install.sh` resolves by latest, so the same mistake was not reversible by the next commit.

This repo has no `.github/` directory and no publishing gate of any kind, and leaving it that way is correct: the failure the gates exist to prevent is not reproducible here. Nothing is installed from a release, so nothing breaks when one is published by mistake. A repo whose artifacts are immutable or consumed by an installer needs the server-side layer; a repo whose worst publish is a bad commit does not, and adding one there buys ceremony rather than safety.

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

- [How Claude remembers your project (Claude Code docs)](https://code.claude.com/docs/en/memory) - the primary source for the loading claims above: imports expand at launch with a four-hop limit, nested files load on subtree access, rules need `paths` frontmatter to be conditional, external imports need approval, root `CLAUDE.md` survives `/compact`, and `/context` is the only check that reports what actually loaded
- [agents-md skill (mblode/agent-skills)](https://github.com/mblode/agent-skills/blob/main/skills/agents-md/SKILL.md) - the dead-weight and harmful-precision tests; the `CLAUDE.md` → `@AGENTS.md` pointer pattern; the per-tool loading gotchas (imports expand at launch, four-hop limit, Codex's 32 KiB concatenation cap); a 12-check quick audit and a 49-check full audit
- [claude-md-improver skill (anthropics/claude-plugins-official)](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-md-management/skills/claude-md-improver/SKILL.md) - discovery across root / package / local / global files, weighted quality scoring (A-F), a report-before-edit workflow, and targeted diffs for stale commands, missing setup, and undocumented gotchas
- [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md) - don't auto-generate or `/init` it
- [claude-md-management plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) - `/revise-claude-md` and the improver skill
- [A CLAUDE.md That Follows](https://anthropic.skilljar.com/claude-code-in-action/486929), [Claude Code 101](https://anthropic.skilljar.com/claude-code-101) - course material, linked from [lecture02](../lecture02/)
