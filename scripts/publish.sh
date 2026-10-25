#!/usr/bin/env bash
# Create the GitHub repo and push flashmind in one go.
# Requires: git, and either the GitHub CLI (`gh auth login`) or an empty repo you created on github.com.
#   ./scripts/publish.sh <github-username> [public|private]
set -e
USER="${1:?Usage: ./scripts/publish.sh <github-username> [public|private]}"
VIS="${2:-public}"
REPO="flashmind"
DESC="Make Gemini 3.8 Flash remember, plan, verify — and stop making things up. Engram memory + coding skills + no-hallucination rules for Gemini CLI, Antigravity, Cursor, VS Code, Claude Code and any MCP client."
TOPICS="mcp,gemini,gemini-cli,gemini-flash,antigravity,engram,memory,agent-skills,ai-agents,anti-hallucination"

cd "$(dirname "$0")/.."

# Fill in the username everywhere and re-run the tests
node scripts/build-configs.js "$USER"
npm test

git add -A
git commit -qm "chore: set GitHub username to $USER" || true

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh repo create "$USER/$REPO" --"$VIS" --description "$DESC" --homepage "https://github.com/$USER/$REPO" --source . --remote origin --push
  gh repo edit "$USER/$REPO" --add-topic "$TOPICS"
  git tag -a v1.0.0 -m "flashmind v1.0.0" 2>/dev/null || true
  git push origin v1.0.0
  gh release create v1.0.0 --title "flashmind v1.0.0" --notes-file CHANGELOG.md
else
  echo "GitHub CLI not logged in — pushing to an existing empty repo instead."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$USER/$REPO.git"
  git push -u origin main
  git tag -a v1.0.0 -m "flashmind v1.0.0" 2>/dev/null || true
  git push origin v1.0.0
  echo
  echo "Now on github.com set the description and topics:"
  echo "  Description: $DESC"
  echo "  Topics:      ${TOPICS//,/ }"
fi

echo "✅ https://github.com/$USER/$REPO"
