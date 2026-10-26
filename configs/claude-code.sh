#!/usr/bin/env bash
claude mcp add --transport stdio --scope user engram -- engram mcp --tools=agent
claude mcp add --transport stdio --scope user flashmind -- npx -y github:Hvftpie13/Flashmind_Gemini-3.8-Flash_Smart-agent
# Then copy AGENTS.md into your project's CLAUDE.md (or ~/.claude/CLAUDE.md)
