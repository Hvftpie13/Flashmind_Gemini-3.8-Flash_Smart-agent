#!/usr/bin/env bash
claude mcp add --transport stdio --scope user engram -- engram mcp --tools=agent
claude mcp add --transport stdio --scope user flashmind -- npx -y github:GITHUB_USERNAME/flashmind
# Then copy AGENTS.md into your project's CLAUDE.md (or ~/.claude/CLAUDE.md)
