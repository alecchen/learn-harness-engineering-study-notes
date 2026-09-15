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

The trap the lecture opens with: an `AGENTS.md` that starts at 50 lines and ends at 600, with an agent that gets worse as the file gets longer. A bug fix burns its context on deployment instructions. A security constraint at line 300 gets ignored. Three contradictory style rules and the agent picks one at random each run. Every line looked useful when it went in, and only about a third of them matter to any single task.

Each of those failures teaches you to add a rule, which is how the file got there in the first place. Five failure modes fall out of the growth:

- **Context budget** - the file competes with source reading, tool output, and history for a finite window.
- **Lost in the middle** (Liu et al., 2023) - models use middle-of-text information far less effectively than the start or end.
- **Priority conflicts** - a hard constraint and a style preference look identical on the page.
- **Maintenance decay** - deleting feels risky, adding feels free.
- **Contradiction accumulation** - rules written months apart conflict, and the agent arbitrates at random.

The prescription is an instruction architecture. The entry file stays at 50-200 lines: what the project is in a sentence or two, the first-run commands, at most 15 hard constraints, and links to topic docs with a "required reading when..." condition on each. Topic docs run 50-150 lines under `docs/` or beside the module, read only when the task calls for them. What stays in the entry file goes at the top or bottom, never the middle. Every rule carries a source, an applicability condition, and an expiry condition, and gets audited like a dependency.

Worked example: a SaaS team's `AGENTS.md` reached 600 lines, mixing stack versions, style rules, bug history, API guides, deploy procedures, and personal preferences. Refactored to an 80-line entry file plus three topic docs (120 / 60 / 80), task success went 45% -> 72% and security-constraint compliance 60% -> 95%.

## Key concepts

- **Instruction Bloat** - an instruction file at 10-15% of the context window starts crowding out code reading and reasoning.
- **Lost in the Middle** - position within a long input changes how reliably its content is used.
- **Instruction Signal-to-Noise Ratio (SNR)** - the share of the file relevant to the current task. Fifty lines of deploy rules during a bug fix is low SNR.
- **Entry File** - a router, not an encyclopedia: overview, run commands, hard constraints, links.
- **Reveal on Demand** - overview first, details on request. Borrowed from progressive disclosure in UI design.
- **Can't Tell What Matters** - uniform formatting hides the difference between a red line and a suggestion.
- **Packing cubes** - the lecture's metaphor for topic docs: one cube per subject, so finding a charger doesn't mean emptying the bag.

## Where I land

This is the most useful lecture in the four I've written up, and the one whose evidence I'd trust least. The design advice holds. What supports it doesn't: two inconsistent token counts, a retrieval paper cited for a claim about rule-following, and a case study whose headline gain can't be separated from a second change made at the same time. I'd keep the architecture and rebuild the argument for it.

Until now the sequence has asserted that architecture without describing it. [Lecture 01](../lecture01/) called `AGENTS.md` "a map, not an encyclopedia." [Lecture 02](../lecture02/) gave it a number, roughly 100 lines, and said to split into a `docs/` directory when it doesn't fit. Neither said where the cut lines go, or what happens if you don't make them. Lecture 04 supplies the cut lines, the file sizes, and the five failure modes, and that's the part worth keeping.

It's also [lecture 03](../lecture03/)'s Principle 3 - minimal but complete, "if removing a rule doesn't affect decision quality, it shouldn't exist" - applied one level down. Lecture 03 asks whether a knowledge item earns its place in the repo. Lecture 04 asks whether it earns its place in the always-loaded file, and gives the rules that fail somewhere to go.

The two lectures arrive at the same file size from opposite directions, which is a better argument for it than either gives alone. Lecture 03 wants the entry file small enough to be found. Lecture 04 wants it small enough that its contents survive the middle-of-context effect. Same number, two independent mechanisms.

