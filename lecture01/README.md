# Lecture 01 — SWE-bench & the Harness

## SWE-bench Verified

[SWE-bench](https://www.swebench.com/) evaluates AI models on real-world software engineering: ~2,300 GitHub issues from Python repos (Django, pylint, sympy, etc.). The model gets the issue + codebase and must produce a passing patch.

**SWE-bench Verified** is a human-filtered subset of ~500 issues, curated for clarity and reliability.

### Data contamination

Since these are public GitHub issues, they may appear in model training data — a model that "solved" an issue during training isn't really solving it at test. Two mitigations:

1. **Instruction-based** — ask the model to ignore prior knowledge. Weak: you're trusting it to un-learn what it learned.
2. **Temporal holdout** — only use issues filed after the model's training cutoff. Stronger: the model genuinely hasn't seen them.

Modern SWE-bench runs enforce temporal holdout.

### Why it matters for this course

SWE-bench is a concrete example of a *harness* — a controlled evaluation environment (Docker + test suite). The course's concept of a harness is exactly this: the infrastructure that makes evaluation trustworthy.

## Exercises

Three approaches to the same brief ("build a 2D retro game maker"):

- `superpowers-2d-retro-game-maker/` — Harness Superpowers walkthrough
- `grill-me-2d-retro-game-maker/` — grilled by an AI agent
- `solo-2d-retro-game-maker/` — built entirely on my own
