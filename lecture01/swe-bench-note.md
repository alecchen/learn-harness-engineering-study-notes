# SWE-bench Verified — Note

[SWE-bench](https://www.swebench.com/) is a benchmark that evaluates AI models on real-world software engineering tasks: ~2,300 GitHub issues from popular Python repos (Django, pylint, sympy, etc.). The model is given the issue text + codebase and must produce a patch that passes the repo's tests.

**SWE-bench Verified** is a human-filtered subset of ~500 issues, curated to remove ambiguous, under-specified, or flaky test cases for more reliable evaluation.

## Data contamination concern

Since these issues are public GitHub data, they may appear in training corpora — a model that "solved" an issue during training isn't really solving it at test time. Two common mitigations:

1. **Instruction-based** — ask the model to ignore any prior knowledge of the issue. Weak: you're trusting the model to set aside what it learned.
2. **Temporal holdout** — only use issues filed after the model's training data cutoff. Stronger: the model genuinely hasn't seen them.

Modern SWE-bench runs track issue dates and model training cutoffs to enforce temporal holdout.

## Relevance to Learn Harness Engineering

Lecture 01 ("SWE-bench & the Harness") introduces the concept of a *harness* — a controlled evaluation environment. SWE-bench is a concrete example: the harness is the Docker container + test suite that validates a model's patch. Understanding the benchmark helps make sense of what the course means by "evaluation harness."
