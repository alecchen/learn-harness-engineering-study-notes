---
layout: default
permalink: /
---

# Learn Harness Engineering - Study Notes

My learning progress and sharing space for the [Learn Harness Engineering](https://walkinglabs.github.io/learn-harness-engineering/en/) course.

This repo tracks my work through each lecture — coding exercises, experiments, and discussions I want to share with the study group.

To serve this repo locally, run `bundle exec jekyll serve` and open <http://127.0.0.1:4000/>.

## Lectures

- [`lecture01/`](lecture01/)
- [`lecture02/`](lecture02/)
- [`lecture03/`](lecture03/)
- [`lecture04/`](lecture04/)
- [`lecture05/`](lecture05/)
- More lectures to come...

## Projects

- [`project01/`](project01/) - weak vs strong harness: the same Electron app built two ways

## Errata

| Lecture | Issue | Status |
|---------|-------|--------|
| Lecture 01 | "HumanLayer: Skill Issue — Harness Engineering for Coding Agents" link in the Further Reading section returns 404<br>[old](https://humanlayer.dev/articles/harness-engineering-for-coding-agents/) => [new](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents) | [![PR #59 state](https://img.shields.io/github/pulls/detail/state/walkinglabs/learn-harness-engineering/59)](https://github.com/walkinglabs/learn-harness-engineering/pull/59) |
| Lecture 01 | "SWE-bench Leaderboard" link in the Further Reading section points to the [Verified leaderboard](https://www.swebench.com/verified.html), whose "this configuration" link (mini-SWE-agent swebench.yaml) returns 404 after the config was moved<br>[old](https://github.com/swe-agent/mini-swe-agent/blob/main/src/minisweagent/config/extra/swebench.yaml) => [new](https://github.com/swe-agent/mini-swe-agent/blob/main/src/minisweagent/config/benchmarks/swebench.yaml) | [![PR #58 state](https://img.shields.io/github/pulls/detail/state/SWE-bench/swe-bench.github.io/58)](https://github.com/SWE-bench/swe-bench.github.io/pull/58) |
| Lecture 03 | Atomicity bullet suggested `git stash` as a rollback — stash is suspend/resume, not discard; a failed commit produces nothing to roll back. The bullet conflated the two failure points | [![PR #65 state](https://img.shields.io/github/pulls/detail/state/walkinglabs/learn-harness-engineering/65)](https://github.com/walkinglabs/learn-harness-engineering/pull/65) |
| Lecture 03 | Consistency bullet equates consistency with "run tests / lint" — the DB meaning is invariants holding between valid states; it also assumes the agent verifies its own work, contradicting lecture02's separate-doer-from-checker | Open |
| All lectures | Case-study numbers with no source to verify them against — "Real-World Example" / "A Real Transformation Story" / "A Team's Real Story" sections, plus inline percentages attributed to Anthropic or OpenAI research. English lectures checked: L01 (60% better context efficiency), L02 (20% → 60% → 80% → 80-100%), L03 (30 microservices, 70% intervention), L04 (50 → 600 lines, 45% → 72%, 60% → 95%), L05 (58% → 100%, 43% → 8%), L06 (31% completion, 60% rebuild time), L07 (37% completion, 87.5% vs 37.5%), L08 (60-80% startup time, 45% completion), L11 (30-50% session time), L12 (20% of every Friday, week-by-week decay). L13 and L14 attribute theirs to named disclosures and sources; L09 and L10 carry none | [![Issue #73 state](https://img.shields.io/github/issues/detail/state/walkinglabs/learn-harness-engineering/73)](https://github.com/walkinglabs/learn-harness-engineering/issues/73) [![PR #75 state](https://img.shields.io/github/pulls/detail/state/walkinglabs/learn-harness-engineering/75)](https://github.com/walkinglabs/learn-harness-engineering/pull/75) |
| Lecture 04 | zh-TW translation residue: Simplified characters surviving in the Traditional Chinese page (明确 / 记住 / 稀释 / 编寫 / 参考), a duplicated sentence in the contradiction section, 專題文件 not matching 主題文件 elsewhere | [![PR #72 state](https://img.shields.io/github/pulls/detail/state/walkinglabs/learn-harness-engineering/72)](https://github.com/walkinglabs/learn-harness-engineering/pull/72) |
| Harness designs | `claude-code` presents the five-layer compaction pipeline and seven permission modes as current fact; both come from VILA Lab's analysis of v2.1.88, and the permission-mode list has since changed | [![PR #74 state](https://img.shields.io/github/pulls/detail/state/walkinglabs/learn-harness-engineering/74)](https://github.com/walkinglabs/learn-harness-engineering/pull/74) |
| All lectures (i18n) | Switching language loses the section anchor. Heading ids are auto-slugged from the translated heading text, so each locale gets ids in its own language (`實際案例`, `praxisbeispiel`); VitePress carries the current hash across a locale switch, finds no matching id, and falls back to `window.scrollTo(0, 0)`. PR applies build-time canonical English ids to every locale (105 pages) without editing any markdown. 15 pages where a locale's heading count differs from English keep their localized ids and are listed as known drift | [![PR #76 state](https://img.shields.io/github/pulls/detail/state/walkinglabs/learn-harness-engineering/76)](https://github.com/walkinglabs/learn-harness-engineering/pull/76) |
