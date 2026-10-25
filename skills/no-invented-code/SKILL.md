---
name: no-invented-code
description: Use whenever writing or suggesting code that calls a function, file, module, package, CLI flag, config key, environment variable, or API endpoint — especially third-party libraries, SDKs, or framework features. Prevents hallucinated APIs by checking the repo and docs before using anything.
---

# No Invented Code

Every identifier you use must exist. If you have not seen it, check it — or say you have not.

## Inside the project
Before calling or importing something from the codebase:
- Search for it (`grep -rn`, file search, IDE symbols). Confirm the **exact** name, signature, and export.
- Read the file it lives in. Check argument order, return type, and whether it is async.
- Before referencing a file path, confirm the file exists.
- Use the project's existing helpers instead of inventing new ones with similar names.

## Third-party libraries
- Check the **installed version** first: `package.json` / lockfile, `requirements.txt` / `pyproject.toml`,
  `go.mod`, `Cargo.toml`. APIs change between major versions.
- Verify the API against one of: the library source in `node_modules` / site-packages / module cache,
  official docs for that version (use web search when available), or the project's existing usage.
- If you cannot verify, say so: *"I believe the option is `X` in v4, but I could not confirm it — please check."*

## Adding a dependency
- Confirm the package name exists and is the right one (watch for look-alike/typosquat names).
- Prefer what the project already uses. Mention every new dependency in your report.

## Commands, flags, config keys, env vars
- Check `--help`, the tool's docs, or existing scripts/config before using a flag or key.
- Never invent environment variables; find where the code reads them.

## Red flags — stop and check
- "This library probably has a method for that."
- A function name that sounds right but you have not seen in this codebase.
- Copying a pattern from a different framework or an older major version.
- Mixing APIs from two different SDKs.

## Memory
If you discover a version-specific gotcha (renamed API, breaking change, wrong docs),
save it with `mem_save` so it is not rediscovered next session.
