---
name: verify-before-done
description: Use before claiming any coding task is finished, fixed, working, or passing — after editing code, changing config, adding dependencies, or fixing a bug. Forces running builds/tests/linters and reading the real output instead of assuming success.
---

# Verify Before Done

You may only say a task is **done / fixed / working** after you have evidence from this session.
"It should work" is not evidence.

## Checklist

1. **Find the project's real commands** — read `package.json` scripts, `Makefile`, `pyproject.toml`,
   `go.mod`, CI files (`.github/workflows/*`), or the README. Do not guess command names.
2. **Run, in order, whatever exists:**
   - type check / compile (`tsc --noEmit`, `go build ./...`, `cargo check`, `mypy`)
   - linter (`eslint`, `ruff`, `golangci-lint`)
   - tests — the ones touching your change first, then the full suite if it is fast
   - the app itself, if the change is user-visible (start it, hit the endpoint, load the page)
3. **Read the actual output.** Look for errors, warnings, skipped tests, and "0 tests ran".
   Exit code 0 with no tests executed is not a pass.
4. **Reproduce the original problem** (for bug fixes) and confirm it no longer happens.
5. **Re-read your diff** (`git diff`). Remove debug prints, leftover TODOs, unrelated edits.

## If something fails
- Fix it and re-run. Do not report partial success as success.
- If it fails for a reason unrelated to your change, say so explicitly and show the error.

## If you cannot verify
Say exactly what was **not** verified and why, e.g.:
> "Code compiles and unit tests pass. I could not run the integration tests (needs a database), so the
> migration is untested."

Never write "fixed", "works", or "all tests pass" without having run them.

## Final report format
- **Changed:** files and what changed
- **Verified:** commands run + result
- **Not verified:** what and why (or "nothing")

## Memory
If verification revealed something non-obvious (a flaky test, a required env var, a slow step),
save it with `mem_save` — title + What / Why / Where / Lesson.
