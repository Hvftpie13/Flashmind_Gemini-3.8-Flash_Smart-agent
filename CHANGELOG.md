# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-26

### Added
- Stale-memory rule: agents now call `mem_review` at the start of a task, verify overdue memories against the
  current code, then mark them reviewed (`mark_reviewed`), update them, or supersede them. Old preferences and
  decisions can no longer silently steer new code.
- "Updating" guide in the README: how to update every install method without creating duplicates.
- `.gitattributes` to keep line endings consistent (LF) across Windows, macOS, and Linux.

### Changed
- Repository renamed to `Flashmind_Gemini-3.8-Flash_Smart-agent`; all links and generated configs now use the new name.
- README rewritten with an npm quickstart and a clearer layout.

### Fixed
- Cross-platform CI: tests now handle Windows (CRLF) line endings.

## [1.0.0] - 2026-10-26

### Added
- Engram integration as the primary persistent memory (`engram mcp --tools=agent`) in the Gemini CLI extension
  and in generated configs for Antigravity, Gemini CLI, Cursor, Windsurf, VS Code, Claude Code, Codex, and OpenCode.
- Memory + no-hallucination rules (`GEMINI.md`, mirrored to `AGENTS.md`, Cursor `.mdc`, VS Code instructions, Windsurf rules).
- Four coding Agent Skills: `plan-first`, `no-invented-code`, `systematic-debugging`, `verify-before-done`.
- Zero-dependency fallback memory MCP server (`server/index.js`) with BM25 search, dedupe, secret rejection,
  and `memory_verify`.
- Gemini CLI slash commands: `/memory:recall`, `/memory:save`, `/memory:forget`, `/memory:summary`, `/verify`.
- Installers for macOS/Linux (`install.sh`) and Windows (`install.ps1`) that install Engram, the extension, and the skills.
- Python example using Gemini 3.8 Flash with `thinking_level: high` and memory tools.
- Tests: end-to-end MCP smoke test and config/skill validation; CI on Linux, macOS, and Windows.

[1.1.0]: https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent/releases/tag/v1.1.0
[1.0.0]: https://github.com/Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent/releases/tag/v1.0.0