Per-rule lifecycle is the strongest idea here. Source, applicability, expiry, and a regular audit turns "add a rule" from a reflex into a decision with a cost attached. "Manage your instructions the way you manage code dependencies" is the same move as [Infrastructure as Code](https://martinfowler.com/bliki/InfrastructureAsCode.html) from lecture 03: make the implicit artifact explicit, versioned, and reviewable.

Where I'd part company is the order of the two fixes. The lecture leads with position, and position is the weaker of them. Splitting only buys something if the moved file stops loading, which is a thing the lecture never says. Both are in [What I would do instead](#what-i-would-do-instead).

## What the lecture gets wrong

### The token math uses two different context windows

The vicious-cycle section sets up "say your agent has a 200K token window (Claude's standard)" and a bloated instruction file at 10-20K tokens. Core Concepts then defines Instruction Bloat as "10-15% of the context window," and in the next sentence calls 10,000-20,000 tokens "8-15% of a 128K window." Three percentages for one quantity, on two different windows.

Only the 128K basis is self-consistent: 20,000 / 128,000 is 15.6%. So either the window in that first bullet is wrong or the percentage in Core Concepts should read 5-10%. Minor on its own, but it's the one quantitative claim in a section whose argument is that numbers matter.

The 20,000-token figure is also high. Twenty thousand tokens over 600 lines is about 33 tokens per line, roughly double what markdown prose costs, so the upper bound only holds for a file that's mostly code blocks. A typical 600-line instruction file lands nearer 8,000-10,000 tokens. Still worth splitting. The scare number is inflated.

### The citation is for the wrong genre of evidence

Liu et al. measured retrieval. The lecture cites them for compliance.

Their two tasks are multi-document QA over NaturalQuestions-Open (2,655 paragraph-answer queries, with one answer-bearing Wikipedia passage among k-1 Contriever distractors, at 10, 20, and 30 documents) and a synthetic key-value retrieval task (75, 140, and 300 UUID pairs, 500 examples each), plus an open-domain retriever-reader case study. In every experiment, the position being varied is the position of the answer-bearing span, and the model's job is to find it and return it.

The lecture's claim is about a rule at line 300 of an `AGENTS.md`, which differs on both axes that matter. Compliance asks the model to change what it does, not report what it found. And the rule competes with every other line in the file, rather than sitting as the single relevant span among numbered distractors. The paper never places an instruction at varying positions, never measures rule-following, and never mentions system prompts or instruction files at all. Its closest sentence is about training-data layout, that the task specification is "commonly placed at the beginning of the input context in supervised instruction fine-tuning data," which is a hypothesis for primacy bias rather than a measurement of it.

The paper also declines the generalization the lecture makes from it. Section 7 is a Conclusion with no Limitations section. Whether long context helps "is ultimately downstream task-specific." And the robustness criterion it states is one it's asking future work to test: "it is necessary to show that its performance is minimally affected by the position of the relevant information." The lecture reads that request as a result, which is where "the agent will almost certainly ignore it" comes from.

What the paper does establish is a real U-shaped trend on its own tasks, and it isn't something scale removes. Llama-2 7B is "solely recency biased," while 13B and 70B show the U-curve, and 70B with and without fine-tuning shows "largely similar trends." Instruction fine-tuning only "slightly reduces the worst-case performance disparity" (from nearly 10% to around 4% on MPT-30B), and on 70B it "minimally changes the positional bias severity." Extended-context models are "not necessarily better at using their input context," and where the input fits both windows the two are "nearly superimposed." Query-aware contextualization drives key-value retrieval to near-perfect while "minimally affect[ing] performance trends in the multi-document question answering task," which is task dependence, not a structural fix. GPT-3.5-Turbo's multi-document QA can drop "more than 20%" on a position change and, at 20 and 30 documents, fall below its closed-book 56.1%.

The honest version is narrower than the lecture's, and still useful: information at the extremes of a context is used more reliably than information in the middle, on retrieval-style tasks where exactly one span is relevant. The magnitude varies with model, task, and context length, and it isn't the kind of effect a larger model, a longer window, or instruction tuning reliably removes. That's an argument for keeping the always-loaded file short, and it doesn't expire.

What doesn't hold is the citation. Something in the neighborhood is well supported - instruction adherence is generally observed to decay with context length - but Liu et al. is a retrieval result, and the lecture is asking a compliance question. Settling it needs a study that places an instruction at varying positions and scores compliance. The lecture has none, which leaves exercise 3 (one critical constraint at top, middle, and bottom, 5+ runs per position) as the only instrument in the lecture that could answer the question, and the lecture leaves it as homework. The mismatch isn't a matter of degree: at no strength does this paper license a conclusion about how an agent follows a rule.

### The headline number cannot be attributed to the split

The refactor changed four things at once. The entry file went 600 -> 80 lines. Three topic docs appeared. Links were added. And the historical notes were either converted into test cases or deleted outright.

That last one is a [lecture 02](../lecture02/) feedback-subsystem change, which is the subsystem lecture 02 calls the highest-ROI investment. Deleting the notes was a second subtraction alongside the trim. Converting them into checks is a mechanism the story never tests. Either branch carries a share of the 45% -> 72% that the story can't separate from the split.

The compliance jump from 60% to 95% reads as stronger evidence than it is. Two things moved at once: the rule went from line 300 to the top, and the file around it went from 600 lines to 80. In an 80-line entry file the middle sits 40 lines from the top, so position and length moved together, and the anecdote never says which one produced the gain. It's the lecture's one real before/after pair, and it's evidence for the position claim - the one the lecture derived from the wrong source - rather than for the split it's used to support.

The numbers themselves are unaudited. PR #75 proposes renaming the section to "Illustrative Example" and adding a line saying the figures are teaching illustrations rather than measurements from a real project. As of this writing the PR is still open and the published page still carries the original numbers, so anyone who follows the story back to its source finds nothing behind either figure.

### A scoped exception treated as a contradiction

The lecture's contradiction example is "one says use TypeScript strict mode, another says some legacy files are allowed to use any." That isn't a contradiction. The second rule is an exception scoped to a directory, and both rules can hold at once. A real contradiction is two rules that can't both be satisfied, like "always use SQLAlchemy 2.0 syntax" and "always use raw SQL for reporting queries."

The distinction matters because "contradiction" is the label that justifies deletion. An audit that treats a legitimate scoped exception as a conflict will delete the exceptions that were doing real work. The repair for an exception is to make its scope explicit and move it next to the code it concerns. Deleting it isn't a repair.

### "Source, applicability, expiry" on every rule rebuilds the bloat

Applied literally to all 15 hard constraints, three metadata fields per rule roughly triples that section - the same growth the lecture is arguing against. Metadata belongs with the topic doc for anything that lives in one, and it earns its place only on rules whose provenance is genuinely non-obvious. `Do not use eval()` doesn't need a source note.

The same problem shows up at a larger scale and undercuts the lecture's own ordering advice. Fifteen hard constraints plus "put important items at the top" means the top of the entry file is nothing but hard constraints, and once every line there is a red line, position stops discriminating anything. That's the "can't tell what matters" failure mode, reintroduced by the fix. [Split, don't reposition](#split-dont-reposition) is the way out.

### AGENTS.md is not one file for every tool

The lecture calls the entry file `AGENTS.md` throughout. Claude Code reads `CLAUDE.md`. A repo with only `AGENTS.md` gives Claude Code no instructions at all, and nothing warns; `/context` shows an empty memory-file list. The tool-agnostic fix is `AGENTS.md` as the source of truth plus a `CLAUDE.md` whose first line is `@AGENTS.md`, or a symlink when there are no Claude-only additions. A copy of either drifts.

Loading semantics also differ per tool in ways that change where a rule belongs. Codex concatenates instruction files from the repo root down to the launch directory and stops once the total hits `project_doc_max_bytes` (32 KiB by default), root first. A bloated root file silently crowds out every nested file beneath it, which is the lecture's own failure mode arriving through a different mechanism. A rule that lives only in `packages/api/AGENTS.md` never reaches a Codex session started at the root, and never reaches a Claude Code task that doesn't open that subtree. Universal rules belong in root.

### The recommended sizes have no measured basis

The lecture's sizes - 50-200 for the entry file, 50-150 for topic docs - sit under no measured ceiling. [Lecture 01](../lecture01/) and [lecture 02](../lecture02/) both say roughly 100. [Lecture 03](../lecture03/) says 50-100. This one says 50-200. They agree on the order of magnitude, which is the useful part. The exact bound is a convention, not a finding.

## What I would do instead

### What belongs where

The lecture says historical notes should be "converted to test cases or deleted," which names the destination but not the decision. These are the tests I'd run, in the order that drops the most rules fastest:

- **Dead weight.** "Would removing this cause the agent to make a mistake?" If no, cut it. This is lecture 03's Principle 3 with a sharper question attached.
- **Harmful precision.** "Is this wrong on any plausible task in this repo?" A prohibition that's wrong one task in ten is still obeyed on that tenth task, and the agent can't tell that it's the exception. `NEVER write comments` becomes `match the comment density of the file you are editing` - shorter, no exception list to maintain, and correct in a densely commented file without being told. Some of the lecture's "can't tell what matters" problem is fixed by ranking rules. Some of it is fixed by phrasing rules so they can't be wrong.
- **Owned elsewhere.** User preferences and evolving project status load every session, aren't repo knowledge, and drift silently because nothing in the codebase contradicts them. Auto-memory or a local file, not the shared entry file.
- **Already handled by the harness.** A rule that restates harness behavior isn't free. The agent reconciles it against what the harness already does before it can act, and pays that cost on every task. "Always read a file before editing it" is a whole reconciliation for zero behavior change.
- **Enforceable mechanically.** A linter, a permission rule, or a hook should hold it instead of prose. The instruction documents the mechanism rather than standing in for it, which is most of the argument in [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce).

Absolutes still earn their place for safety, data loss, format contracts, and rules the agent has been observed to break. The lecture's 15-constraint budget is a reasonable default for that set.

### Split, don't reposition

"Put it at the top or bottom" keeps the 600-line file and patches around it. Splitting is the repair, and after a correct split the entry file is 80 lines where everything sits near an extreme anyway. The lecture gives both, but leads with position, which is the weaker of the two.

The order that works:

1. **Does the rule need to be always-loaded?** If not, cut it or move it out. [What belongs where](#what-belongs-where) is the test. This sits upstream of the other two steps and is the only one that always helps.
2. **Split it, and verify the split unloads.** A move that doesn't stop the file loading is a move in name only.
3. **For whatever stays, use position.** Top over middle, hard constraints first.

What may move at all depends on what happens when the rule is absent. A **judgment** rule ("prefer composition over inheritance") is fine in a conditional file, because if the task never comes up its absence costs nothing. A **universal constraint** ("never publish without approval") is not, because absence means it doesn't apply, and the condition that would have loaded it may never trip. Those stay at the top of the always-loaded file.

Position has a failure mode of its own, and the lecture walks into it: once the top of the entry file is fifteen hard constraints, position stops discriminating anything, because every line is at the top.

### Make the split actually unload

The lecture's central mechanism is that topic docs are "loaded only when needed." It never says what makes that true, and in Claude Code the obvious implementation doesn't work.

`@import` in `CLAUDE.md` moves text, not cost. An imported file is expanded into context at launch, so splitting a 400-line file into five imports still loads 400 lines every session. A topic doc wired in with `@docs/api-patterns.md` saves nothing.

On-demand loading needs a mechanism that loads by location or trigger:

- a nested `CLAUDE.md` / `AGENTS.md` in the directory the rules concern, loaded when the agent works in that subtree (documented, and reported not to fire in some clients - check `/context` or the `InstructionsLoaded` hook rather than assuming)
- a path-scoped `.claude/rules/*.md`, carrying a `paths` glob in its frontmatter, which is what makes it conditional at all
- a skill, loaded when its description matches the task

Three loading facts the lecture's advice depends on and never states: import chains stop after four hops with no error; an `@import` inside backticks or a fenced block is literal text and never loads; and content in a nested file is invisible to a session that never opens that subtree.

`.claude/rules/` is the same trap one layer over. A rule file with no `paths` frontmatter loads at launch with the same priority as `.claude/CLAUDE.md`, so moving a paragraph out of the entry file into `.claude/rules/foo.md` and stopping there saves nothing. Only rules carrying a `paths` glob are conditional, and they load when the agent reads a matching file, not on any other trigger. Imports that resolve outside the working directory sit behind an approval dialog, and rules reached through a symlink to such a path need that approval too - after which only the ones without `paths` load, so adding a glob to a shared symlinked rule is what stops it loading.

`.claude/rules/frontmatter.md` is what the working version looks like:

````markdown
---
paths:
  - "lecture*/*.md"
  - "lecture*/**/*.md"
  - "project*/*.md"
  - "project*/**/*.md"
---

# Front matter

If you create a note, it starts with:

```yaml
---
layout: default
permalink: /lectureNN/
---
```

A markdown file with no front matter is served raw as `.md` and gets no
layout, no top nav, and no theme toggle. There is no config-level
auto-conversion; the front matter is what opts a file in.
````

`/context` is how you tell whether it loaded. The file is absent at session start and appears once the agent reads something matching the glob. Four ways the glob fails silently: `paths` written as a string rather than a YAML list; the trigger being a file read rather than every tool use; brace expansion counting against a shared budget of 1,000 patterns; and a missing closing `---`, which demotes the file to the unconditional case above.

The harness already ships the pattern the lecture is reaching for. Auto memory keeps an index in context every session (`MEMORY.md`, first 200 lines or 25 KB, whichever comes first) alongside one topic file per memory, read with ordinary file tools only when needed. That's "overview first, details on request" with the loading rule stated, and it's the same shape the lecture wants for `AGENTS.md` plus topic docs.

The distance between those two versions is whether the file layout changes what loads. A perfect layout still spends the tokens at startup if it doesn't, and a rule whose condition nothing ever trips is invisible from the outside.

### The audit needs a mechanism, not discipline

"Audit regularly and delete outdated entries" has no enforcement, and the lecture has just explained why the discipline fails: deletion feels risky, addition feels free. The fix is the [lecture 02](../lecture02/) pattern, moving whatever can be checked out of prose and into an exit code. For an instruction file that means a CI check on the entry file's size, a check that every linked path resolves, and a rule that a constraint without an owner fails the build.

Two habits from the ecosystem's own tooling are worth stealing. The `claude-md-improver` skill (see [References](#references)) audits first, prints a quality report with per-criterion scores, gets approval, then applies targeted additions and re-scores. That report-before-edit order is what keeps an audit from turning into a rewrite. And a full rewrite destroys wording that survived contact with a real failure. Targeted diffs are what make "does removing this change behavior?" answerable line by line.

There's also a validation step the lecture's audit omits entirely: run the commands the file names. A checklist pass doesn't prove `make test` still exists. Broken commands hide behind passing scores.

A permission rule either fires or it doesn't, and a mutation test proves which. A prose rule has no output to observe, so it can only be audited, and that asymmetry is why this section is shorter on mechanism than the one after it. A rule's value is P(the situation arises) x (behavior change | it arises). The second term isn't cheaply measurable, since you'd have to know what the agent would have done without the rule.

The first term is measurable, and it's where the audit belongs. A rule whose condition never arose is indistinguishable from one that works, and that ambiguity gets resolved by deletion, not by more analysis. The instruments, cheapest first:

1. **Convert what converts.** A rule naming a specific action can often become a hook, a permission rule, or a CI check. That takes it out of the prose audit entirely and makes it testable by the methods in [Instructions are not gates](#instructions-are-not-gates-what-a-rule-cannot-enforce). Run this pass first, because it shrinks the problem.
2. **Run what the file names.** Commands, linked paths, script names. Mechanical, no judgment needed.
3. **Take a trigger census.** For each remaining rule, did its condition ever occur? Grep the transcripts under `~/.claude/projects/` for the paths, commands, and task types the rule concerns. Better: a `PreToolUse` or `UserPromptSubmit` hook that logs when the condition arises and blocks nothing. False positives cost a log line, so it can afford to be broad, and it returns a census you can trust instead of one you inferred.
4. **Take a violation census.** For "never X" rules, did X happen? A violation means the rule is failing and belongs in a gate. No violation *and* no near miss - the agent never met the temptation and pulled back - means inert.
5. **Judge relevance, not compliance, with a model.** "Was rule R relevant to any decision in this session?" is an easy question with a reliable answer. "Did the agent comply?" is not. Reading transcripts for relevance extends the census to the rules grep can't see.

A rule with zero triggers in a large corpus isn't proven useless. It's unfalsifiable, and unfalsifiable rules never get deleted, which is how a file reaches 600 lines. When a rule matters and the census can't settle it, run the deletion as an experiment: remove the rule, run the task set, compare. That's exercise 2's control applied to a rule instead of a file split, and the census tells you which two or three rules are worth the cost.

None of that measurement is the point on its own. A rule whose source isn't an observed failure is speculative; it doesn't need testing, it needs a source note naming the failure that produced it, and absent one, it goes. Every rule that survives the audit gets an expiry date, so an unaudited rule expires to deletion instead of persisting by default. That inverts the incentive the lecture diagnoses, making persistence carry the cost that addition currently doesn't.

What comes out isn't a grade per rule. It's a smaller file plus a trigger census, and an acknowledgement that what remains is managed by judgment with a date on it. Inert prose fails the same way a stale gate does: it costs tokens and attention every session, and nothing in the transcript says it isn't working.

### Instructions are not gates: what a rule cannot enforce

The lecture argues for splitting instructions, then leans on them for the one thing they can't do. Its worked example ends with security-constraint compliance at 95%, which is still a one-in-twenty failure on a rule the file calls a hard constraint. Prose moves the rate. It doesn't set it. When an outcome has to hold, the enforcement lives somewhere other than the file.

**A rule can live in one of three places.**

| kind | example | where it lives | what it does |
|---|---|---|---|
| judgment | "prefer composition over inheritance" | prose, in the entry file or a topic doc | steers choices a mechanism can't enumerate |
| documentation | "we deprecated the `v1` client in June" | prose, in a topic doc | supplies context for decisions |
| constraint | "never publish without approval" | permission rule, `PreToolUse` hook, CI job, server-side gate | runs whether the agent agrees or not |

The lecture's hard-constraints section mixes the first two kinds into the third's slot and calls the result non-negotiable. `Never deploy on Fridays` is prose in a file, it can't stop a Friday deploy, and it reads like something that can.

Prose still has one property a gate doesn't: it's always in context. A permission rule fires only on a matching tool call, and a hook fires only for the tools in its matcher, so an agent that never runs the gated command never encounters the gate. That's the division. Keep prose for the reasoning that generalizes to cases nobody anticipated, and move the subset that must hold to a mechanism. The gate replaces the enforcement and leaves the explanation in prose, where it still does work: hard constraints are worth writing down because they tell the agent which parts of its own judgment not to trust.

The harness's own documentation states the same boundary in one sentence: CLAUDE.md content "is delivered as a user message after the system prompt," settings "are enforced by the client regardless of what Claude decides to do," and memory files "shape Claude's behavior but are not a hard enforcement layer."

A gate can also discriminate wrong. Too broad and it prompts on innocent work; too narrow and it misses the case it was built for. A gate that fires on harmless local commands trains the operator to approve without reading, which is the same "can't tell what matters" failure the lecture diagnoses in prose, arriving through the fix instead of the problem.

The worse failure is silence. A text-matching gate that never matches produces no output and no warning: no prompt, no deny, no log line. Every evasion in my publish-gate write-up fails this way. A rule ending in a bare flag with no trailing `*` needs a token to follow it and matches nothing. `git * push --no-verify*` requires the literal text `" push"`, which `git push` doesn't contain. `Bash(git push *)` doesn't match `git -C . push`, `git -c k=v push`, or a path-qualified binary. Each one sits in the settings file looking like protection while being inert. A stale gate is worse than no gate, because the agent and the human both read the config as covered.

It lands harder for gates than it does for prose. A stale prose rule gets diluted by everything around it and competes for attention. A stale gate has exactly one job and doesn't do it, with nothing in the transcript to say so. A well-written permission rule and a rule discarded at load look identical from the outside, and MCP rules with arguments are discarded at load outright, which is worse than a plain non-match because the file never stops advertising them.

The hard part of a gate isn't writing it. It's proving it fires, and the verification needs a way to observe the result. That's the structural difference from the lecture's audit advice, which assumes the hard part is deciding what stays. A hook that makes a decision can be fed synthetic payloads with nothing executed and no prompts to answer. A case table exercises the classifier's logic directly, which is the cheapest instrument available and the one to reach for first. A permission rule can't be tested that way, because the harness matches the rule, not code you can call. The instrument there is the mutation: point the rule's condition temporarily at the mode the session actually reports, run one publish-shaped command against a remote that can't resolve, confirm the block comes back in the tool result, then restore. Mutating to the mode you assumed you were in matches nothing and proves nothing while looking like a failure.

Either way, prefer testing the deny path. A denial returns as a tool result, so the loop closes without a human. An `ask` needs a person to confirm they saw the prompt, and the agent can't see permission dialogs, so an approved command and an un-gated one look identical from its side. Test per tool as well: gates attach to tool names, so a gate verified through the native shell says nothing about the same command arriving through an MCP shell server.

The project this repo belongs to hit that boundary from the other side. My `CLAUDE.md` there already carried a publishing rule: `git push`, `git tag`, and `gh release` need explicit approval every time, an approved release is approval for that version only, and `--no-verify` is never allowed. On 2026-09-13 an agent pushed `v0.1.5`, `v0.1.6`, and `v0.1.7` and published three GitHub releases while I was away from the terminal. The rule was in context, correctly written, and unenforced. The write-up is [Guarding agent-driven git push, tag, and release](https://github.com/alecchen/ccbunshin/blob/main/docs/HARNESS_PUBLISH_GATING.md), and its structure is the general recipe: prose, then a permission rule, then a hook, then CI, then a server-side environment, each layer catching what the one above it missed. That gap is also how the second incident happened, where the matcher was `"Bash"` and the session had stopped using the Bash tool entirely.

Two other cases from the same period point in a different direction, and they generalize better than the publishing one.

I use rtk to compress command output, and the way to make an agent use it is a `PreToolUse` hook that rewrites `git status` to `rtk git status`. That hook is a preview feature, and company policy blocks preview features in VS Code, so I couldn't install it. The shell-level alternative: aliases for `git`, `grep`, `ls`, `cat`, `find` and friends, plus a bash function that `eval`s the rewritten command. The agent's ordinary `git log` gets intercepted by the alias no matter which tool sent it, because the interception happens in the shell rather than in the client. Before that I had a `CLAUDE.md` line asking the agent to route these commands through rtk, and it worked some fraction of the time.

What matters is the direction. The hook was blocked, so the alternative moved the interception *down* a layer, from the client the agent talks to into the shell that executes. That's the opposite move from the publishing gate, which goes down from prose to config to hook to CI to server, and it reaches a place no client-side gate can: the alias fires for a Codex session, for an MCP shell server, for a human at the prompt, and for a `bash deploy.sh` script. The hook could never have covered the last two.

Its weakness is the one this whole section keeps running into. A shell function under `eval` is opaque to text matching in a way a `Bash(git status *)` rule isn't, since nothing reads the alias table, and `eval` on a rewritten string is worth distrusting on its own. There's also no way to test from outside whether the alias is in scope: an agent that runs the command where the alias file wasn't sourced gets the uncompressed command silently. That's the inert-gate failure with the mechanism hidden a layer further down, and the only check is to run the command and read the output rather than read the alias file.

The other case is a wrong-shell problem with the same shape. The company default shell is `tcsh`, and models are trained on `bash`. `ls 2>&1` in tcsh isn't a redirect: `2` and `>&` are arguments, so `1` becomes a filename create-redirect in tcsh's own csh-derived syntax, and the effect is an empty file called `1` in the working directory plus an agent that can't tell why its assumptions about stderr are wrong. Failures like that are expensive in a specific way. The command exits clean, the file appears, and the agent doesn't connect the two.

I tried the instruction route first, written the way this note recommends elsewhere - named subject, absolute, failure stated: "The shell is tcsh," a mandatory script-first rule, never use bash syntax, always use tcsh equivalents. It didn't hold. That instruction has to be in context for every shell call to do its job, so it re-derives every time and competes with every other line. It's this lecture's entry-file argument applied to a rule that can't be trimmed.

The fix was configuration rather than instruction. `terminal.integrated.defaultProfile.linux` set to `tcsh`, so the human's interactive terminal is the company shell, and `terminal.integrated.automationProfile.linux` plus [`chat.tools.terminal.terminalProfile.linux`](https://code.visualstudio.com/docs/agents/run/tools) set to `bash`, so anything an agent runs goes to bash. The agent never hits the tcsh problem because it never sees tcsh. The instruction became unnecessary rather than obeyed, which is the outcome to aim for. A rule the mechanism deletes beats a rule the mechanism enforces, and both beat a rule that has to be remembered.

Some constraints can't be gated locally at all. Script indirection is the standing example: `bash deploy.sh` is a clean line to every command-text gate no matter what the script contains. What's left is a server-side gate, and in that project it's a GitHub environment with a required reviewer on the release job, which holds regardless of what any local agent does.

This repo doesn't need one. There's no `.github/` directory here and no publishing gate of any kind, and leaving it that way is correct, because the failure the gates exist to prevent isn't reproducible here. GitHub Pages builds from `main`, there's no staging environment to require review on, and nothing is installed from a release, so nothing breaks when one is published by mistake. A mistaken publish is a commit on a static site, which a follow-up commit reverses. The ccbunshin incident published a release that `install.sh` resolves by latest, so the same mistake there wasn't reversible by the next commit. A repo whose artifacts are immutable or consumed by an installer needs the server-side layer. A repo whose worst publish is a bad commit doesn't, and adding one buys ceremony rather than safety.

Two habits come out of all this and generalize past publishing. Let the enforcement live where something other than the agent's own report can verify it. And give every gate a source, an applicability condition, and an expiry condition - the lecture's own rule lifecycle, applied to mechanisms instead of prose. A gate nobody has tested is a gate you're assuming works, which is the same epistemic position as trusting a prose rule, with fewer excuses.

## Exercises

The lecture's three, with my take:

1. **SNR audit** - list every entry in the entry file, test each against 5 common task types, mark relevant or noise, compute the ratio. Cheap and operational, and the same measurement shape as lecture 03's knowledge-gap inventory: a before/after number for the context-provision layer.
2. **Reveal on demand refactor** - split a 300+ line file and compare success rates on at least 5 tasks. Run it, but control the confound the lecture's own story has: change one thing at a time (split only, then position only, then notes-to-tests) or you won't know which change bought the gain.
3. **Lost in the middle verification** - place one critical constraint at top, middle, and bottom, 5+ runs per position. This is the only exercise that can falsify the lecture's core mechanism, so it's worth running before restructuring on the strength of the effect. Hold the rule's wording fixed across positions; if the phrasing varies, you're measuring the phrasing.

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
- [VS Code: tools and terminal profiles for agents](https://code.visualstudio.com/docs/agents/run/tools) - the source for `chat.tools.terminal.terminalProfile`, which is what sends agent-run commands to a shell other than the one set for the human's integrated terminal

### Improving your own CLAUDE.md / AGENTS.md

- [How Claude remembers your project (Claude Code docs)](https://code.claude.com/docs/en/memory) - the primary source for the loading claims above: imports expand at launch with a four-hop limit, nested files load on subtree access, rules need `paths` frontmatter to be conditional, external imports need approval, root `CLAUDE.md` survives `/compact`, and `/context` is the only check that reports what actually loaded
- [agents-md skill (mblode/agent-skills)](https://github.com/mblode/agent-skills/blob/main/skills/agents-md/SKILL.md) - the dead-weight and harmful-precision tests; the `CLAUDE.md` -> `@AGENTS.md` pointer pattern; the per-tool loading gotchas (imports expand at launch, four-hop limit, Codex's 32 KiB concatenation cap); a 12-check quick audit and a 49-check full audit
- [claude-md-improver skill (anthropics/claude-plugins-official)](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-md-management/skills/claude-md-improver/SKILL.md) - discovery across root / package / local / global files, weighted quality scoring (A-F), a report-before-edit workflow, and targeted diffs for stale commands, missing setup, and undocumented gotchas
- [Writing a good CLAUDE.md (HumanLayer)](https://www.humanlayer.dev/blog/writing-a-good-claude-md) - don't auto-generate or `/init` it
- [claude-md-management plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management) - `/revise-claude-md` and the improver skill
- [A CLAUDE.md That Follows](https://anthropic.skilljar.com/claude-code-in-action/486929), [Claude Code 101](https://anthropic.skilljar.com/claude-code-101) - course material, linked from [lecture02](../lecture02/)
