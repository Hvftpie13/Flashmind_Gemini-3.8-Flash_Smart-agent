# Contributing

Thanks for helping make flashmind better!

## Setup

```bash
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent
cd flashmind
npm test
```

No dependencies to install — Node.js 18+ is enough.

## Where to change things

| You want to change… | Edit | Then run |
|---|---|---|
| The rules | `GEMINI.md` | `npm run build:configs` (regenerates `AGENTS.md` and `configs/`) |
| A client config | `scripts/build-configs.js` | `npm run build:configs` |
| A skill | `skills/<name>/SKILL.md` | `npm test` |
| The fallback memory server | `server/index.js` | `npm test` |

Never edit `AGENTS.md` or files in `configs/` by hand — they are generated and the tests check they are in sync.

## Adding a skill

1. Create `skills/<name>/SKILL.md` with frontmatter:
   ```yaml
   ---
   name: <name>            # must match the folder name
   description: Use when ... # say exactly when it should trigger, with keywords
   ---
   ```
2. Reference it in the "Coding skills" section of `GEMINI.md`.
3. Add it to the expected list in `test/config.js`.
4. `npm run build:configs && npm test`.

Keep skills short, concrete, and checkable. A good skill tells the agent *what to do next* and *how to know it worked*.

## Pull requests

- One topic per PR, with a clear description of what and why.
- `npm test` must pass.
- Update `CHANGELOG.md` under an "Unreleased" heading.
