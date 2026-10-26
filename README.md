<div align="center">

# ⚡🧠 flashmind — Gemini 3.8 Flash Smart Agent

**Make Gemini 3.8 Flash remember, plan, verify — and eliminate hallucinations.**

Persistent cross-tool memory via [Engram](https://github.com/Gentleman-Programming/engram) · 4 proactive coding skills · strict anti-hallucination rules.  
One plugin for **Gemini CLI**, **Antigravity**, **Cursor**, **VS Code**, **Windsurf**, and **Claude Code**.

[![npm version](https://img.shields.io/npm/v/flashmind.svg)](https://www.npmjs.com/package/flashmind)
[![test](https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent/actions/workflows/test.yml/badge.svg)](https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent/actions/workflows/test.yml)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![node](https://img.shields.io/badge/node-%E2%89%A518-blue.svg)](package.json)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## 💡 Why Flashmind?

Fast AI models are incredible coding partners until they:
- **Forget** architecture decisions and re-ask the same questions every new session.
- **Invent** imaginary packages, deprecated functions, and fake CLI flags.
- **Say "fixed!"** without ever executing tests or verifying their changes.

**Flashmind solves this with three integrated layers:**

1. 🧠 **Shared Memory (Engram MCP)**: Automatically recalls previous project bugs and decisions at the start of a task, and saves new lessons before closing. Reviews overdue memories (`mem_review`) against the current code before trusting them. All editors share one local database.
2. 🛡️ **Anti-Hallucination Rules (`GEMINI.md`)**: Enforces citing code evidence, separating facts from assumptions, and admitting unknowns.
3. 🎯 **Proactive Agent Skills**: Step-by-step playbooks loaded on-demand for planning, debugging, and verification.

---

## 🚀 Quick Start

### Option 1: Use directly via NPX (Recommended)

Add to your tool's MCP configuration (`mcp.json` / `mcp_config.json`):

```json
{
  "mcpServers": {
    "flashmind": {
      "command": "npx",
      "args": ["-y", "flashmind"]
    }
  }
}
```

### Option 2: Gemini CLI Extension

Install in one command:

```bash
gemini extensions install https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent
gemini -m gemini-3.8-flash
```

### Option 3: Automated Full Installer (Engram + Skills + Rules)

Includes the Engram binary, all Agent Skills, and automated client configuration:

**macOS / Linux:**
```bash
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent flashmind
cd flashmind
./install.sh antigravity-cli
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent flashmind
cd flashmind
.\install.ps1 antigravity-cli
```

---

## 🧩 Client Configuration

Pre-configured files are available in [`configs/`](configs):

| Client / Editor | MCP Configuration File | Rules Location |
|---|---|---|
| **Antigravity** | `configs/antigravity/mcp_config.json` → `~/.gemini/config/mcp_config.json` | `AGENTS.md` → Rules / `~/.gemini/GEMINI.md` |
| **Cursor** | `configs/cursor/mcp.json` → `~/.cursor/mcp.json` | `configs/cursor/flashmind.mdc` → `~/.cursor/rules/` |
| **VS Code (Copilot)** | `configs/vscode/mcp.json` → `.vscode/mcp.json` | `configs/vscode/flashmind.instructions.md` |
| **Windsurf** | `configs/windsurf/mcp_config.json` → `~/.codeium/windsurf/mcp_config.json` | `configs/windsurf/global_rules.md` |
| **Claude Code** | Run `bash configs/claude-code.sh` | `AGENTS.md` → `CLAUDE.md` |
| **Any MCP Client** | `configs/mcp.json` | `AGENTS.md` |

---

## 🎯 Proactive Agent Skills

Loaded automatically when relevant to your current prompt:

| Skill | Trigger | Purpose |
|---|---|---|
| [`plan-first`](skills/plan-first/SKILL.md) | Tasks with 3+ steps or multi-file edits | Read code → Draft plan → Execute one verified step at a time. |
| [`no-invented-code`](skills/no-invented-code/SKILL.md) | Writing new functions or imports | Always verify symbols and installed versions against local source. |
| [`systematic-debugging`](skills/systematic-debugging/SKILL.md) | Errors, test failures, or crashes | Check past memories → Reproduce → Root-cause → Minimal fix → Prove it. |
| [`verify-before-done`](skills/verify-before-done/SKILL.md) | Before declaring "fixed" or "done" | Run linter/tests and report exact terminal results. |

---

## ⚡ Slash Commands (Gemini CLI)

| Command | Action |
|---|---|
| `/memory:recall <query>` | Search and summarize what memory knows about a topic |
| `/memory:save <fact>` | Save a verified decision or discovery |
| `/memory:forget <item>` | Delete outdated memories |
| `/memory:summary` | Generate and record a session summary |
| `/verify` | Audit the last answer claim-by-claim with source evidence |

---

## 🔄 Updating

Updating never touches your memories: they live in `~/.engram/` and `~/.flashmind/`. See [CHANGELOG.md](CHANGELOG.md) for what changed.

| How you installed | How to update |
|---|---|
| **Gemini CLI extension** | `gemini extensions update flashmind` (or `gemini extensions update --all`). It updates in place, so do **not** run `install` again. If it cannot find the source (e.g. you installed under the old repo name), run `gemini extensions uninstall flashmind`, then install again from the current URL. |
| **NPX** | Restart your editor. If it keeps running an old version, clear npx's cached copy with `npm cache clean --force` and restart. |
| **Automated installer / git clone** | `cd flashmind && git pull`, then run `./install.sh` (macOS/Linux) or `.\install.ps1` (Windows) again. Skills are overwritten by name, not duplicated. |
| **Manual config files** | Re-copy from [`configs/`](configs) and **replace**, never append (see below). |
| **Engram** | `brew upgrade engram`, or re-run `go install github.com/Gentleman-Programming/engram/v3/cmd/engram@latest`. |

**Avoiding duplicates**

- **One entry per server.** Keep a single `"flashmind"` and a single `"engram"` key in your MCP config. Edit the existing entry; do not paste a second copy.
- **Replace rules, don't append.** For Cursor, Windsurf and VS Code, overwrite the file with the same name. For a shared file such as `~/.gemini/GEMINI.md` or `CLAUDE.md`, wrap the rules in markers the first time you paste them, and replace everything between the markers on each update:
  ```
  <!-- flashmind:start -->
  ...contents of AGENTS.md...
  <!-- flashmind:end -->
  ```
- **One copy of the skills.** If you copied `skills/` into more than one folder (for example `~/.gemini/skills` and `~/.agents/skills`), keep one and delete the other.
- **Start a new session** after updating so the agent loads the new rules and skills.

---

## 🔒 Privacy & Local-First

- **100% Local**: All memories are stored on your machine (`~/.engram/` or `~/.flashmind/`). Zero telemetry or external API calls.
- **Secret Redaction**: Automatically rejects passwords, bearer tokens, API keys, and sensitive credentials.
- **Zero Dependencies**: Lightweight and fast with 0 third-party runtime npm packages.

---

## 📄 License

MIT © [Flashmind Contributors](https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent).
