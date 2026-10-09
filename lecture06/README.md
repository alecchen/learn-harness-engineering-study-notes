---
layout: default
permalink: /lecture06/
---

# Lecture 06 - Why Initialization Needs Its Own Phase

Notes from [lecture 6](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-06-why-initialization-needs-its-own-phase/) (slug: *why-initialization-needs-its-own-phase*).

## Contents

- [Lecture summary](#lecture-summary)
- [Observations](#observations)
  - [Where the pieces came from](#where-the-pieces-came-from)
  - [What the lecture's own code examples show](#what-the-lectures-own-code-examples-show)
  - [Superpowers as a comparison point](#superpowers-as-a-comparison-point)
  - [The command convention](#the-command-convention)
- [What the lecture gets wrong](#what-the-lecture-gets-wrong)
  - [The title says every session, the body says the first one](#the-title-says-every-session-the-body-says-the-first-one)
  - [The two sources it merges have incompatible cadences](#the-two-sources-it-merges-have-incompatible-cadences)
  - [The template advice removes the need for the phase](#the-template-advice-removes-the-need-for-the-phase)
  - [Nothing in the prescription is enforced](#nothing-in-the-prescription-is-enforced)
  - [Infrastructure requirements arrive with the features](#infrastructure-requirements-arrive-with-the-features)
  - [The numbers have no source](#the-numbers-have-no-source)
  - [The lecture writes Make as if it were the default](#the-lecture-writes-make-as-if-it-were-the-default)
  - [A cited source argues the opposite](#a-cited-source-argues-the-opposite)
- [What I think](#what-i-think)
- [References](#references)

## Lecture summary

The opening scenario: you tell an agent "add a search feature" and it starts coding immediately. At minute twenty it discovers the test framework is misconfigured and spends ten more minutes on that, then finds the database migration script format is wrong. The feature lands, but most of the session went to figuring out how the project works rather than writing the feature.

The argument is that initialization and implementation optimize for different things. Implementation is measured by verified features. Initialization is measured by how cheaply every later session gets to work. Mix the two and the agent is solving a multi-objective problem with no stated priority, so it picks the visible objective. Infrastructure loses, because the cost is paid now and the benefit arrives later.

The prescription is a dedicated phase, and the first session does only initialization, no business feature code. Five outputs:

1. Runnable environment. Dependencies installed, the project starts.
2. Verifiable test framework, with at least one example test passing.
3. A startup readiness checklist document, listing the start commands and the current state.
4. An ordered task breakdown, each task with acceptance criteria.
5. A git commit as the checkpoint.

Completion is judged against four conditions, all required: can start, can test, can see progress, can pick up next steps. The acceptance checklist turns those into five boxes, that `make setup` succeeds from scratch, `make test` has at least one passing test, a fresh agent session can answer "how to run" and "how to test" from repo contents alone, a task breakdown with at least three tasks exists, and everything is committed.

The metrics it offers are time from start to first passing test, and success rate of subsequent sessions.

The lecture also recommends starting from a template rather than an empty directory, and gives an illustrative comparison. Mixed, where the agent scaffolded and implemented in the same session: session 2 spends about twenty minutes inferring structure, test framework, and build process. Dedicated: session 2 rebuilds in under three minutes and starts from the task list. Total rebuild time across the cycle is about 60% higher for the mixed approach, and the claim is that the investment comes back within three or four sessions.

The lecture discloses its own limits. An engineering guideline at the top says the numerical cutoffs are "adjustable teaching defaults, not experimentally established thresholds," and the illustrative example repeats that its scenario and values are assumed for explanation rather than observed.

## Observations

### Where the pieces came from

The references do not all say the same thing.

| Piece of the lecture | Source | What the source says |
|---|---|---|
| A separate first session for setup | [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | An initializer agent for "the very first agent session," then a coding agent for "every subsequent session." Its outputs are `init.sh`, `claude-progress.txt`, a feature list, and an initial commit. Dependency and framework selection are not among them. |
| Install deps, verify, print the start command | The course's own [`init.sh` template](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/resources/templates/index.md) | "The startup script. Runs dependency installation, verification, and prints the start command, all in one shot." A script the agent runs when it sits down. |
| Start from a scaffold, not an empty directory | [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) | The initial scaffold "was generated by Codex CLI using GPT-5, guided by a small set of existing templates." One commit, not a phase. |
| Build the harness incrementally | [HumanLayer](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents) | Listed under what did not work: "Trying to design the ideal harness configuration upfront before we'd even hit real failures." |
| Infrastructure as code | [Fowler](https://martinfowler.com/bliki/InfrastructureAsCode.html) | Continuous delivery of infrastructure like any software, "small changes rather than batches." Nothing about sequencing it ahead of application code. |

The Anthropic article is the only source with a dedicated first session in it, and the article is explicit about how thin that distinction is. A footnote reads: "We refer to these as separate agents in this context only because they have different initial user prompts. The system prompt, set of tools, and overall agent harness was otherwise identical." The origin it cites is the Claude 4 prompting guide's "a different prompt for the very first context window," which is a harness structure, not a lifecycle phase.

The article also puts `init.sh` on the other side of the line. The coding agent's job list includes reading it every session and running a basic end-to-end test before implementing a new feature. So the script is per-session even in the source that supplies the per-project split.

### What the lecture's own code examples show

The `code/` directory the page links holds four files, three of them substantive. `init.sh` does `npm install`, prints that the docs site is optional, and notes where project-specific startup would go. `initializer-output-checklist.md` asks five questions: is there a canonical startup command, a canonical verification command, a first progress artifact, a stable first commit, a visible feature surface for later runs.

Every question is about an artifact, and none of them requires a session boundary to produce. The checklist is a good one. It is also the same list a README's development section answers.

### Superpowers as a comparison point

The lecture reads like a development methodology, so the obvious comparison is a framework that is one. [Superpowers](https://github.com/obra/superpowers) runs seven phases, three of them before feature code: `brainstorming`, `using-git-worktrees`, and `writing-plans`. Only the second touches infrastructure, and its stated job is to verify a clean test baseline, which presupposes tests exist. Phase five is `test-driven-development`, which "Deletes code written before tests."

The run of it checked into [`lecture01/superpowers-2d-retro-game-maker/`](../lecture01/superpowers-2d-retro-game-maker/) is instructive. Its `package.json` still carries the npm default:

```json
"scripts": { "test": "echo \"Error: no test specified\" && exit 1" }
```

Playwright is in `devDependencies` and `test/game-test.mjs` exists, but `npm test` is not wired to it, and there is no Makefile. By the lecture's own acceptance checklist, that repo fails box two. The framework the lecture's process most resembles produced a project that does not meet the lecture's bar.

The sequencing in that run also went the other way. The design doc dated 10:24 fixes the test approach ("Format: single self-contained HTML file, canvas-based, zero dependencies. Validation: Playwright testing script"), the plan follows at 10:28, and the last task report lands at 14:38. Design and planning together took about four minutes against four hours of implementation, which is the ratio you would expect if the decisions were cheap and the artifacts were not.

### The command convention

`make setup`, `make dev`, `make test`, `make check` appear throughout, as if a Makefile were the default. It is not. Language-native entry points dominate: `npm test`, `cargo test`, `go test ./...`, `pytest`, `./gradlew test`, `mix test`. Make is dominant in C and C++, common in infra and polyglot repos, and usually present as a wrapper that forwards to the real tool rather than as the build system itself.

Make also has properties that make it a poor verification surface for an agent. Recipes run one shell per line, so a pipeline's exit code is swallowed unless `SHELL` and `pipefail` are set, which means a passing `make check` is not always evidence of passing checks. Tabs-versus-spaces is a silent failure. Bare `make` runs the first target rather than printing help. It is not standard on Windows.

Visible in [lecture02](../lecture02/), which carries both idioms side by side:

```
Tests: pytest tests/ -x
Type check: mypy src/ --strict
Lint: ruff check src/
Full verification: make check
```

Granular work gets language-native commands, and one aggregate name covers "is this done." The convention keeps both layers, and a wrapper is worth having only for the aggregate.

## What the lecture gets wrong

### The title says every session, the body says the first one

Session 2 in the worked example rebuilds in under three minutes and starts directly from the task list, which is not initializing. The body agrees with that reading: "The first session does only initialization," and the glossary calls it "The first phase in the agent's lifecycle." Only the title claims otherwise.

Nothing on the page is repeated per session. The only sentence with per-session language is about a consequence, "or every new session has to re-infer project conventions," which is the cost of not initializing once.

This matters because the title invites a reading that is both wasteful and false, that setup is re-run at the start of every session. A reader who takes the title at face value concludes the lecture is recommending something nobody does, and the body then contradicts the title rather than the reverse.

The phrase does describe something real, but it is not this. [Lecture 02](../lecture02/) has the per-session rhythm already: `PROGRESS.md` read at session start, updated at session end. Reading state is not running init. The lecture appears to have taken the session-boundary cadence and attached it to the wrong verb.

### The two sources it merges have incompatible cadences

The template's `init.sh` runs every session and takes seconds. Anthropic's initializer runs once and produces artifacts. The lecture takes the framing from the second and the content from the first, then presents the result as one thing.

The merge leaves the dependency-install bullet in the wrong list. Installing dependencies is per-session work, not initialization: you do it before every session, or you have already done it. Under the per-session reading the bullet is trivial, and under the one-time reading it is arbitrary, because there is no reason a project's dependencies should be installed exactly once in its life rather than whenever the lockfile changes.

The same merge explains the title. The title is the template's cadence and the body is the article's.

### The template advice removes the need for the phase

The lecture says both of these, in the same section:

- "Don't start from an empty directory. Use a project template."
- "Treat initialization as a dedicated phase. The first session does only initialization."

If a template is available, it has already produced the runnable environment and the test framework, and the phase has nothing left to do. If no template is available, the phase is the agent guessing at infrastructure with no prior knowledge to draw on, which is the condition the template advice exists to avoid.

The two are substitutes presented as complements, and OpenAI's account shows the substitution operating. Its scaffold was correct because it was "guided by a small set of existing templates." The knowledge came from previous projects, not from a dedicated session. A blank directory plus a dedicated session has no such memory, so the lecture has to reach for a template to make the phase work.

### Nothing in the prescription is enforced

The five outputs and the four conditions are all artifacts to create and conditions to check. There is no mechanism anywhere in the lecture. No hook, no CI gate, no script that fails.

[Lecture 03](../lecture03/) warns about exactly this: "A prompt rule is not enough, it is task-spec, it asks but does not enforce." And it is what [lecture 04](../lecture04/) spent a section establishing, and what [lecture 05](../lecture05/) applies to the clock-in ritual by moving the load step into a `SessionStart` hook. Lecture 06 gives a title that says "make the agent" but leaves the mechanism as a convention the agent has to elect to follow.

The gap has a cheap fix, and it is not a phase. A `SessionStart` hook that runs the verification command and injects the result only on failure enforces the part that must not be skipped, and it is genuinely per-session in a way the lecture's proposal is not. CI enforces the rest, on a clean machine, on every commit, which is a stronger guarantee than one agent running setup once.

### Infrastructure requirements arrive with the features

The lecture's opening scenario has the agent *discovering* that the test framework is misconfigured and that the migration script format is wrong, and its remedy is to decide all of that in advance. Those two positions are in tension.

The page contains no occurrence of *requirements*, *unknown*, *change later*, *refactor*, or *adapt*. Its model is predict-then-build. Its own argument against that is sitting in the accumulation paragraph: "Had you known earlier, you would have implemented it differently," and "The more code written up front, the more has to be torn down and redone later." That argument applies to guessed infrastructure exactly as it applies to feature code, and the lecture never turns it on itself.

Some of what the lecture lists is predictable with no domain knowledge: which command starts the project, which runs the tests, where the task list lives. None of that is stack-shaped. The rest is not predictable: whether the project needs a database, a queue, an auth layer, which linters catch real defects here, what the fixtures have to look like. Those are functions of code that does not exist yet.

Every practitioner source in the reference list agrees with the discovery reading. HumanLayer says it outright, OpenAI argues it about debt and documentation, Fowler argues it about infrastructure. The lecture is alone in the batch-upfront version.

### The numbers have no source

"the mixed approach's total rebuild time (across all sessions) was about 60% more," and "Time invested in initialization is fully recovered in the next 3-4 sessions." The second is stated as a key takeaway with no derivation at all.

The lecture discloses that its cutoffs are teaching defaults, which is to its credit, and the illustrative example repeats that its values are assumed. But the 60% figure is presented as a comparison result and the 3-4 session figure as a general law, and neither is marked as illustrative where it appears. This repo's own errata table already tracks the pattern across lectures, with lecture 06 listed under "Case-study numbers with no source to verify them against" ([issue #73](https://github.com/walkinglabs/learn-harness-engineering/issues/73)).

Given that "time from start to first passing test" is offered as the core metric, the missing measurement is conspicuous. The lecture never reports that number for either approach; it reports total rebuild time and a percentage instead.

### The lecture writes Make as if it were the default

The acceptance checklist is written entirely in `make` targets, and the example checklist document lists four of them. A reader with a Python, Node, Go, Rust, or JVM project will not have those targets, and the checklist gives no sign that this is one implementation among several.

The principle underneath is sound and worth keeping: one stable entry point that does not change when the stack does. How you get it is a local decision. Make is one way; `just`, `task`, and a package-manager script are others, and `just` in particular avoids Make's tab and exit-code problems.

The Python and Node commands inside the lecture's own example make this sharper. The startup checklist says `make setup` and the task breakdown says `pytest tests/test_auth.py all passing`, so the page mixes a Make wrapper idiom with raw ecosystem commands and never says which layer owns what.

### A cited source argues the opposite

HumanLayer is in the Further Reading list, and its stated philosophy is the inverse of this lecture's:

- What did not work: "Trying to design the ideal harness configuration upfront before we'd even hit real failures"
- Practice: "Starting simple and adding configuration only when the agent actually failed"
- "we don't go looking for problems to solve preemptively"

[Lecture 01](../lecture01/) reached the same conclusion from a different direction, that the harness "is built incrementally, driven by failures. You don't specify every check, every context document, every tool permission before the first agent run." The lecture cites a source that contradicts it and does not address the conflict.

## What I think

The problem the lecture names is real and the remedy is disproportionate.

Agents do default to visible progress. Tell one to build something from nothing and it writes the something, because the something is what you can look at and the scaffolding is not. That observation is correct and it is the strongest part of the page.

What does not follow is that the fix is a phase, or a session boundary, or a file with its own name. Three of the four readiness conditions are worth keeping as a handoff checklist, and one of them I would drop.

Can start and can test are the load-bearing ones, and they are what a README's development section is for. Can pick up next steps is real and belongs in a task list, which is project state and never lived in a README. Can see progress is the weakest, and [lecture 05](../lecture05/) already narrowed it: the status half of a progress file is the half the harness already covers, since session start loads a git snapshot and a fresh verification run is ground truth while a recorded result is a claim from a session that no longer exists. I keep no progress file, and lecture 05 is where that argument was made.

The standard worth carrying out of this lecture is that the setup documentation is verified rather than promised. A README says how to build; it does not establish that building works, and that gap is why "install the dependencies" is ambiguous between pip, uv, poetry, and conda, and why stale setup docs are endemic. The lecture's contribution is to insist the commands be run before they are written down. The property belongs to the documentation rather than to a phase, and the mechanism that enforces it already exists: CI runs setup from a clean machine on every commit and fails if it does not work. The lecture does not lean on that precedent, and it is the strongest version of its own argument.

What I would do instead, and largely do:

- Keep a startup script, in the shape the course's own template already has. `INSTALL_CMD`, `VERIFY_CMD`, `START_CMD` in one file, run every session, where the cost is seconds rather than a session. The cadence is the per-session one the title wanted, and it is honest about being per-session.
- Put the commands in the entry file. `AGENTS.md` or `CLAUDE.md` is read every session by the harness; a separately named checklist file is not, and needs another document to point at it.
- Write the task list, and give it a deletion rule when the task closes. This is the part of the lecture that is not documentation and not covered by any README convention.
- Enforce the parts that must not be skipped with a hook or CI, per [lecture 03](../lecture03/) and [lecture 04](../lecture04/).
- Let infrastructure arrive with the features that need it. Test framework before the first test, lint after there is style to enforce, CI after there is something worth running it on, a database when a feature needs persistence.

One case does fit the lecture's prescription: large project, a real template to start from, a toolchain nobody on the team knows, expected to run for many sessions. There the amortization math works and the template supplies the knowledge the phase cannot conjure. The lecture presents a configuration as the default.

The instruction to not start from an empty directory is the part of this lecture I would keep unconditionally. The rest is a name for practices that already exist under other names, attached to a session boundary that nothing requires.

## References

- [Lecture 06: the course page](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-06-why-initialization-needs-its-own-phase/)
- [Lecture 06: code examples](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/lectures/lecture-06-why-initialization-needs-its-own-phase/code/) - `init.sh` (a per-session `npm install`), `init-check.ts`, and `initializer-output-checklist.md` with its five artifact questions
- [Harness templates](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/en/resources/templates/index.md) - the source of the lecture's `init.sh` shape, alongside `claude-progress.md`, `feature_list.json`, `session-handoff.md`, and `clean-state-checklist.md`
- Related notes: [lecture01](../lecture01/), [lecture02](../lecture02/), [lecture03](../lecture03/), [lecture04](../lecture04/), [lecture05](../lecture05/)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) - published 2025-11-26; the initializer and coding agents, `init.sh`, the 200+ feature list, and the footnote that the two agents differ only in their initial prompt
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) - "We started with an empty git repository," the Codex-generated scaffold "guided by a small set of existing templates," and the garbage-collection argument for continuous small increments over batched cleanup
- [HumanLayer: Skill Issue: Harness Engineering for Coding Agents](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents) - the source the lecture cites for harness engineering and which argues against designing the harness upfront
- [Infrastructure as Code - Martin Fowler](https://martinfowler.com/bliki/InfrastructureAsCode.html) - definition files under version control, delivered continuously; no sequencing of infrastructure ahead of application code
- [SWE-agent: Agent-Computer Interfaces](https://github.com/princeton-nlp/SWE-agent) - the agent-computer interface paper; cited for initialization, relevant to tool design rather than to project startup
- [Superpowers](https://github.com/obra/superpowers) - the seven-phase workflow, including `using-git-worktrees` verifying a clean test baseline and `test-driven-development` deleting code written before tests
- [`lecture01/superpowers-2d-retro-game-maker/`](../lecture01/superpowers-2d-retro-game-maker/) - this repo's Superpowers run, whose `package.json` still carries the npm default test script and whose test file is unwired
- [just](https://github.com/casey/just) - a command runner without Make's tab sensitivity, per-line shell, or exit-code swallowing
