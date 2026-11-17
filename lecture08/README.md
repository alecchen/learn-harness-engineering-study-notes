---
layout: default
permalink: /lecture08/
---

# Lecture 08 - Why Feature Lists Are Harness Primitives

Notes from [lecture 8](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/) (slug: *why-feature-lists-are-harness-primitives*).

## Contents

- [Lecture summary](#lecture-summary)
- [Key concepts](#key-concepts)
- [Where the pieces came from](#where-the-pieces-came-from)
- [What the code examples show](#what-the-code-examples-show)
- [The comparison case in this repo](#the-comparison-case-in-this-repo)
- [Why a file and not an issue tracker](#why-a-file-and-not-an-issue-tracker)
- [What the lecture gets wrong](#what-the-lecture-gets-wrong)
  - [The Building Effective Agents citation is fabricated in its strongest form](#the-building-effective-agents-citation-is-fabricated-in-its-strongest-form)
  - [The four dependents are the lecture's model attributed to a consensus](#the-four-dependents-are-the-lectures-model-attributed-to-a-consensus)
  - [Pass-state gating is not what the cited source does](#pass-state-gating-is-not-what-the-cited-source-does)
  - [The state machine has four states and no state field](#the-state-machine-has-four-states-and-no-state-field)
  - [Irreversible passing has no reopen path](#irreversible-passing-has-no-reopen-path)
  - [The validator injects data it did not read, and cannot fail](#the-validator-injects-data-it-did-not-read-and-cannot-fail)
  - [The page's own triple cannot be satisfied by any artifact it ships](#the-pages-own-triple-cannot-be-satisfied-by-any-artifact-it-ships)
  - [The real-world case is again a scenario with the label removed](#the-real-world-case-is-again-a-scenario-with-the-label-removed)
- [What I think](#what-i-think)
- [References](#references)

## Lecture summary

The opening scenario is a completed e-commerce site that does not work. Auth is in, the checkout button does nothing, the payment flow was never connected. The diagnosis: nobody defined "done," so the agent fell back on its own standard, roughly "the code looks complete."

The argument is that a feature list is not a memo for humans. It is the data structure the rest of the harness reads. The scheduler picks from it, the verifier writes to it, the handoff reporter summarizes it, the progress tracker tallies it. The lecture calls this being a *primitive* and reaches for the database analogy: a document can be ignored, a primitive cannot be bypassed, the way a database trigger cannot be skipped by application code.

The mechanics it proposes:

1. Every feature row carries a triple: behavior description, verification command, current state.
2. Four states, `not_started`, `active`, `blocked`, `passing`, with the transition into `passing` owned by the harness and irreversible.
3. The agent declares state. The harness runs the command and decides. That is "pass-state gating."
4. Granularity is calibrated to "completable in one session."

Then a case study compares memo mode against structured mode on a 10-feature e-commerce platform. The structured run wins: 3 minutes to resume against 20 minutes, zero rework.

## Key concepts

- **Feature list as primitive** - a machine-readable file in the repo that other harness components read, rather than a planning note a human skims.
- **The triple** - `(behavior, verification command, state)` per row, all three required.
- **State machine** - `not_started`, `active`, `blocked`, `passing`, with `active -> passing` controlled by the harness.
- **Pass-state gating** - the only upgrade path is a verification command exiting successfully, and it is one-way.
- **Single source of truth** - every statement about what remains derives from the list, not from conversation history.
- **Back-pressure** - the count of unpassed features is the pressure on the agent; zero pressure means the project is done.

## Where the pieces came from

The page's strongest claim about its sources is in Further Reading: Building Effective Agents "explicitly identifies feature list as the 'core data structure' for controlling agent scope." Both phrases are in quotation marks.

I fetched all three cited articles on 2026-11-17 and counted the phrases in the extracted text.

| Lecture claim | Source cited | What the source says |
|---|---|---|
| "Explicitly identifies feature list as the 'core data structure' for controlling agent scope" | [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) | `feature list`: 0 occurrences. `core data structure`: 0. `scope`: 0. The article covers workflows, evaluator loops, and "gaining ground truth from the environment at each step (such as tool call results or code execution)." It contains no data structure of the kind described. |
| "The scheduler relies on it... the verifier relies on it... the handoff reporter relies on it" | presentation of what "both Anthropic and OpenAI emphasize", no citation | `scheduler`, `verifier`, `handoff reporter`, `progress tracker`: 0 occurrences across all three cited articles. The four subsystems are the lecture's model. They are not any cited source's model. |
| "Both Anthropic and OpenAI emphasize: **artifacts must be externalized**" | the two engineering posts | OpenAI: `externalize` 0, but it does say "Plans are treated as first-class artifacts" and "Repository-local, versioned artifacts (e.g., code, markdown, schemas, executable plans) are all it can see." Anthropic: `externalize` 0, but its initializer table says "Set up a feature list file: based on the input spec, set up a structured JSON file with a list of end-to-end feature descriptions." The substance holds for both. The word does not. |
| Pass-state gating: "The harness executes the verification command and decides whether to allow the transition" | [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | The article's own table says the opposite about who decides. Coding agent behavior: "Self-verify all features. Only mark features as 'passing' after careful testing." The agent marks its own rows. There is no harness process between the agent and the state. |

Four claims, four different failures: one misquoted from another article, one attributed to a consensus nobody states, one defensible in substance but quoting a phrase that is not there, and one that reverses the practice it cites.

The lecture does get one thing right about the Anthropic article, though the rest of the page buries it. The initializer/coding split is real: the initializer writes a structured JSON file of end-to-end feature descriptions, initially all failing, and later sessions "Read the feature list file at the beginning of a session. Choose a single feature to start working on." What the article describes is a file, a starter set, and one feature per session. No scheduler, no verifier process, no four-state machine.

## What the code examples show

The `code/` folder has four files: one program, one data file, and two pages of prose.

`index.md` lists the folder as examples of "pass-state gating, end-to-end verification, weak vs strong completion criteria, evaluator-loop examples" and names no runnable artifact for any of the four.

`feature_list.json` is a single entry:

```json
{
  "id": "qna-001",
  "category": "grounded_qa",
  "description": "User can ask a question about an imported document and receive an answer with visible citations.",
  "verification": [
    "Import a markdown document",
    "Open the Q&A panel",
    "Ask a question about known content",
    "Verify the answer is returned",
    "Verify one or more citations are displayed"
  ],
  "passes": false
}
```

That is not the triple. It has behavior (`description`) and state (`passes`, a boolean where the page specified four named states), and `verification` holds five prose steps a human performs rather than one command. The `evidence` field the page's own JSON example includes is absent.

`pass-gate-policy.md` is four conditions for flipping `passes`. Every one is prose a human judges: "the expected workflow has been exercised", "no blocking error is present in the tested path", "does not leave the app in a broken or ambiguous state". Nothing here can be executed, which is the exact failure the lecture's central prescription exists to prevent.

`feature-list-validator.ts` is the only runnable piece, 218 lines. I ran it on node 26.12.1 with the built-in type stripping.

What it does: reads `feature_list.json`, validates field types, and flags a row where `passes` is `true` and `verification` is missing or empty. Nothing else.

Four things went wrong when I ran it.

The demo rows are always merged into the report. Lines 147 to 168 append three hard-coded entries to whatever it read, so the report describes data that is not in the file it names. Run on a two-row file, it printed five rows.

```
| Feature ID    | Schema  | Passes | Verifications | Evidence?   | Notes
|----------------|----------|---------|----------------|--------------|------------------------------
  | a             | OK      | PASS   | 1             | Present     |
  | b             | OK      | FAIL   | 1             | Present     |
  | qna-002       | OK      | PASS   | 2             | Present     |
>>| qna-003       | OK      | PASS   | 0             | MISSING     | FLAGGED: passes without evidence!
>>| missing-fields| INVALID | PASS   | 0             | MISSING     | FLAGGED: passes without evidence!

  Total features:                     5
  Flagged (pass without evidence):    2
```

It exits 0 on that run. The tool prints a warning and sets no failure status, so it cannot gate anything. In CI the step would go green.

It treats a non-empty prose array as evidence. A row with `"verification": ["looks fine"]` and `"passes": true` reports `Present`, is not flagged, and the summary closes with "All passing features have verification evidence. Feature list is healthy." The lecture's argument is that a checklist of adjectives is not verification. The tool built for it accepts exactly that.

It rejects the course's own feature lists. The validator requires a top-level JSON array. The course template at `docs/en/resources/templates/feature_list.json` is an object with `rules`, `status_legend`, and a `features` array. So is the list in `project01/strong-harness/`. Both produce the same error, exit 1:

```
  ERROR: feature_list.json must contain a JSON array at the top level.
```

So there are three incompatible schemas in play: the page's example (array, `state`, `evidence`), the lecture's code (array, `passes`, no evidence), and the course template (object, `status`, `evidence`). The one artifact whose job is to validate the schema cannot read two of the three.

The program never writes. There is no `writeFile` or `appendFile` in it, so it cannot be the component that owns state transitions, the role the lecture assigns to the harness.

## The comparison case in this repo

[`project01/strong-harness/`](../project01/strong-harness/) is the four-feature, one-session run from Project 01, and it is a working instance of what the lecture asks for, with one field missing.

`AGENTS.md` has the startup rule ("Read `feature_list.json` to see the current state of all features"), a five-condition Definition of Done, and a working agreement for the list: each feature has `status` of `pass`, `fail`, or `not-started`, update to `pass` with evidence, set `fail` with a reason, never delete a row.

`feature_list.json` carries four features. Each has `description` (behavior), `status` (state), and `evidence` (prose), plus `testedAt`. What it does not have is a verification command. The evidence strings name commands that exist (`npm run check`, `npm run build`, `vitest`) but the file stores a sentence about them, not a command the harness can run.

So the repo passes two legs of the triple and fails the third, in the same way the lecture's own data file fails it. The difference is that this repo's checks are real: `npm run check` and `npm run build` exit nonzero, and the vitest suite has 15 tests.

Where the harness matches the lecture: the list is the single progress record, it is read at session start, and it uses a status vocabulary close to the four states.

Where it falls short: the file cannot say which feature is in progress, because `active` is not a status it knows. `blocked` is missing too. Neither is `mustNotChange`, the gap noted in [lecture 07](../lecture07/). And the pass is self-certified, as in Anthropic's table and against the lecture's pass-state gating, since the same session flips `status` to `pass` and writes the evidence string.

## Why a file and not an issue tracker

The lecture never asks this question, and the answer it would give is the wrong one. The question has two halves. One is where the record lives. The other is whether "one at a time, verify each" needs a particular store. Only the first half has an interesting answer.

Its argument is that a primitive "can't be bypassed," like a database trigger. That is the weakest reason to choose a file. A trigger is enforced by a separate process the application has no choice but to go through. A JSON file in the repo is written by the same agent, with the same permissions, in the same session. Nothing sits between the agent and the file. The lecture's own code proves it: the validator reads, never writes, and cannot stop an edit.

The reasons that do hold are about location and cost.

A file in the repo arrives in the same diff as the code that changes it. The status flip and the implementation are one reviewable unit. A Jira ticket is a separate system, so the code review never shows the state change and the ticket never shows the diff. GitHub issues do better than Jira, being at least attached to the repository, but they are still not in the commit.

A file costs no credential. The agent reads it with `cat` and writes it with an edit. The GitHub API needs a token in the environment, and a token in an agent's environment is a secret with a wider blast radius than the repository it was issued for. Jira wants the same plus a network path to a corporate instance.

A file shares the code's history. `git log feature_list.json` and `git log src/` are one timeline, so a later reader can see which feature flipped on which day against which code. A tracker keeps a separate history that drifts, and the drift is invisible.

A file can be restructured by the agent. Splitting a feature or adding a dependency edge is a text edit. A tracker's schema belongs to the tool.

Issues do win somewhere: people who are not reading the repo can see them, they support assignment and comments, and they work across more than one agent or one human. For a single-agent, single-session harness, that is weight with no reader.

The "one at a time, verify each" part of the lecture does not depend on this choice at all. A scheduler that reads a file reads a tracker's API just as easily. An issue assigned to the agent is one feature. A label change is one state transition. A ticket closed after CI goes green is the same gate as a row flipped in a commit. Whatever the lecture means by a verifier, it can be built on either store, and the reasons to prefer one are the reasons above: what ships with the code, what needs a credential, what keeps one history.

That is also why the file's advantage cannot be "it is enforced." Nothing enforces either option until something outside the agent reads it. The choice is about where the record lives, and the enforcement is a separate decision that happens to be easier for the file because the record is already in the diff that CI checks.

One thing GitHub issues do better than the lecture's file, and better than Jira: they are the natural place to keep the boundary between "the agent finished" and "a human accepted." An issue stays open through review and closes on merge, so its open set is a claim a reviewer verified rather than a claim the agent wrote. The file can express the same thing with a `reviewed` field, but nobody thinks to add one, because a status column invites the agent to fill in every value.

So the file is the right choice for reasons the page does not give, and the page's reason is the false one. That error has consequences, because it leads to prescription 3, which puts the enforcement in CLAUDE.md as a rule. A rule in an instruction file is a request. If the file is chosen because it sits in the diff and costs nothing to read, then the enforcement that follows is CI reading it on a pull request, not a sentence asking the agent not to edit it.

## What the lecture gets wrong

### The Building Effective Agents citation is fabricated in its strongest form

Further Reading says the article "explicitly identifies feature list as the 'core data structure' for controlling agent scope". Those are quotation marks around "core data structure", the strongest form the claim can take. The article contains zero occurrences of `feature list`, zero of `core data structure`, and zero of `scope`. It is a guide to workflow patterns, routing, parallelization, orchestrator-workers, and evaluator loops. There is no feature-list section to cite.

Lecture 07 made the same mistake with a different article. That page put words in the mouth of a source; this one invents an artifact the source does not contain.

### The four dependents are the lecture's model attributed to a consensus

"The scheduler relies on it to pick tasks, the verifier relies on it to judge completion, and the handoff reporter relies on it to generate summaries."

None of `scheduler`, `verifier`, `handoff reporter`, or `progress tracker` appears in any of the three cited articles. The sentence sits two paragraphs above "Both Anthropic and OpenAI emphasize", so a reader takes it as the shared model of the two labs. It is the lecture's own architecture, and a reasonable one. What makes it wrong is the sourcing, because the sourced version is much weaker: one file, read at session start, with one feature chosen per session.

The difference is not academic. A scheduler implies a process that picks work, and the course has no such process. Its tree contains no scheduler, verifier, or tracker script. The only executable across the lectures is this validator, and it does not decide anything.

### Pass-state gating is not what the cited source does

The lecture's central mechanism is that the agent cannot mark a row passing; it submits a request and "the harness executes the verification command and decides whether to allow the transition."

The Anthropic article describes the opposite arrangement in its own table. Coding agent behavior: "Self-verify all features. Only mark features as 'passing' after careful testing." The agent marks its own rows after its own testing. The harness contributes the initial file and the instruction to read it, not a gate.

That is a real design difference, and the lecture can prefer its version. What it cannot do is cite the article for it, since the citation is the only evidence on the page that the stronger version works.

### The state machine has four states and no state field

The page defines `not_started`, `active`, `blocked`, `passing` and says transitions are controlled by the harness. Then its JSON example uses `"state": "passing"`, its code file uses `"passes": false`, and the course template uses `"status": "not_started"`. Three vocabularies, one of them a boolean.

A boolean cannot express `active` or `blocked`, so the two states the argument leans on are unrepresentable in the artifact the argument ships. `active` is the one that matters, because it is what makes "one feature at a time" checkable, and it is the field `project01/strong-harness/` lacks for the same reason.

### Irreversible passing has no reopen path

"Once `passing`, it can't go back."

For a project that runs for days, that is wrong. A later change breaks a passing feature, the file still says passing, and nothing in the design can correct it. The Anthropic article does the opposite: the coding agent starts each session by "run[ning] a basic test on the development server to catch any undocumented bugs", which is regression checking on features already marked passing.

There is also no exit from `blocked`. A row that hits "dependency issue" stays blocked forever, and since zero unpassed features means complete, a blocked row is the one thing that prevents completion and has no defined way out.

### The validator injects data it did not read, and cannot fail

Both defects are described above with the runs behind them, so here is only the point they make together.

A tool that appends three fixture rows to every report is not auditing the project it names. A tool that prints "FLAGGED" and exits 0 is not a gate. The lecture argues that a primitive cannot be bypassed, and the primitive it ships reports on rows that do not exist while returning success when its own warning fires. Wired into a pipeline, it would be green on every input.

The repair is small, and it shows the intended shape. Delete the demo block, return a nonzero exit when `flagged > 0`, and check a non-empty `evidence` field rather than a non-empty `verification` array. A prose checklist is not evidence, and the current check spends its attention on the field that matters least.

### The page's own triple cannot be satisfied by any artifact it ships

Three requirements, four shipped files:

| Artifact | Behavior | Verification command | State |
|---|---|---|---|
| page JSON example | `behavior` | a `curl | jq` command that does not run | `state` |
| `code/feature_list.json` | `description` | five prose steps | `passes` boolean |
| `pass-gate-policy.md` | n/a | four prose conditions | n/a |
| course template | `user_visible_behavior` | prose steps | `status` |
| `project01/strong-harness/` | `description` | prose `evidence` naming real commands | `status` |

None of these has all three in executable form. The page's example comes closest, and its command fails before it checks anything, so I measured that one again:

```
curl -X POST http://localhost:3000/api/cart/items -H 'Content-Type: application/json' -d '{"product_id":1,"quantity":2}' | jq .status == 201
```

Two independent failures. `jq .status == 201` is not a filter: jq reads `==` and `201` as filenames and exits 2 with `Could not open file ==`. And even written correctly as `jq '.status == 201'`, jq exits 0 whether it prints `true` or `false`, so the gate passes on a failing server. Measured with jq 1.7:

| Input | `jq '.status == 201'` | `jq -e '.status == 201'` |
|---|---|---|
| `{"status":201}` | exit 0 | exit 0 |
| `{"status":200}` | exit **0** | exit **1** |
| `{"ok":true}` | exit **0** | exit **1** |
| empty input | exit **0** | exit **4** |

The lecture's whole point is that completion must be a command that can fail. Its illustration of that point cannot fail. Lecture 07 has the same defect in a different example, and its note proposed `-e` on 2026-11-02. The page still has neither `-e` nor a host.

### The real-world case is again a scenario with the label removed

"Real-World Case" compares memo mode against structured mode on a 10-feature platform. 20 minutes to infer state against 3 minutes. Zero rework against re-implementation.

There is no source, and there is also no run, no repository, no session log, and no way to reproduce any of the four numbers. The heading says real-world.

This is the second lecture in a row with that shape, and it is not a coincidence. [Issue #94](https://github.com/walkinglabs/learn-harness-engineering/issues/94), which I opened 2026-11-03, records that commit [9fb48af](https://github.com/walkinglabs/learn-harness-engineering/commit/9fb48af904acdf3d56171e5479e2e1101b95d173) had fixed this lecture too. It renamed the section to `Illustrative Example`, added a blockquote saying the numbers were "assumed for explanation, not observations from a published experiment", deleted a sentence claiming structured lists showed "45% higher feature completion rate", and removed a "60-80%" Anthropic attribution from the previous section.

Commit [95c42ed](https://github.com/walkinglabs/learn-harness-engineering/commit/95c42ed) reverted all of it on 2026-10-20 across 15 locales. PR #92, merged 2026-10-22, removed the 45% sentence again but restored the heading and left the 20/3 minute figures. The current page has no caveat anywhere.

Six English lectures carry the same reverted state, and issue #94 is the open question of whether the revert was intended. The defect on this page is that a comparison with four unsourced numbers reads as an observation, and the fix that already existed has been removed.

## What I think

The file is right. "Primitive" is the wrong word for why, and the file is not where enforcement lives.

Most of what the lecture argues holds up. Defining "done" before the work starts is the fix that works. A written, structured, machine-readable record of which features pass beats "looks fairly complete," and the resume-without-rework argument matches what both labs actually published. I would keep the granularity rule, "completable in one session," word for word.

What I would change is the justification, because the wrong justification produces the wrong enforcement.

"Primitives can't be bypassed" is a claim about a separate process. A JSON file has no separate process. The agent writes it, the agent reads it, and the agent has the same file permissions either way. Calling it a primitive means the owner of the state is also the auditor of the state. That is the failure [lecture 07's note](../lecture07/) already documented for `scope-tracker.ts`: a monitor reading a self-report cannot see past the decision that produced the report.

What actually follows from a file living in the repository, and does not follow from a Jira ticket, is CI. A job on a clean runner reads the file, checks the schema, checks that every `passing` row carries evidence it can find, and fails the pull request otherwise. It is a separate process, it sits in the diff path, and it needs no credential beyond the runner's own. It is also the one thing the lecture's code folder does not contain, and the one mechanism a `passes: true` edit cannot talk its way past.

The design I would carry forward:

- Keep the file, in the repo, in the diff. Use an object root with `rules`, `status_legend`, and `features`, matching the course template, so a template file and a project file are the same schema. Publish one schema and make every example use it. Three is not a format, it is a suggestion.
- Put evidence in `evidence` and make it a command plus its output, not an adjective. `npm run check` exiting 0 with the last line of output is evidence. "Verified it works" is not. The validator's job is to check that the evidence string contains something executable, not that the `verification` array is non-empty.
- Add the missing states, `active` and `blocked`, with a way out of each. `active` is what makes one-at-a-time checkable. `blocked` needs a `blockedBy` field so a row can reopen, and `passing` needs to reopen with a reason, because code regresses and a record that cannot say so is wrong.
- Keep "completable in one session" as the size rule and state a cap: one row, one verifiable behavior, one command. The lecture's own six-step example in lecture 07 is what happens without the cap.
- Enforce it in CI, not in CLAUDE.md. The Design by Contract analogy points at CI rather than the file, because the contract that cannot be bypassed is the one enforced by something other than the party being checked.
- Treat the feature list as the diff's index, not as the project's only memory. A pull request per feature, with the row flip in the same commit, gives a reviewer the claim and the code together. Issues and Jira both fail at that, and it is the part worth keeping.

One thing the lecture gets better than the Anthropic article: gating beats self-certification. Anthropic's agents mark their own features passing, and that is the weakest link in the practice the article reports. The lecture is right that something other than the author should decide. It needs an author-independent something, though, and a CI job reading a file in the repo is that, where a rule in an instruction file is not.

## References

- [Lecture 08: the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-08-why-feature-lists-are-harness-primitives/)
- [Lecture 08: code examples](https://github.com/walkinglabs/learn-harness-engineering/tree/main/docs/en/lectures/lecture-08-why-feature-lists-are-harness-primitives) - `feature-list-validator.ts` (reads a JSON array, injects three demo rows, never writes, exits 0 when it flags), `feature_list.json` (one entry, prose checklist, boolean state), `pass-gate-policy.md` (four prose conditions), `index.md` (four topics, none runnable)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) - Schluntz and Zhang, 2024-12-19; the article cited for "core data structure", with zero occurrences of `feature list`, `core data structure`, `scope`, `scheduler`, or `verifier`. What it does argue is closer to this note's position than to the lecture's: workflows with validation gates between steps, an evaluator separate from the generator, and "gaining ground truth from the environment at each step (such as tool call results or code execution)". Its ACI advice, "Poka-yoke your tools. Change the arguments so that it is harder to make mistakes", with the worked example of forcing absolute file paths, is the same move as putting the gate in CI instead of in CLAUDE.md
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - the feature list file, the initializer/coding split, "over 200 features", and "Self-verify all features. Only mark features as 'passing' after careful testing"
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) - "Plans are treated as first-class artifacts", "Repository-local, versioned artifacts... are all it can see", and the CI job that validates the knowledge base; no occurrence of `externalize`, `feature list`, or `scope`
- [Design by Contract - Bertrand Meyer](https://www.goodreads.com/en/book/show/946106.Object_Oriented_Software_Construction) - preconditions, postconditions, and invariants, which is what a feature row is: the postcondition is the verification command and the invariant is the set of features that must stay `passing`. The analogy cuts against the lecture, because a contract is enforced by the runtime that runs the assertion, not by the file that states it. [Eiffel's introduction to the idea](https://www.eiffel.com/values/design-by-contract/introduction/) has the sentence to apply to a list nobody checks: with assertion checking off, assertions "have no effect at all, serving as a form of standardized comments"
- [`docs/en/resources/templates/feature_list.json`](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/resources/templates/feature_list.json) - the course template, object-rooted, which the lecture's validator rejects
- [`project01/strong-harness/`](../project01/strong-harness/) - four features, one session, object-rooted list with `status` and prose `evidence`, agent-certified pass
- [Issue #94](https://github.com/walkinglabs/learn-harness-engineering/issues/94) - the open question about whether the 2026-10-20 revert intended to drop the illustrative labeling; lists L06, L07, L08, L09, L10, L12
- [Commit 9fb48af](https://github.com/walkinglabs/learn-harness-engineering/commit/9fb48af904acdf3d56171e5479e2e1101b95d173) - added the `Illustrative Example` heading, the "assumed for explanation" blockquote, and for this lecture the engineering-guideline blockquote, and deleted the 45% and 60-80% figures
- [Commit 95c42ed](https://github.com/walkinglabs/learn-harness-engineering/commit/95c42ed) - "Revert course evidence audit across all 15 languages", 2026-10-20
- [PR #92](https://github.com/walkinglabs/learn-harness-engineering/pull/92) - merged 2026-10-22; restored the heading and the minute figures while removing the 45% sentence
- [jq manual: `--exit-status`](https://jqlang.github.io/jq/manual/#invoking-jq) - the flag that makes a filter's result into an exit code
- [How Google Tests Software - Whittaker, Arbon, Carollo](https://www.goodreads.com/en/book/show/11525213.How_Google_Tests_Software) - every feature row needs a verifiable check because the party that wrote the code is the party that evaluates it; small, medium, and large tests as a cost ladder for picking which check a row gets. Also what the lecture's self-certification lacks: the book separates the SWE who builds from the SET and TE roles who test, and its [test pyramid](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html) puts most checks at the unit level. Appendix B, "Test Tours for Chrome," is the closest thing in the book to a feature list, and it is a set of directed explorations rather than a status table
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/), [lecture03](../lecture03/), [lecture04](../lecture04/), [lecture05](../lecture05/), [lecture06](../lecture06/), [lecture07](../lecture07/)
