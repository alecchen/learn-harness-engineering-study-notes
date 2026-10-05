---
layout: default
permalink: /lecture05/
---

# Lecture 05 - Keeping Context Alive Across Sessions

Notes from [lecture 5](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/) (slug: *why-long-running-tasks-lose-continuity*).

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [Where I land](#where-i-land)
- [What the lecture leaves out](#what-the-lecture-leaves-out)
  - [The clock-in ritual is an instruction, not a hook](#the-clock-in-ritual-is-an-instruction-not-a-hook)
  - [Compaction is steerable, and the lever has a name](#compaction-is-steerable-and-the-lever-has-a-name)
  - [Rewind is the other half, and it trades differently](#rewind-is-the-other-half-and-it-trades-differently)
  - [Git checkpoints and session checkpoints are different mechanisms](#git-checkpoints-and-session-checkpoints-are-different-mechanisms)
- [What the lecture gets wrong](#what-the-lecture-gets-wrong)
  - [Rebuild cost is stated as a finding and assigned as homework](#rebuild-cost-is-stated-as-a-finding-and-assigned-as-homework)
  - [The 60% threshold has nothing to measure it against](#the-60-threshold-has-nothing-to-measure-it-against)
  - [The anxiety explanation adds a mechanism the source does not have](#the-anxiety-explanation-adds-a-mechanism-the-source-does-not-have)
  - [The source's two failure modes are the interesting part, and they are dropped](#the-sources-two-failure-modes-are-the-interesting-part-and-they-are-dropped)
- [Two layers, not one](#two-layers-not-one)
  - [Task continuity: planning-with-files](#task-continuity-planning-with-files)
  - [Knowledge continuity: OpenViking](#knowledge-continuity-openviking)
  - [Handoff: the boundary case](#handoff-the-boundary-case)
- [What I would do instead](#what-i-would-do-instead)
- [Exercises](#exercises)
- [References](#references)

## Lecture summary

A session runs for thirty minutes, gets a feature mostly done, and hits the context wall. The next session has no idea which decisions were made, why option B beat option A, which files were already modified, or what state the tests are in. It spends fifteen minutes re-exploring, and it may take a different approach than the one the previous session settled on.

Context is finite and will stay finite, since window growth doesn't fix it. Agent context accumulates faster than the window expands, and it accumulates from codebase understanding, decision history, tool output, and conversation all at once.

What gets lost at a session boundary is the reason rather than the artifact. Intermediate reasoning holds the *why* and the final output holds the *what*, so a session that reads only the code can "optimize" away a deliberate decision without knowing it was deliberate.

The fix is to treat the agent as an engineer whose memory is wiped at every shift change: it writes state down before clocking out, and the next shift reads that state first. Four tools carry it: `PROGRESS.md` (current state, completed, in progress, known issues, next steps), `DECISIONS.md` (what decision, why, when), git commits as checkpoints, and a clock-in / clock-out ritual written into `AGENTS.md`. The decision rule offered is that a task needing more than 60% of the window should start preparing the handoff.

The context-anxiety section comes last. Anthropic observed agents wrapping up work prematurely as they approach what they believe is their context limit, skipping verification or picking the simpler solution. Compaction preserves the *what* but not the *why*. Reset gives a clean slate, and depends on the artifact being complete. The model-specific finding is the part worth keeping: Sonnet 4.5 exhibited this sharply enough that compaction alone was insufficient and resets became essential, while Opus 4.5 largely removed the behavior and let the author drop resets entirely. The conclusion drawn is that harness design needs a specific understanding of the target model rather than a template.

## Key concepts

- **Context windows are finite.** No window size removes the problem: long tasks will span sessions, and session boundaries will lose something.
- **State persistence files** - artifacts a fresh session reads to resume unambiguously. The basic form is a progress log, a verification record, and next actions.
- **Rebuild cost** - the time a fresh session needs to reach an executable state. The lecture's target: from 15 minutes down to 3.
- **Drift** - the gap between the agent's understanding and the actual state of the repository. Every session boundary introduces some, and it compounds.
- **Context anxiety** - agents rushing to finish as they approach the limit.
- **Compaction vs. reset** - compaction summarizes in place and keeps continuity but not a clean slate; reset clears and rebuilds from persisted state, and depends on how complete that state is.
- **Mixed strategy** - short work inside one session, long work across sessions with artifacts.

## Where I land

The problem statement is the strongest in the sequence so far, and the least contestable. Nothing here is argued from a paper that measures something else. A fresh session genuinely does not know what the previous one decided, and the four artifacts named are a reasonable answer to that.

The prescriptions are vaguer. [Lecture 02](../lecture02/) named state as one of five subsystems and gave it a file. [Lecture 03](../lecture03/) gave the repository ACID properties. This lecture is the first to spend a whole page on state across sessions, and it arrives at `PROGRESS.md` and `DECISIONS.md`, which is roughly where lecture 02 already was. What it adds is the reason state matters (the *why* is what dies, not the *what*), the failure modes, and the model-dependence.

The model-dependence is the genuinely new contribution here, and it's the one line I'd keep if I kept one. A harness tuned for Sonnet 4.5 shipped resets that Opus 4.5 made unnecessary, so the harness carries an expiry date set by the model underneath it. [Lecture 04](../lecture04/) makes the same lifecycle argument about instruction rules: a component can be correct when it is written and unnecessary a year later, and nothing in the file says which one it has become.

Where I'd push back is on what the lecture treats as given. Three of its four tools are things the agent has to remember to use, and lecture 04 spent a whole section establishing that a rule nothing enforces is a rule that gets skipped. The lecture hands you the clock-in checklist and no mechanism. Meanwhile the harness ships four things aimed at exactly this problem (`SessionStart` hooks, steerable compaction, `/rewind`, and session checkpoints independent of git) and the lecture names none of them. That is the gap in [What the lecture leaves out](#what-the-lecture-leaves-out).

## What the lecture leaves out

### The clock-in ritual is an instruction, not a hook

The lecture's Tool 4 is an `AGENTS.md` section:

```markdown
## At session start (clock in)
1. Read PROGRESS.md for current state
2. Read DECISIONS.md for important decisions
3. Run make check to confirm repo is in consistent state
4. Continue from PROGRESS.md "Next Steps" section
```

Every step depends on the agent electing to do it. Step 3 in particular competes with whatever the user actually asked for: a fresh session with a specific request has a reason to skip a full check-and-orient pass, and that reason looks locally correct at the time. This is [lecture 04's](../lecture04/) "instructions are not gates" pointed at session startup, and the fix is the same one. Move the parts that must happen into a lifecycle hook.

Claude Code fires `SessionStart` on `startup`, `resume`, `clear`, `compact`, and `fork`. A hook matching `compact` runs after compaction and its output is added to the compacted context. So the same content the lecture asks the agent to go read can instead be *injected* at the exact moment it is needed, with no dependence on the agent's judgment:

```jsonc
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "^(startup|resume|clear|compact)$",
        "hooks": [{ "type": "command", "command": "~/.claude/hooks/clock-in.sh" }]
      }
    ]
  }
}
```

The script cats `PROGRESS.md` and the last few lines of `DECISIONS.md` and exits, so step 2 stops depending on the agent remembering it. Step 3 is the part that should *not* be a hook, because running `make check` on every session start is expensive and mostly unnecessary. That one belongs in a `PostToolUse` or CI gate at the point where state can actually have changed.

The lecture's own framing already points at this. "Treat the agent like an engineer whose shift memory is wiped" describes something that fires at a lifecycle boundary, outside the agent's discretion, which is what a hook is and what a checklist entry is not.

### Compaction is steerable, and the lever has a name

The lecture's treatment of compaction is a binary: compaction or reset. In Claude Code it is a dial with three settings and a steering wheel.

`/compact` takes instructions, so `/compact focus on the auth bug fix` tells the summarizer what to keep. This is the direct answer to the lecture's central complaint that compaction loses the *why*. The lecture diagnoses the loss. It never mentions that the tool accepts a prompt about it. The instruction can also be standing: a `CLAUDE.md` section named `# Compact instructions` is read at every compaction, so the policy doesn't have to be retyped each time.

An edit to the root `CLAUDE.md` doesn't reach the running session at all, though. The docs say new content loads on the next `/clear`, `/compact`, or restart, which means compact instructions are something you write before you need them.

Where the automatic pass fires is configurable, through `/autocompact 500k`, the `autoCompactWindow` setting, `--autocompact`, or `CLAUDE_CODE_AUTO_COMPACT_WINDOW`. Defaults run from 200K (Sonnet 4.6 and Opus 4.6 without extended context) up to about 967K on native 1M models. That matters, because it turns the lecture's 60% rule into a setting. Pick the fill level at which a compaction happens, then run `/compact` yourself at natural breaks rather than letting the automatic pass fire mid-task.

`/compact` is not free either, and this is the part the lecture's framing misses entirely. Compacting means sending a request that reads the conversation it is summarizing. While the prompt cache is warm that costs a fraction of what the context size suggests, because it reads your prefix from cache. After a break longer than the cache lifetime it reprocesses the whole history as uncached input, which is why `/compact` is most expensive exactly when you resume an old session. `/clear` costs nothing. So the trade between compaction and reset covers more than which one preserves more. It also includes what each costs at the moment you reach for it, and that cost depends on cache state rather than on context size.

### Rewind is the other half, and it trades differently

The lecture describes a session that took a wrong turn and had to be abandoned. The harness has an undo for that, and it sits between compact and reset rather than alongside them.

`/rewind`, or double-tap `Esc` on an empty prompt, opens a menu of every prompt in the session with six actions: restore code and conversation, restore conversation only, restore code only, summarize from here, summarize up to here, or never mind. Summarize keeps you in the same session and compresses like a targeted `/compact`, and both summarize options accept instructions typed into an **add context (optional)** row.

For "I went down a path I want to abandon," rewind is both the more precise tool and the cheaper one: it truncates the conversation back to a prefix that was already cached, so the next request hits the earlier cache entry rather than building a new prefix the way compaction does. It also keeps the original: the doc's note is that summarizing doesn't change files on disk and the original messages stay in the transcript, so details are still referenceable. `/branch`, or `claude --continue --fork-session`, is the escape hatch when you want to try a different approach while keeping the current session intact.

The limitations are the reason this is a complement to git checkpoints rather than a replacement, and they are all worth knowing before relying on it:

- Files modified by Bash commands aren't tracked. `rm`, `mv`, `cp`, and anything a script does are invisible to rewind.
- Subagent edits generally aren't restored. A foreground forked skill's edits are; a background subagent's are not.
- Changes made outside the session aren't tracked, and symlinked or hard-linked paths are skipped with a `Restored the code, but skipped N files` warning.
- Snapshots cover the 100 most recent checkpoints, and Claude Code sweeps them about 30 days after the session last saved one.
- A message queued mid-turn joins that turn and gets no checkpoint, so the rewind menu doesn't list it.

The docs state the boundary plainly: checkpoints are for session-level recovery, "not a replacement for version control."

### Git checkpoints and session checkpoints are different mechanisms

The lecture lists "git commits as checkpoints" as Tool 3, and the harness also has something called checkpoints. They share a word and almost nothing else. The differences are what make both worth having:

| | git commit | `/rewind` checkpoint |
|---|---|---|
| scope | the repository | files Claude edited in this session |
| lifetime | permanent, in history | swept ~30 days after the session |
| shared | yes, through the remote | no, local to the session |
| captures | a reviewable, message-bearing state | a snapshot before each prompt that starts a turn |
| Bash-made changes | captured | **not captured** |
| subagent edits | captured | usually not captured |
| cost | a commit | free |
| what it's for | permanent history and collaboration | undoing the last few turns |

The lecture's instinct, to commit after each atomic unit, is right, and the two mechanisms complement each other. Git is the durable record and rewind is the cheap local undo. What the lecture can't say, because it names only one of them, is which one covers which failure. A wrong turn in the last ten minutes is a rewind. A wrong turn from yesterday is a revert.

## What the lecture gets wrong

### Rebuild cost is stated as a finding and assigned as homework

Core Concepts says a good harness can compress rebuild cost from 15 minutes to 3, and Key Takeaways repeats it as a target. Both are stated as properties of a good harness, with no measurement, no unit, and no source behind them. Rebuild cost in what: wall clock, tool calls, context tokens, turns? A 15-to-3 improvement means something different in each.

The lecture then assigns exercise 1, which is to measure exactly this number across at least three sessions with and without progress files. So it states as established the quantity it also assigns as the experiment that would establish it. [Lecture 04](../lecture04/) took the same shape with its exercise 3, where the only instrument that could test the lecture's core mechanism was left as homework.

The difference is that this one is runnable and worth running, and the metric is easy to under-specify in the wrong direction. If you measure wall clock, you are measuring your own typing. If you measure turns-to-first-correct-edit, you are measuring something closer to what the lecture means, and instrumentation for it already exists: [planning-with-files](#task-continuity-planning-with-files) reports 13.3 re-orientation turns against 5.0 in its own benchmark, which is the shape the lecture's 15-to-3 should have taken.

### The 60% threshold has nothing to measure it against

"if a task needs more than 60% of the window, start preparing the handoff" doesn't survive being read as a rule.

You can't know it in advance. The fraction of a window a task will consume is not visible before the task, and the estimate is available only after the fact from `/context` or the status line, which is too late to decide anything.

The window also isn't the right denominator. Context is already partly consumed at turn one, by the system prompt, `CLAUDE.md`, auto memory, MCP tool listings, and git status. Sixty percent of the *remaining* window and sixty percent of the *total* window are different numbers, and the lecture doesn't say which it means.

Auto-compaction already supersedes it. Compaction fires at a fill level you configure, so the actionable version of "prepare a handoff at 60%" is to set `/autocompact` somewhere below the default and run `/compact` with instructions at natural breaks. That is a lever rather than a prediction.

The lecture's own header disclaims its numbers as "adjustable teaching defaults, not experimentally established thresholds," which covers this. But the disclaimer is at the top of the page and the 60% is in the middle of the practical section, where it reads as a rule.

### The anxiety explanation adds a mechanism the source does not have

The lecture says compaction doesn't eliminate anxiety because "the agent knows context was once large, and psychologically still tends to rush to finish." The source says something narrower: compaction "preserves continuity" but doesn't give "a clean slate," so anxiety "can still persist."

Those are different claims. The source's reason is structural, in that the summarized conversation is still a long conversation, so whatever produced the anxiety is still there. The lecture's reason is introspective, with the model holding some representation of its own former context size and reacting to it. Nobody has demonstrated that second mechanism, and it's doing real work in the argument, because it's why the lecture treats reset as the more reliable option. The verifiable version of the same conclusion doesn't need it: resets work because they're complete, not because they're forgetful.

The model-specific finding does check out exactly. The lecture's Sonnet 4.5 and Opus 4.5 split matches the source, and the source's own sentence is stronger than the lecture's: Opus 4.5 "largely removed that behavior on its own, so I was able to drop context resets from this harness entirely." A whole harness component went away because the model underneath it changed, which is the sentence the lecture should be quoting.

### The source's two failure modes are the interesting part, and they are dropped

The lecture's Anthropic section says subsequent sessions "read progress and git history, worked incrementally on features, verified behavior, and left updates for the next session." That's the success path.

The source also reports what went wrong, and the failures are more use than the description of what went right. The agent tried to do too much at once, sometimes exhausting context mid-implementation. That's the case a progress file does not prevent, because the failure happens inside one session, and it's what lecture 07 is about.

The other failure is worse. Later agents looked around, saw that progress had been made, and declared the job done. A progress file makes that *more* likely rather than less, because `PROGRESS.md` is evidence that work happened, and an agent reading it at session start has just been handed a reason to believe the remaining work is smaller than it is. The lecture recommends the artifact without mentioning that it is also a source of false confidence.

The source addresses it with a constraint the lecture omits. The feature list is JSON specifically because models are "less likely to inappropriately change or overwrite JSON files compared to Markdown files," and coding agents may only flip the `passes` field, with explicit wording that removing or editing tests is unacceptable. So the answer to the artifact's own failure mode is to make the artifact un-editable and to gate its completion field on verification evidence, a far more specific design than "write a progress file." That's also the part that generalizes.

## Two layers, not one

The lecture puts `PROGRESS.md` and `DECISIONS.md` in one list as though they were the same kind of file. They have different lifetimes and belong in different systems.

Task continuity answers "where did I leave off, and how do I continue this task?" It is short-lived by design: when the task ends, `PROGRESS.md` should be deleted rather than archived, since a stale progress file is [lecture 03's](../lecture03/) knowledge decay with a shorter fuse.

Knowledge continuity answers "what does this project know that a future task will need?" It outlives any task. The lecture's own `DECISIONS.md` example ("Use Redis for user preferences caching, rejected alternative: PostgreSQL materialized view, constraint: 5-minute TTL") is an ADR, not a progress note. It has no expiry.

Conflating them is what makes the lecture's file list feel heavier than it is. Two files with different lifetimes and different deletion policies look like two of the same thing until you ask when each one dies.

### Task continuity: planning-with-files

[planning-with-files](https://github.com/OthmanAdi/planning-with-files) is the lecture's four tools, mechanized. It keeps three plain markdown files in the project (`task_plan.md` for phases and checkboxes, `findings.md` for research and decisions, `progress.md` for the session log and test results) and registers five lifecycle hooks around them:

| hook | what it does |
|---|---|
| `UserPromptSubmit` | re-injects the active plan at the start of every turn |
| `PreToolUse` | re-reads the plan before tool calls matching Write/Edit/Bash/Read/Glob/Grep |
| `PostToolUse` | after a Write or Edit, reminds the agent to update `progress.md` |
| `Stop` | an opt-in completion gate that can hold the agent's stop until the plan reports complete |
| `PreCompact` | flushes in-context progress to `progress.md` before compaction runs |

Some of this is worth stealing regardless of whether you install it.

The per-turn re-injection is a different mechanism from persistence. Writing state to disk survives a wipe; re-reading it every turn means the goals stay in the attention window as the conversation grows, which is the *lost in the middle* problem from [lecture 04](../lecture04/) applied to the plan rather than to the instruction file. The lecture gets you the first half and stops.

The completion gate is the answer to the source's second failure mode. "The agent looked around and declared the job done" is exactly what a `Stop` hook that checks plan state can block. Comparing the plan to reality is lecture 09's territory, and this is the smallest version of it.

The numbers are the part to be skeptical of. The repo advertises a 96.7% assertion pass rate, 3-of-3 blind A/B wins, and 13.3 turns reduced to 5.0. These are the project's own evaluations, and `docs/evals.md` is unusually forthcoming about that: tests 1 through 3 ran against v2.22.0 with 5 `with_skill` and 5 `without_skill` subagents, the skill is self-classified as an "encoded preference skill" whose assertions test workflow fidelity rather than planning ability, and the 13.3-versus-5.0 figure is labeled an author-run internal benchmark with disclosed method and limits. That disclosure is better than most, and it's still not a measured benefit of progress files over any alternative. The 30 assertions are mostly file-existence and section-header checks ("task_plan.md created in project directory," "## Errors Encountered section"), which measure whether the skill was followed rather than whether the task went better.

I'd take the mechanism and treat the numbers as a hypothesis. [Lecture 04](../lecture04/) applied the same standard to the lecture itself, and it would be inconsistent to apply it only to the free material.

### Knowledge continuity: OpenViking

OpenViking addresses the layer above. It's the memory plugin behind this session's `<openviking-context>` injections, so I can describe the mechanism from the inside.

The organizing idea is that a flat vector pool is unauditable: "text goes in, embeddings come out, and nobody can see what was actually stored." So context lives in a `viking://` virtual filesystem with directories, URIs, and `ls` / `tree` / `read` / `grep` over them. Directories carry generated summaries at three tiers: an L0 abstract (one sentence, for relevance checks), an L1 overview (for planning), and the L2 original (read only when needed). Retrieval is directory-scoped, so a query can be confined to a project or memory subtree instead of scanning everything.

The tree splits into `resources/` (project docs, repos, pages) and per-user `user/{id}/` holding `memories/`, private `resources/`, `skills/`, and `peers/`. Committing a session archives the conversation and extracts memories as markdown you can inspect, edit, and merge.

The plugin's hook set is the same shape as planning-with-files and covers more boundaries:

| hook | what it does |
|---|---|
| `SessionStart` | injects the profile every session; injects the archive's overview on `resume` and `compact` |
| `UserPromptSubmit` | auto-recall from memory |
| `PreToolUse` (Read/Glob/Grep) | a URI guard |
| `PostToolUse` (Read) | attaches relevant experience |
| `Stop` | auto-capture |
| `PreCompact` | capture before compaction |
| `SessionEnd` | capture at exit |
| `SubagentStart` / `SubagentStop` | the same for subagents |

Shipping this as hooks rather than as a convention makes the lecture's clock-out step automatic, with no discipline required to write the state down, because capture runs at `Stop`, `PreCompact`, and `SessionEnd` whether or not the agent remembers. The lecture's Tool 4 asks the agent to update `PROGRESS.md` before the session ends. A `SessionEnd` hook doesn't ask.

The `compact` matcher on `SessionStart` is the piece the lecture is missing entirely. On compaction, the plugin injects its archive overview as a canonical long-term record alongside Claude Code's own compact summary. That is a second, independently-maintained summary of the same session entering context at the same moment, which is a direct answer to "compaction loses the why," and it doesn't rely on the compaction prompt getting it right.

The failure mode to watch here is the one the lecture would flag: capture that runs automatically produces more than you need, and "what happened" crowds out "what is worth preserving." The three-tier summary layer is the defense, since retrieval surfaces an abstract before it surfaces content, but a directory tree of low-value memories is still a directory tree.

### Handoff: the boundary case

[mattpocock/skills `handoff`](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md) is 16 lines and does something neither of the other two does: it writes a document for a *different* agent, shaped by what that agent is about to do. Its rules are worth reading on their own, and three of them push back on the lecture's instinct.

It writes to the OS temp directory rather than the workspace, on the reasoning that a handoff is scaffolding for one transition. Put it in the repo and it becomes a durable artifact that will be stale in a day, which is `PROGRESS.md`'s failure mode with a worse name.

It doesn't duplicate what's already in another artifact. Specs, plans, ADRs, issues, commits, and diffs get referenced by path or URL instead. This is the difference between a handoff that stays accurate and one that drifts from the thing it describes, and the lecture's four-tool list is missing it: a `PROGRESS.md` that restates the commit log is a second copy of the commit log.

It redacts secrets, and it treats arguments as a description of the next session. The document is shaped by what the next agent is for rather than by what this session did. A handoff for "review this PR" and a handoff for "finish the implementation" are different documents from the same session.

It also ships a `suggested skills` section naming which skills the next agent should invoke. That's the same idea as the `SessionStart` hook naming what to load, expressed as content rather than as mechanism, which is useful when the transport is a human pasting a document into a fresh session and there is no hook to fire.

For contrast, the `handoff` skill in [claude-mem](https://github.com/thedotmack/claude-mem) writes `HANDOFF.md` to the project root and includes a "What Has Been Tried (and Why It Failed)" section as its most important part. Both are defensible and they encode different assumptions about whether the handoff should survive. Temp dir means it's disposable, which is right when the next session is minutes away. Project root means it's durable, which is right when the work spans days and the file is the only record. The lecture picks neither and doesn't raise the question.

## What I would do instead

Split the two layers before choosing tools. Task state goes in files that die with the task, and project knowledge goes through the repo ([lecture 03](../lecture03/)) or a memory system. Writing an ADR into `PROGRESS.md` guarantees it dies with the task.

Move the load step into `SessionStart` rather than into `AGENTS.md`. The content is the same either way. The difference is that a hook fires and an instruction has to be remembered before it does anything. `AGENTS.md` keeps the explanation of why the ritual exists, which is the part a hook can't supply.

Record the command rather than the result. The lecture's progress file carries "Test status: 42/43 passing," which is a claim from a previous session, and per [lecture 04](../lecture04/) a persisted claim is a hint rather than a source of truth. What's reproducible is the command, `make check`. Put the command in the entry file ([lecture 02](../lecture02/) already does this), put the last run's output nowhere, and re-run it. The lecture's verification gap is real, but the fix is a cheap idempotent check rather than a longer record.

Write the failed approaches down. The lecture's `PROGRESS.md` example has a "Known Issues" section and no "What I tried that didn't work." The section preventing duplicated work is also the one most likely to get omitted, since a failed attempt feels like it doesn't belong in a status file. claude-mem's handoff template calls it the most important section, and I think that's right. Lecture 03's knowledge decay has a mirror here: a re-attempted dead end costs the same context it cost the first time, and there is no record that it was already spent.

Set the compaction point deliberately. Pick a fill level with `/autocompact`, run `/compact` with instructions at natural breaks, and treat the automatic pass as a backstop rather than the plan. Prefer `/rewind` over `/compact` when the goal is to abandon a path rather than to continue it, since it's cheaper and it keeps the original.

Give every artifact a deletion rule at the moment you create it. This is [lecture 04](../lecture04/)'s expiry discipline applied to session state: `PROGRESS.md` dies when the task closes, the plan file when the plan is done, and the handoff when the next session starts. Anything without a death condition is a file that will be read by a session that shouldn't trust it.

## Exercises

The lecture's three, with my take:

1. **Rebuild cost measurement** - worth running, but define the unit before you start or the result is uninterpretable. Turns-to-first-correct-edit is the metric that matches what the lecture means; wall clock measures you. Also record which model, since the whole point of the anxiety section is that this number is model-dependent.
2. **Handoff template design** - the four-field version (commit hash, test pass rate, blockers, next actions) is a good minimum. Add a fifth field the lecture's doesn't have: *what was tried and failed*. And decide the two questions the template can't answer by itself, which are where the file lives and when it gets deleted.
3. **Mixed strategy experiment** - the most valuable of the three and the easiest to confound, because strategies (a), (b), and (c) differ in more than one way at once. Change one thing at a time, or you'll repeat the confound from [lecture 04's](../lecture04/) refactor story.

One I'd add:

4. **Measure the load step, not the write step.** The lecture's whole argument is that reading state at session start is cheaper than re-deriving it. That's a claim about the *consumer*. Take one task, run the session-start hook from [The clock-in ritual is an instruction, not a hook](#the-clock-in-ritual-is-an-instruction-not-a-hook), and compare turns-to-first-useful-action against a session that has the same files available but no hook. The difference is the value of the mechanism as opposed to the value of the artifact, and it's the comparison the lecture never makes.

## References

- [Lecture 05: the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/)
- [Lecture 05: code examples](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/lectures/lecture-05-why-long-running-tasks-lose-continuity/code/) - a session handoff example, a four-question continuity checklist, and a session simulator
- [Project 03: Multi-session continuity](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/projects/project-03-multi-session-continuity/index.md) - the practice project, with a checked-in solution carrying `init.sh`, `session-handoff.md`, `claude-progress.md`, and `clean-state-checklist.md`
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/), [lecture03](../lecture03/), [lecture04](../lecture04/)
- [Anthropic: Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) - published 2026-03-24; the source for context anxiety and the Sonnet 4.5 / Opus 4.5 split
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - published 2025-11-26; the initializer agent, `init.sh`, the 200+ feature JSON list, and the two failure modes the lecture drops
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - the long-horizon techniques section, including compaction and structured note-taking, which is the general form of what the lecture's progress files implement
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) - the repository as an "operational record"
- [LangChain: Improving Deep Agents](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) - Terminal Bench 2.0, 89 tasks, gpt-5.2-codex held fixed, 52.8% to 66.5%, across prompt, tool, and middleware changes together rather than progress files alone

### Claude Code mechanics

- [Checkpointing](https://code.claude.com/docs/en/checkpointing) - `/rewind`, the six menu actions, the 100-checkpoint window, and the documented restore gaps (Bash changes, subagent edits, symlinks, mid-turn messages)
- [How Claude remembers your project](https://code.claude.com/docs/en/memory) - `CLAUDE.md` and auto memory, what survives compaction, and why a `paths:`-scoped rule is summarized away while a root `CLAUDE.md` rule is re-injected from disk
- [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching) - why `/compact` costs what it costs, why `/rewind` is cheaper than compaction, the cache TTL, and the list of actions that invalidate the prefix
- [Manage costs effectively](https://code.claude.com/docs/en/costs) - `/compact` with instructions, the `# Compact instructions` `CLAUDE.md` section, and why usage climbs in a long session
- [Explore the context window](https://code.claude.com/docs/en/context-window) - what loads at startup and what each file read costs
- [Model configuration](https://code.claude.com/docs/en/model-config) - default auto-compact thresholds per model and how to set the window
- [Hooks reference](https://code.claude.com/docs/en/hooks) - the lifecycle events named above

### Tooling mentioned

- [planning-with-files](https://github.com/OthmanAdi/planning-with-files) - three plain markdown files (`task_plan.md`, `findings.md`, `progress.md`) with five lifecycle hooks, and [`docs/evals.md`](https://github.com/OthmanAdi/planning-with-files/blob/master/docs/evals.md) for the method and limits behind its numbers
- [OpenViking](https://github.com/volcengine/OpenViking) - the `viking://` virtual filesystem, L0/L1/L2 summary tiers, directory-scoped retrieval, and the plugin hook set
- [mattpocock/skills `handoff`](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md) - 16 lines; temp-dir output, no-duplication, redaction, and a `suggested skills` section
- [thedotmack/claude-mem `handoff`](https://github.com/thedotmack/claude-mem) - the project-root variant, with "What Has Been Tried (and Why It Failed)" as its load-bearing section
- [Claude Code in Action: Steering Long Sessions](https://anthropic.skilljar.com/claude-code-in-action/486901) - the course unit on plan mode, directing compaction, and the rewind menu. The public page lists those objectives and stops there; the lesson body sits behind enrollment
- [Claude Code 101](https://anthropic.skilljar.com/claude-code-101) and [Explore, plan, code, commit](https://anthropic.skilljar.com/claude-code-101/469792) - linked from [lecture02](../lecture02/)
