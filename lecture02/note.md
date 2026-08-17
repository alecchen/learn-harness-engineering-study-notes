# CLAUDE.md

* https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-md-management
* https://github.com/drona23/claude-token-efficient
* [Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
** Don't use /init or auto-generate your CLAUDE.md
* [A CLAUDE.md That Follows](https://anthropic.skilljar.com/claude-code-in-action/486929)

# Progress

* [mattpocock/skills /handoff](https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md)
* [planning-with-files](https://github.com/OthmanAdi/planning-with-files)

# Verification

* [Trust It: Verifying Unsupervised Runs](https://anthropic.skilljar.com/claude-code-in-action/486938)

## Examples

* bash: bats
* python: pylint, pytest, unittest
* cpp: cppcheck, clang-tidy, gtest, gmock, gmake
* ci: gitlab-ci-local, github actions
* github pages: jekyll build

# Key Takeaways

> Among the five subsystems, the feedback subsystem usually has the lowest investment and highest return. Get your verification commands right first.
Not always, writing gtest/gmock in large cpp eda project is difficult


# Exercises

1. twlapi TWOPC-896 lack of gtest, working on it
2. verification > CLAUDE.md > progress.md > environment > tools
3. I wrote a confluence tool to access page view and status, but agents needs to know it's cloud or data center version, and the api version, access point and the returns json layout, it's a Gulf of Execution, and I also need to let agents know what is right/wrong in order to finish task

# References

* [Claude Code in Actions](https://anthropic.skilljar.com/claude-code-in-action)
