<div align="center">

# ⚡🧠 flashmind

**Make Gemini 3.8 Flash remember, plan, verify — and stop making things up.**

Persistent memory via [Engram](https://github.com/Gentleman-Programming/engram) · 4 coding skills · no-hallucination rules
<br>One plugin for Gemini CLI, Antigravity, Cursor, VS Code, Windsurf, Claude Code, Codex, OpenCode — and any MCP client.

[![test](https://github.com/hvftpie13/flashmind/actions/workflows/test.yml/badge.svg)](https://github.com/hvftpie13/flashmind/actions/workflows/test.yml)
![license](https://img.shields.io/badge/license-MIT-blue)
![node](https://img.shields.io/badge/node-%E2%89%A518-green)
![deps](https://img.shields.io/badge/dependencies-0-brightgreen)

</div>

---

## Why

Fast models are great coding agents until they:

- **forget** yesterday's decisions and re-ask the same questions every session,
- **invent** functions, flags, and package APIs that do not exist,
- say **"fixed!"** without ever running the tests.

flashmind fixes that with three layers that work together:

| Layer | What it does | Always on? |
|---|---|---|
| **Memory** — Engram over MCP | Searches past decisions/bugs at the start of every task, saves new ones automatically, summarizes each session | ✅ |
| **Rules** — `GEMINI.md` / `AGENTS.md` | Separate fact / assumption / unknown, cite sources, never invent identifiers | ✅ |
| **Skills** — `skills/*/SKILL.md` | Step-by-step playbooks loaded only when the task needs them | on demand |

Because Engram stores everything in one local SQLite database, **every app shares the same memory**:
a decision made in Antigravity is remembered in Gemini CLI and Cursor.

## Skills

| Skill | Triggers when… | What it enforces |
|---|---|---|
| [`plan-first`](skills/plan-first/SKILL.md) | a task has 3+ steps or touches several files | read code → short plan → one verified step at a time → stay in scope |
| [`no-invented-code`](skills/no-invented-code/SKILL.md) | using any function, package, flag, config key, or API | check the repo and the installed version before using anything |
| [`systematic-debugging`](skills/systematic-debugging/SKILL.md) | errors, failing tests, crashes, wrong output | memory → reproduce → root cause with evidence → minimal fix → prove it → save the lesson |
| [`verify-before-done`](skills/verify-before-done/SKILL.md) | before saying "done", "fixed", or "works" | run build / lint / tests, read the real output, report what was *not* verified |

## Quick start

### 1. Install (Engram + plugin + skills)

**macOS / Linux**
```bash
git clone https://github.com/hvftpie13/flashmind
cd flashmind
./install.sh antigravity-cli        # optional: add more agents, e.g. cursor vscode-copilot
```

**Windows (PowerShell)**
```powershell
git clone https://github.com/hvftpie13/flashmind
cd flashmind
.\install.ps1 antigravity-cli
```

The installer:
1. installs Engram if missing (Homebrew → `go install` → GitHub release binary),
2. runs the test suite,
3. installs the Gemini CLI extension (if `gemini` is on your PATH),
4. copies the skills to `~/.agents/skills`,
5. runs `engram setup <agent>` for every agent you pass.

<details>
<summary><b>Install Engram manually</b></summary>

```bash
brew install gentleman-programming/tap/engram                             # macOS / Linux
go install github.com/Gentleman-Programming/engram/v3/cmd/engram@latest   # any OS (Go 1.24+)
```
Windows without Go: download `engram_<version>_windows_amd64.zip` from
[Engram releases](https://github.com/Gentleman-Programming/engram/releases) and put `engram.exe` on your PATH.
Check with `engram version`.
</details>

### 2. Gemini CLI — one command

```bash
gemini extensions install https://github.com/hvftpie13/flashmind
gemini -m gemini-3.8-flash
```

That single extension brings the Engram MCP server, the fallback memory server, the rules, the skills,
and the slash commands. Check with `/mcp`.

### 3. Other apps

Copy the ready-made files from [`configs/`](configs):

| App | MCP config | Rules |
|---|---|---|
| **Antigravity** | `antigravity/mcp_config.json` → `~/.gemini/config/mcp_config.json` | `AGENTS.md` → Rules / `~/.gemini/GEMINI.md` |
| **Cursor** | `cursor/mcp.json` → `~/.cursor/mcp.json` | `cursor/flashmind.mdc` → `~/.cursor/rules/` |
| **Windsurf** | `windsurf/mcp_config.json` → `~/.codeium/windsurf/mcp_config.json` | `windsurf/global_rules.md` → `~/.codeium/windsurf/memories/` |
| **VS Code (Copilot)** | `vscode/mcp.json` → `.vscode/mcp.json` | `vscode/flashmind.instructions.md` → your user `prompts/` folder |
| **Claude Code** | `bash configs/claude-code.sh` | `AGENTS.md` → `CLAUDE.md` |
| **Codex** | `codex/config.toml` → `~/.codex/config.toml` | `AGENTS.md` |
| **OpenCode** | `opencode/opencode.json` → `~/.config/opencode/opencode.json` | `AGENTS.md` |
| Any MCP client | `mcp.json` | `AGENTS.md` |

The core config is always the same:

```json
{
  "mcpServers": {
    "engram":    { "command": "engram", "args": ["mcp", "--tools=agent"] },
    "flashmind": { "command": "npx",    "args": ["-y", "github:hvftpie13/flashmind"] }
  }
}
```

> Prefer Engram's own installer? `engram setup gemini-cli | antigravity-cli | cursor | windsurf | vscode-copilot | claude-code | codex | opencode`
> writes its config and memory protocol. flashmind's rules and skills complement it.

## The memory rules

> At the start of a task, search Engram for relevant memories; after an important decision, save it to Engram.

1. **Start of task** — `mem_context`, then `mem_search` with the task's keywords.
2. **Save automatically** with `mem_save` after fixing a bug, making an architecture/design decision,
   discovering something about the project, or changing config/dependencies —
   formatted as *title + What / Why / Where / Lesson*.
3. "remember", "before", "last time", "yesterday" → search memory before answering.
4. **End of session / after compaction** — `mem_session_summary`.
5. Never store passwords, API keys, or tokens.

Full text: [`GEMINI.md`](GEMINI.md) (identical copy in [`AGENTS.md`](AGENTS.md)).

## Slash commands (Gemini CLI)

| Command | Does |
|---|---|
| `/memory:recall <topic>` | Summarize what memory knows about a topic — and what it doesn't |
| `/memory:save <fact>` | Save to memory without duplicates |
| `/memory:forget <thing>` | Find and delete matching memories |
| `/memory:summary` | Write a session summary to memory |
| `/verify` | Audit the last answer claim-by-claim and rewrite it with sources |

## Recommended Gemini 3.8 Flash settings

| Setting | Value |
|---|---|
| Model | `gemini-3.8-flash` |
| Thinking level | `high` for coding agents (`low` / `medium` / `high`; `minimal` is not supported) |
| System instruction | contents of `GEMINI.md` |
| Grounding | Google Search, when available |

API example with memory: [`examples/python/chat.py`](examples/python/chat.py)

```bash
pip install google-genai
export GEMINI_API_KEY=...
python examples/python/chat.py
```

## Fallback memory server

If Engram is not installed, the rules switch to flashmind's own zero-dependency MCP server
(`server/index.js`, Node.js ≥ 18). It provides `memory_context`, `memory_search` (BM25 ranking),
`memory_save` (dedupe + secret rejection), `memory_get`, `memory_list`, `memory_update`, `memory_delete`,
and `memory_verify` (returns `NO_EVIDENCE` so the model admits it does not know).

```bash
node server/index.js --path               # where memories live (~/.flashmind/memory.json)
node server/index.js --export > backup.json
node server/index.js --import backup.json
```

Override the location with `FLASHMIND_DIR` or `FLASHMIND_FILE`.

## Project layout

```
flashmind/
├── gemini-extension.json   # Gemini CLI extension manifest (Engram + flashmind MCP)
├── GEMINI.md / AGENTS.md   # rules: memory + no hallucination + skill routing
├── skills/                 # 4 Agent Skills (SKILL.md each)
├── commands/               # Gemini CLI slash commands (TOML)
├── server/index.js         # fallback memory MCP server, zero dependencies
├── configs/                # generated configs for every client
├── scripts/                # build-configs.js, publish.sh
├── examples/python/        # Gemini API + memory example
├── test/                   # smoke test + config/skill validation
└── install.sh / install.ps1
```

## Development

```bash
npm test                                  # server smoke test + config/skill validation
npm run build:configs                     # regenerate configs/ and AGENTS.md from GEMINI.md
node scripts/build-configs.js <username>  # also fill in your GitHub username everywhere
```

Edit `GEMINI.md`, never `AGENTS.md` or `configs/` directly — they are generated.
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Honest limits

No plugin removes hallucinations completely. flashmind **reduces** them by making the model search before
answering, separate facts from assumptions, verify code against the repo, and say "I don't know".
Always review important output.

## Privacy

All memory stays **local** (`~/.engram/` and `~/.flashmind/`). Nothing is sent anywhere by flashmind.
The rules forbid storing secrets, and the fallback server rejects text that looks like passwords,
API keys, tokens, card numbers, or national ID numbers.

## Credits & license

MIT © flashmind contributors.
[Engram](https://github.com/Gentleman-Programming/engram) is a separate project by Gentleman Programming, under its own license.
