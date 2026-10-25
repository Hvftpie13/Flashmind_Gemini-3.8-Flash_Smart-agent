---
name: systematic-debugging
description: Use when something is broken — an error message, stack trace, failing test, crash, wrong output, "it doesn't work", build failure, or unexpected behavior. Finds the root cause with evidence before changing code, then records the fix in Engram memory.
---

# Systematic Debugging

Do not guess-and-patch. Find the cause with evidence, fix it once, prove it is fixed.

## 1. Check memory first
`mem_search` with the error message, module name, and symptom. This bug (or a cousin) may already be solved.

## 2. Reproduce
- Get the exact error: full message, stack trace, command, input, environment.
- Reproduce it yourself with the smallest possible command or test. If you cannot reproduce it, say so and
  collect more information (logs, versions, steps) instead of guessing.
- When possible, write a failing test that captures the bug.

## 3. Locate
- Read the stack trace from the top frame **in project code**, not library internals.
- Read the real code at that location. Do not reason about code you have not opened.
- Narrow down: add a temporary log/assert, use `git log -p` / `git bisect` for regressions,
  or comment out halves until the failure moves.

## 4. Find the root cause
Write one sentence: **"It fails because ___."** It must be backed by something you observed
(a printed value, a log line, a reproduced condition) — not a hunch.
Ask "why?" until you reach a cause, not a symptom
(e.g. "null user" → "token expired" → "refresh not awaited").

## 5. Fix
- Fix the cause, with the smallest change that does it.
- Do not silence the error (empty `catch`, `|| true`, `// @ts-ignore`, `skip`) unless that *is* the correct fix and you explain why.
- Remove temporary logs.

## 6. Prove it
- The reproduction from step 2 now passes.
- Related tests still pass (see `verify-before-done`).

## 7. Save the lesson
`mem_save` with:
```
Title: <short bug name>
What: <symptom>
Why: <root cause>
Where: <file:line / module>
Lesson: <how to avoid or spot it next time>
```

## When stuck
After two failed hypotheses, stop and summarize: what you tried, what you observed, what you now suspect.
Ask the user for the missing piece rather than trying random changes.
