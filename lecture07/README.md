---
layout: default
permalink: /lecture07/
---

# Lecture 07 - Why Agents Overreach and Under-Finish

Notes from [lecture 7](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-07-why-agents-overreach-and-under-finish/) (slug: *why-agents-overreach-and-under-finish*).

The same argument is available as a slide deck, in two languages:

- [Lecture 07 deck, bilingual](slides/) (57 pages, English headings with Traditional Chinese body text, presenter notes included)
- [Lecture 07 deck, Traditional Chinese only](slides/s/lecture-07-zh-tw/) (same pages, English headings, English body text replaced)

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [Where the pieces came from](#where-the-pieces-came-from)
- [What the code examples show](#what-the-code-examples-show)
- [The comparison case in this repo](#the-comparison-case-in-this-repo)
- [What the lecture gets wrong](#what-the-lecture-gets-wrong)
  - [A quotation the source does not contain](#a-quotation-the-source-does-not-contain)
  - [The attention model is a metaphor presented as math](#the-attention-model-is-a-metaphor-presented-as-math)
  - [The central noun is never defined](#the-central-noun-is-never-defined)
  - [Little's Law says nothing about failure rates](#littles-law-says-nothing-about-failure-rates)
  - [The real-world case is a teaching example with the label removed](#the-real-world-case-is-a-teaching-example-with-the-label-removed)
  - [The completion evidence does not run](#the-completion-evidence-does-not-run)
  - [The scope tracker audits the agent's label, not its edits](#the-scope-tracker-audits-the-agents-label-not-its-edits)
  - [The lecture prescribes no mechanism, and CI is the obvious one](#the-lecture-prescribes-no-mechanism-and-ci-is-the-obvious-one)
  - [Blocking activations below VCR 1.0 blocks the normal case](#blocking-activations-below-vcr-10-blocks-the-normal-case)
  - [The scope surface duplicates the feature list](#the-scope-surface-duplicates-the-feature-list)
- [What I think](#what-i-think)
- [References](#references)

## Lecture summary

The lecture opens with a scenario. You tell the agent "add user authentication to this project." It changes the database schema, writes routes, edits frontend components, and refactors the error-handling middleware on the way past. Two hours later, 12 files have changed, 800 lines are new, and nothing works end to end.

The diagnosis is that agents have an impulse to do a little extra. Related work is visible and cheap to start, so they start it. The page treats this as a harness problem rather than a model problem, in the line "You didn't draw the boundary."

The explanation it gives is attention as a finite resource. If an agent has context capacity `C` and works on `k` tasks at once, each task gets `C/k` of the reasoning budget. Once `C/k` drops below what one task needs, none of them finish.

The fix is a work-in-progress limit of one, taken from Kanban. Four steps:

1. Write WIP=1 into the instruction file, as a three-line work-rules block.
2. Give every task executable completion evidence, so done means a command passed rather than code being written.
3. Externalize the scope surface as a machine-readable file, so a fresh session can see which task is active and what counts as done.
4. Track verified completion rate, `verified / activated`, and block new activations while it sits below 1.0.

The case study is a REST API with 8 features, run two ways. Unconstrained, the agent starts 5 features in session 1, produces about 800 lines across 12 files, and 20% of end-to-end tests pass; by the end of session 3, 3 of 8 features are complete. Under WIP=1, the agent does one feature per session, produces about 200 lines across 4 files with 100% passing, and finishes 7 of 8 by session 4. The reported comparison is 87.5% against 37.5%. The section is headed "Real-World Case," and the scenario is not one.

The page carries no teaching-default caveat and no blockquote saying the case-study values are assumed. Both existed until 2026-10-20, when a maintainer reverted the audit that added them. The current version presents an invented experiment as an observed one.

## Key concepts

- **Overreach** - starting more tasks in one session than the agent can finish. The lecture calls it measurable: 5 features with 0 completing end to end.
- **Under-finish** - too few of the started tasks pass end-to-end verification.
- **WIP limit** - how many tasks may be in flight at once, from Kanban. For agents, 1.
- **Completion evidence** - the check a task has to pass to move from in progress to done.
- **Scope surface** - a DAG of work units and their dependencies, with four states: `not_started`, `active`, `blocked`, `passing`.
- **Completion pressure** - the pressure the limit and the evidence requirement put on the agent to finish before starting something new.

## Where the pieces came from

The page makes two claims with citations. Neither matches the source it cites.

| Lecture claim | Source cited | What the source says |
|---|---|---|
| "when prompts are too broad, agents tend to **start multiple things at once** rather than **finish one thing first**" | [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | The article says "the agent tended to try to do too much at once, essentially to attempt to one-shot the app," and that asking it "to work on only one feature at a time" was "critical to addressing the agent's tendency to do too much at once." Neither quoted phrase appears in the article, in any form. |
| "OpenAI's Codex engineering practices found the same, tasks without explicit scope controls see completion rates plummet" | [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) | The word *scope* does not occur in the article. Neither does *completion rate*, and no rate or percentage appears in it. |

The first quote is in quotation marks, which is the strongest form of the claim, and the phrases are not there. The article does make a weaker and nearby point, quoted above, and the lecture could have used it. Instead it put words in the source's mouth.

The second claim fails differently. It reports a finding, with a direction and a mechanism, from an article that contains neither the finding nor the words. What OpenAI argues is depth-first decomposition: "breaking down larger goals into smaller building blocks (design, code, review, test, etc), prompting the agent to construct those blocks, and using them to unlock more complex tasks." That supports the principle and says nothing about completion rates.

Two more mismatches matter for the argument below.

- The article's second failure mode is not the lecture's under-finish. The article describes "a later agent instance would look around, see that progress had been made, and declare the job done." That is a premature stop, one event, caused by reading state that looks finished. The lecture turns it into a ratio of verified to started tasks, which is a metric and not a mechanism. A rate cannot tell you that the agent looked around and stopped.
- OpenAI's throughput section argues against the fourth prescription. It states "minimal blocking merge gates," that "corrections are cheap, and waiting is expensive," and that pull requests are kept short-lived. Blocking activation below VCR 1.0 is a blocking gate on exactly that throughput.

The two remaining citations are books the lecture uses for concepts rather than findings. The [Kanban Guide](https://kanbanguides.org/) and Anderson's book do define WIP limits the way the lecture presents them. McConnell's *Rapid Development* is cited for "scope creep is the leading cause of project failure," which matches the book, though the lecture extends it into an area McConnell did not study: agent sessions.

## What the code examples show

The `code/` directory has four files. Three are one-page markdown, and one is a program.

- `index.md` lists the folder as "examples of" four topics and names none of them in a form anyone can run.
- `next-task-template.md` is four questions: current highest-priority feature, why it is next, what counts as passing, what must not be changed during this step. This is the most useful thing in the lecture. The fourth question is also the only place on the page where scope is drawn as an exclusion rather than a count.
- `scope-surface-example.md` takes one task, "add indexing to the Electron knowledge app," and gives a bad shape (one bullet, "Implement indexing") and a better shape (five bullets: parse, split, persist metadata, expose status, reindex). It has no DAG and no state, so the two things the lecture defined for a scope surface do not appear in the artifact named after it.

`scope-tracker.ts` is the only executable piece. It reads a hard-coded feature list with an `active` field, compares each entry in a hard-coded change log against the active feature's id, and prints a table with the out-of-scope entries marked `DRIFT`. Run on its own sample data, it reports 6 in scope, 4 drift, 3 features touched.

The drift comes from the sample change log, and the log is hand-written. For each change, the tracker reads one field: `featureId`, the id the agent under audit assigned to its own work.

## The comparison case in this repo

[`project01/strong-harness/`](../project01/strong-harness/) is this repo's run of the strong harness from Project 01, and it runs against the lecture's central claim about what happens in practice.

`AGENTS.md` sets up the work in five parts: startup rules that order the agent to read `docs/ARCHITECTURE.md` and `docs/PRODUCT.md` before coding, four layer boundaries, four conventions, a five-condition Definition of Done, and the `feature_list.json` protocol. `feature_list.json` holds four features, each with a `status`, a prose `evidence` string, and a `testedAt` timestamp.

What the run recorded, from `claude-progress.md`:

- One session, 13m 16s.
- All four features implemented and marked `pass` with evidence.
- `npm run check` and `npm run build` clean, 15 of 15 tests passing, the app launching with zero console errors.
- 86.8k input tokens, 98.2% cache hit.

Four features went in during one session, all four were verified, and nothing was left half-finished. If "doing too many things at once almost guarantees none of them get done well" were the general rule, this run should have failed and it did not.

What made it work is visible in the artifacts, and none of it is WIP=1:

- The boundary was drawn before the session started, by `docs/PRODUCT.md`, which lists the features, the layout, and the constraints (10 MB cap, `.txt` and `.md` only, no network). The lecture's title says "draw clear task boundaries." This is what drawing one looks like, and it is a specification rather than a counter.
- `AGENTS.md` has no WIP rule and no notion of an active task.
- What it has instead is a different kind of scope control: layer boundaries that say where code is allowed to go. The renderer never imports Node, main and renderer talk only through IPC, and services never import renderer. That constrains the shape of a change rather than the number of changes.
- It also has completion control, stronger than anything else in the course so far. The Definition of Done requires compilation, launch, an evidence-bearing status flip, boundary compliance, and a clean console. Four of those five are checkable by running something.

The gap is on the scope side. None of the five conditions mentions scope. A run could add an unrequested feature, touch files in every layer, and still meet every condition, because `feature_list.json` records only the features that succeed and has no field for what a step must not change. That is exactly the fourth question in `next-task-template.md`, and the schema has nowhere to put the answer.

Layer boundaries are also unenforced. `npm run check` type-checks; nothing fails when a service imports from the renderer. For this harness, the fourth prescription, an automated rate monitor, measures the wrong thing. What would earn its keep is a dependency-direction test, and `src/services/*.test.ts` does not have one.

Nothing in the strong harness runs on a clean machine either. The run recorded 15 passing tests and a clean build, and every one of those results is a claim the session made about itself: `claude-progress.md` and `feature_list.json` are both written by the agent that did the work, and a fresh clone would tell you nothing until someone ran the commands by hand.

## What the lecture gets wrong

### A quotation the source does not contain

This is the defect the rest of the page leans on, and it sits in quotation marks. The claim that agents "start multiple things at once rather than finish one thing first" is attributed to Anthropic. The article describes something nearby and weaker: an agent that tries to one-shot the app, which is about ambition rather than task parallelism, and the fix it reports is a prompt asking for one feature at a time. That is a different mechanism from a WIP counter, and it is the one with evidence behind it.

### The attention model is a metaphor presented as math

"This isn't a metaphor, it's math," followed by `C/k`, is a metaphor with a division sign in it. The prescriptions built on it inherit what the model gets wrong.

Attention is not a divisible stock. `C/k` assumes the budget splits evenly across `k` tasks, in proportion to their count. Real context use is lumpy. One task may need a 40-page file read and another a one-line lookup, and what fills the window is tool output and history, not how many tasks the agent thinks it is doing.

`k` is not well defined either. The next section takes that apart; here it is enough to note that the lecture's own example counts six steps of one feature, so `k` is 6 inside a single feature, and the last of those steps is drift rather than a task.

The window also isn't shared. `C` is a per-window quantity, and the lecture applies it to a harness it never describes in terms of windows: subagents, parallel work, and isolated contexts do not appear on the page. Each subagent gets its own window, so the claim that `k` tasks divide one `C` does not describe four subagents working four tasks. [Lecture 05](../lecture05/) reached this from the other direction, calling a subagent a context firewall and using one because the parent's window is not the only window there is.

### The central noun is never defined

The lecture builds everything on "task" and never says what one is. The page uses the word three ways, and the three do not agree.

Operationally it means a feature. The work rule says "work on one feature at a time" and "only start the next feature." Overreach is defined as "5 features with 0 passing end-to-end." The mermaid diagram runs `Feature queue --> Pick exactly one task`, which equates the two. The case study counts 8 features and says the unconstrained run "activates 5 features simultaneously."

Its own example counts smaller. The six-step run (model, route, mail service, bcrypt, error middleware, test directory) is offered as the overreach, so `k` there is 6 inside one feature. At feature granularity that is `k=1` and nothing is overreach. The attention argument only works if a task is smaller than a feature, which contradicts every sentence above.

`scope-surface-example.md` uses a third size. It opens with `Task:` and names it as "add indexing to the Electron knowledge app," then breaks it into five children. There a task is a project, and the units are the children.

The only definitional sentence is in the exercise, not the body: "break it into at least 5 atomic work units. For each unit, specify: (a) a single behavior description, (b) an executable verification command, (c) dependencies." That is the closest the page gets, and it is precise enough to use. One behavior, one command, explicit dependencies.

Check the three readings against the prescriptions:

| Reading | Fits | Breaks |
|---|---|---|
| A feature | the work rule, the VCR ratio, the case study, the queue diagram | the six-step example, where overreach happens inside one feature |
| An issue or pull request | the exercise's atomic unit, which fits a PR almost exactly | the page never says branch, PR, or merge, and `scope-tracker.ts` has no diff and no files-per-task |
| A job the user asked for | the attributed OpenAI line about "tasks without explicit scope controls" | that is exactly the granularity the lecture calls too broad |

The reading that survives most of the page is one atomic work unit: one end-to-end verifiable behavior, which in a repository is one pull request. The lecture reaches it only through an exercise and then uses "task" to mean all three at different points.

The cost is concrete. A `feature_list.json` entry has no defined size, so an agent can satisfy WIP=1 by adding three features to one entry, and the schema will not notice. The six-step example is exactly that failure, and the rule it violates cannot see it. The fix is one sentence in Core Concepts, matching the exercise, plus an explicit `unit` field or a stated per-entry cap in the schema so the limit has something to count.

### Little's Law says nothing about failure rates

The lecture writes "L = lambda W. If work-in-progress L is too high, the lead time W for each task inevitably increases. For agents, this means each feature takes longer from start to verified completion, and the probability of failure grows."

The opening is Little's Law within its scope: in a stable system, average work in progress equals arrival rate times average time in system. The next clause follows from it, since if `L` rises with `lambda` fixed then `W` rises. That part holds.

The failure claim does not. The law is an accounting identity with no failure term in it. It holds for any stable queue whether or not the work succeeds, so it cannot say anything about the probability that a task fails, because failure is not one of its quantities. The lecture needs that inference and the theorem cannot supply it.

The direction is looser than the lecture implies. Little's Law does not say high `L` causes long `W`; the two are related, and both can come out of the same load. If the agent generates work five times faster than it verifies, measured `L` rises because verification is the bottleneck, and the remedy is more verification capacity rather than fewer tasks. That reading lands on a different prescription.

### The real-world case is a teaching example with the label removed

The numbers in the Real-World Case do not hold together, and the open [issue #91](https://github.com/walkinglabs/learn-harness-engineering/issues/91) reports half of it: "WIP1 is mentioned as being 200 lines long, yet the end states 1200 lines."

Long before that, someone checked whether the case was real. [Issue #73](https://github.com/walkinglabs/learn-harness-engineering/issues/73), opened 2026-09-09, asked the maintainers to source the case-study numbers or relabel them, and it was fixed and closed in three commits and a pull request:

| Date | Change | Effect on this lecture |
|---|---|---|
| 2026-09-30 | [9fb48af](https://github.com/walkinglabs/learn-harness-engineering/commit/9fb48af904acdf3d56171e5479e2e1101b95d173) | Renamed the section `Illustrative Example` and added a blockquote: "Teaching illustration: this scenario and its numerical values are assumed for explanation, not observations from a published experiment." Also deleted a sentence claiming Anthropic's data showed WIP=1 agents at "a 37% higher task completion rate." |
| 2026-10-20 | [95c42ed](https://github.com/walkinglabs/learn-harness-engineering/commit/95c42ed) | "Revert course evidence audit across all 15 languages." Restored the original heading, removed the blockquote, and removed the page's top-of-file note that its cutoffs are teaching defaults. |
| 2026-10-22 | [PR #92](https://github.com/walkinglabs/learn-harness-engineering/pull/92) | Removed unsourced numbers in eleven lectures, but the only L07 change was swapping the fake 37% sentence for a sourced link to Anthropic's guidance. |

The fix landed, held for twenty days, and was undone. The current page has a heading that says real-world, percentages from a scenario nobody ran, and no note saying so. Issue #73 is still closed as fixed.

The numbers are worse than merely unsourced.

The line counts are inconsistent. The unconstrained run produces "~800 lines across 12 files" and the WIP=1 run "~200 lines across 4 files." The summary then says "less total code (800 vs 1200 lines)," which matches neither pair. No arithmetic on the stated figures gives 1200, and the ordering reads like a typo rather than a finding.

The two runs are measured at different times. The unconstrained run reaches 3 of 8 by "the end of session 3," and the WIP=1 run reaches 7 of 8 by "the end of session 4." The comparison then presents "87.5% vs 37.5%" as a result, though one figure comes from four sessions and the other from three. The honest comparison is at equal session count, and the case never makes it: it says neither what the unconstrained run reached by session 4 nor what the WIP=1 run reached by session 3.

The completion rate is not the VCR the lecture defined. VCR is verified tasks divided by started tasks, per session. The 37.5% is 3 of 8 features by session 3, which is project completion, and 87.5% is 7 of 8 by session 4. Neither is a VCR. The case measures a different quantity from the one the fourth prescription tells you to watch.

The number that would settle the argument never appears. The lecture says the cost of overreach is rework, and that half-finished code raises complexity for the next session. If that holds, the unconstrained run should show more total effort by the same point, and the case should report session time or token spend per run. It reports file counts and line counts. Those are what a reader would want to check, and there is no run to check them against.

The lecture also lost its caveat in the revert. The note at the top of the page, saying the numerical cutoffs are "adjustable teaching defaults, not experimentally established thresholds," was deleted in the same 2026-10-20 commit, along with the sentence that pointed readers at Anthropic's guidance. What remains is a real-world case that is not real, with nothing on the page saying so.

### The completion evidence does not run

The lecture's example of executable evidence is:

```
Verification: curl -X POST /api/register -d '{"email":"test@example.com","password":"123456"}' | jq .status == 201
```

Typed into a shell, it fails before it can check anything.

- `/api/register` has no host, so curl fails with `URL rejected: No host part in the URL`. Curl itself exits 3, but a pipeline reports the last command's status, and jq exits 0 on that empty input, so the whole check reports success. A check that cannot reach the server passes.
- `jq .status == 201` is not a filter. jq parses `==` and `201` as two file arguments and fails with `Could not open file ==: No such file or directory`, exit code 2. With `-o /dev/null`, the body is gone as well and the filter has nothing to read.
- Even written correctly, `jq '.status == 201'` prints `true` or `false` and exits 0 either way. It needs `-e`, or the exit status is success whatever the comparison says. A test that always passes is the failure this section exists to prevent, and the example commits it.

Two repairs get proposed for this, and both keep the same flaw. One adds the host, the `Content-Type` header, and quotes to the filter, but keeps the bare `jq`. The other replaces the filter with `curl -s -o /dev/null -w "%{http_code}"`, which prints `200` or `500` and still exits 0. Measured here: against a server answering 500, the first exits 5 on a parse error, the second exits 0, and only a version that compares the code exits 1.

The shortest form that actually gates:

```
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}')
[ "$code" = "201" ]
```

If the body is JSON and you want to read a field from it rather than the status code, `jq -e` is the other gate. It exits 1 when the filter produces false or null, and it exits nonzero on input it cannot parse:

```
curl -s -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}' \
  | jq -e '.status == 201'
```

The difference from the lecture's version is one flag, and it is the one that matters. Measured with `jq 1.7`:

| Input | `jq '.status == 201'` | `jq -e '.status == 201'` |
|---|---|---|
| `{"status":201}` | prints `true`, exit 0 | exit 0 |
| `{"status":200}` | prints `false`, exit **0** | exit **1** |
| `{"ok":true}` (no `status`) | prints `false`, exit **0** | exit **1** |
| `<html>error</html>` | parse error, exit 5 | parse error, exit 5 |
| empty input | exit 0 | exit **4** |

The last three rows are why `-e` is not optional. Without it the only failure it can report is a parse error, so an unreachable server, a wrong field name, and a failing assertion all read as success.

Verified against a local server: 501 gives exit 1 and 201 gives exit 0 for the `code=$(...)` form.

This is worse than a typo. The lecture argues that completion evidence must be executable, that `curl returns 201` counts and `the code looks fine` does not, and its own illustration of that idea does not execute. Anyone who copies it gets a gate that is permanently green, which makes the fourth prescription a rubber stamp.

For contrast, the completion control in [`project01/strong-harness/`](../project01/strong-harness/) is `npm run check` and `npm run build`, commands that exist in the repo and exit nonzero on failure. The lecture's version is more specific, checking one behavior rather than the whole typecheck, and that specificity is the right instinct. It just was not verified before publication.

### The scope tracker audits the agent's label, not its edits

`scope-tracker.ts` is the lecture's proof that drift can be caught. As written it cannot catch drift, and the reason is in what it reads.

The program's only input about scope is `change.featureId`, a field the agent fills in when it records what it did. The check is `activeIds.has(change.featureId)`. So the tracker answers "did the agent claim this change belonged to the active feature," not "did the agent change a file outside the active feature."

I relabeled all four drift entries in the sample log from `F-002`, `F-003`, and `F-004` to `F-001`, leaving the files and descriptions untouched. The tracker reported 10 changes in scope, 0 drift, and printed its closing line: "The tracker catches this drift and enforces the single-active-feature policy."

Every self-reported scope check fails this way. An agent that overreaches has already decided the nearby work belongs to the task, so it labels the nearby work with the task's id. The label and the decision come from the same place, and a monitor that reads the label cannot see past the decision.

The thing that would catch it is already in the tracker and unused: `change.file`. A path-to-module map, or a declared file surface for the active feature, would make drift a property of the diff rather than a claim about it. `git diff --name-only` against a declared surface is one line, and it hardens the check the sample data is built to pass.

The lecture's own framing supports the stronger version. Overreach is defined as something observable, "5 features with 0 passing end-to-end," and drift is observable in files. The example settles for what the agent says about itself.

### The lecture prescribes no mechanism, and CI is the obvious one

Every prescription on the page is a convention the agent has to keep: a rule in the instruction file, a state file it has to update, a ratio it has to track. [Lecture 03](../lecture03/) made the point that a prompt rule asks rather than enforces, and [lecture 04](../lecture04/) built a whole section on rules nothing gates. Lecture 07 repeats the shape with the most checkable artifact in the course, and stops at the convention.

The mechanism it is missing is a CI job, and this section's own examples show how much of the argument it would settle.

The completion evidence defect and this one are the same defect twice. A `jq` gate that exits 0 on false is exactly what a CI job on a clean machine catches, because the job's status is the exit status and nothing else. The scope tracker has the same weakness from the other end: it reads a label the agent wrote. A CI job reading `git diff --name-only` against a declared surface reads the repository, and the agent has no say in what the diff contains.

CI also answers the objection that ends the sequencing argument. The course's own reading of OpenAI is "corrections are cheap, and waiting is expensive," which argues against a gate that blocks the agent mid-task. A CI job that runs after a push does not block anything mid-task. The agent finishes, opens a pull request, and the runner on a clean machine decides whether the work holds. That is a gate, and it costs the agent no waiting, because the waiting happens after the session has ended.

Pull requests are the same idea on the human side. A branch per task, review, then merge, is the workflow [lecture 03](../lecture03/) describes when the repository is the system of record. It makes the review boundary explicit rather than a judgement call, and it puts the diff in front of someone who is not the agent that produced it.

The harness in this repo has none of that. `project01/strong-harness/` has no `.github/workflows`, no `.gitlab-ci.yml`, and no branch in its recorded history. The Definition of Done is agent-certified: the agent flips `feature_list.json` to `pass` and writes the evidence string itself. For a one-session exercise that is fine, and the lecture's whole claim is about runs that are not one session.

### Blocking activations below VCR 1.0 blocks the normal case

"Block new task activations when VCR < 1.0."

VCR is verified tasks divided by started tasks. A value of 1.0 means every task ever started has passed verification. The rule therefore says: do not start anything new until everything you ever started is fully done. Because a session that ends with a blocked or abandoned task never returns to 1.0, the project freezes on its first failure.

Under the lecture's own case study that is fatal. The WIP=1 run ends at 7 of 8 with the eighth "blocked by an external dependency." Its VCR is 0.875, so by rule 4 it may never start another task, and the project finishes permanently at 7 of 8. The unconstrained run locks at 0.375 the same way.

The rule is also redundant next to WIP=1. If only one task can be active, a new one cannot start until the current one closes, so the counter adds nothing the limit does not already do. The two prescriptions are the same prescription, and the second one applied as written is destructive.

A workable version limits *unverified* work rather than requiring zero. Cap the number of tasks that have been started and not verified, and let blocked tasks be closed with a reason rather than held open. That is a queue discipline, and it is what Kanban's WIP limit actually is: a cap on items in a column, not a ratio that must reach 1.

### The scope surface duplicates the feature list

The lecture introduces a DAG of work units with four states: `not_started`, `active`, `blocked`, `passing`. The course already has this artifact, and this repo already uses it.

`feature_list.json` in the strong harness has three states, `pass`, `fail`, and `not-started`, four flat features with no edges, and prose evidence. The lecture's version adds `active` and `blocked`, adds dependency edges, and renames two of the three states. The page never says how it relates to the feature list the course introduced in the previous lecture, or why a new name was needed.

The state it adds is the part the argument needs, and the schema lacks it, which cuts the other way as well. WIP=1 has no field to live in: the project's own feature list cannot say "this one is in progress," so it cannot enforce one at a time even if `AGENTS.md` asked it to. The concept and the artifact need merging rather than renaming past each other.

## What I think

WIP=1 is the wrong unit for the constraint, and the lecture's own evidence does not support it as a general rule. The boundary is the part worth keeping.

The boundary first, since it is what the title promises. Agents do expand scope. The extra work is visible while the boundary is not, so an agent that has no written boundary has nothing to check itself against. Writing the boundary down is a harness fix, and it is the fix that works. The opening scenario is accurate, and I have seen that shape of run.

WIP=1 is a different matter. The evidence behind it is a prompt asking for one feature at a time, in a harness built around a 200-entry feature list. That is a sequencing rule for one agent in one window, and it is compatible with subagents working four independent features at once, because the reason for the rule is context budget and each subagent has its own.

The evidence the lecture does not cite is the run in this repo. Four features, one session, all verified, 15 tests, 13 minutes. That is an instance of the situation the lecture says ends badly, and it did not end badly. What prevented it was a specification that listed the features before the session started and a Definition of Done that made done a checked property. Neither one is a counter.

So the design I would carry forward is the one `AGENTS.md` already encodes, with the scope gap closed:

- Write the boundary as a specification. `docs/PRODUCT.md` did the work the lecture wants a WIP limit to do, in a form the agent could read and stay inside. A task list helps; a document saying what the product is and what constraints it has helps more, because it answers "is this in scope" for work nobody thought to list.
- Keep one active task per agent, as a convention rather than a ratio. It costs nothing and it keeps the progress record honest. Do not make it a harness-wide rule and do not gate on it.
- Make done checkable, and then check the check. The instinct here is better than in any earlier lecture, and the example does not run, which is the lesson: a gate nobody has watched fail is a gate nobody knows works. Run it against a known-bad state before trusting it.
- Draw scope as an exclusion, per the fourth question in `next-task-template.md`, and give it a field. `feature_list.json` should carry `mustNotChange`, and the Definition of Done should require the diff to touch nothing outside it. That is the one thing the strong harness cannot see today, and it is the failure the lecture is actually about.
- Enforce the boundary in code where the boundary is structural. The layer rules in `AGENTS.md` are mechanically checkable and nothing checks them. A dependency-direction test in the vitest suite catches more overreach than any counter, because it fails on the edit rather than on a self-report about the edit.
- Move the last check off the agent. A GitHub Actions or GitLab CI job that runs `npm ci`, `npm run check`, `npm test`, and the dependency-direction test on a clean runner turns "done" from something the session wrote about itself into something a machine observed. Run it on pull requests, keep the agent on a branch per task, and let merge be the completion gate. That is the one mechanism the lecture never mentions, and it is the one that satisfies its own argument against blocking the agent mid-task, because the waiting happens after the session ends rather than inside it.

One thing I would keep from the lecture as written: overreach and under-finish do feed each other, and the paragraph making that point is the best-written part of the page. Half-finished work is what makes the next session expensive. The harness worth building is the one where a session cannot end in that state, not the one where a session is forbidden to start more than one thing. What "done" means is the property that matters. How work is counted matters less, and the count is the part an agent is least accountable for.

## References

- [Lecture 07: the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-07-why-agents-overreach-and-under-finish/)
- [Lecture 07: code examples](https://github.com/walkinglabs/learn-harness-engineering/tree/main/docs/en/lectures/lecture-07-why-agents-overreach-and-under-finish/code) - `next-task-template.md` (four questions, including what must not change), `scope-surface-example.md` (one task, bad shape vs better shape), and `scope-tracker.ts`, which reads a self-reported `featureId`. `scope-surface-example.md` is also where the word "task" means a project rather than a feature
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - published 2025-11-26; "do too much at once" and "one feature at a time," which are not the phrases the lecture quotes; the second failure mode is an agent declaring the job done after looking around
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) - depth-first decomposition and "corrections are cheap, and waiting is expensive" against blocking gates; contains no occurrence of *scope* or any completion rate
- [Kanban Guide](https://kanbanguides.org/) - WIP limits as caps on items in a column, which is not a ratio that must reach 1
- [Rapid Development - Steve McConnell](https://www.goodreads.com/book/show/125171.Rapid_Development) - scope creep as a leading cause of project failure, in human projects
- [`project01/strong-harness/`](../project01/strong-harness/) - the four-feature, one-session run; `AGENTS.md` layer boundaries and Definition of Done, `feature_list.json` with three states and no active field
- [`project01/p01-share-README.md`](../project01/p01-share-README.md) - the Project 01 protocol and the isolation rule for the two runs
- [Issue #91](https://github.com/walkinglabs/learn-harness-engineering/issues/91) - the open report on the 200 vs 1200 line contradiction, with no comments yet
- [Issue #73](https://github.com/walkinglabs/learn-harness-engineering/issues/73) - the request to source or relabel the case-study numbers; closed 2026-09-30 after a fix landed
- [9fb48af](https://github.com/walkinglabs/learn-harness-engineering/commit/9fb48af904acdf3d56171e5479e2e1101b95d173) - the evidence audit that renamed this case to `Illustrative Example` and added the teaching-illustration blockquote
- [95c42ed](https://github.com/walkinglabs/learn-harness-engineering/commit/95c42ed) - "Revert course evidence audit across all 15 languages," 2026-10-20, which restored the original headings and removed the caveats
- [PR #92](https://github.com/walkinglabs/learn-harness-engineering/pull/92) - merged 2026-10-22; removed unsourced figures in eleven lectures but left this section's heading and percentages in place
- [GitHub Actions: workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) - the `on: pull_request` trigger and job exit-status semantics a completion gate would use
- [GitLab CI/CD pipeline configuration](https://docs.gitlab.com/ci/yaml/) - the same shapes for `merge_request` pipelines and `rules:`
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/), [lecture03](../lecture03/), [lecture04](../lecture04/), [lecture05](../lecture05/), [lecture06](../lecture06/)
