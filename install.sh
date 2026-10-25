#!/usr/bin/env bash
# flashmind installer (macOS / Linux)
#   ./install.sh                          → install Engram + Gemini CLI extension + skills
#   ./install.sh antigravity-cli cursor   → also run `engram setup` for those agents
# Agents supported by `engram setup`: gemini-cli antigravity-cli cursor windsurf vscode-copilot
#                                      claude-code codex opencode kiro qwen pi kilocode
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Get it from https://nodejs.org (v18+)." >&2
  exit 1
fi

install_engram() {
  if command -v brew >/dev/null 2>&1; then
    echo "→ Installing Engram with Homebrew..."
    brew install gentleman-programming/tap/engram && return 0
  fi
  if command -v go >/dev/null 2>&1; then
    echo "→ Installing Engram with go install..."
    go install github.com/Gentleman-Programming/engram/v3/cmd/engram@latest
    export PATH="$(go env GOPATH)/bin:$PATH"
    if command -v engram >/dev/null 2>&1; then
      echo "ℹ️  Make sure $(go env GOPATH)/bin is on your PATH."
      return 0
    fi
  fi
  echo "→ Downloading the Engram binary from GitHub Releases..."
  local os arch tag ver tmp dest
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  case "$(uname -m)" in
    x86_64|amd64) arch=amd64 ;;
    arm64|aarch64) arch=arm64 ;;
    *) echo "❌ Unsupported architecture: $(uname -m)"; return 1 ;;
  esac
  tag="$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/Gentleman-Programming/engram/releases/latest | sed 's#.*/tag/##')"
  ver="${tag#v}"
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/Gentleman-Programming/engram/releases/download/${tag}/engram_${ver}_${os}_${arch}.tar.gz" | tar xz -C "$tmp"
  dest="$HOME/.local/bin"
  mkdir -p "$dest"
  mv "$tmp/engram" "$dest/engram"
  chmod +x "$dest/engram"
  rm -rf "$tmp"
  export PATH="$dest:$PATH"
  echo "ℹ️  Engram installed to $dest — add it to your PATH if it is not there yet."
}

if command -v engram >/dev/null 2>&1; then
  echo "✓ Engram already installed: $(engram version 2>/dev/null || echo ok)"
else
  install_engram
fi

node "$DIR/test/smoke.js"

if command -v gemini >/dev/null 2>&1; then
  echo "→ Installing the Gemini CLI extension (Engram + flashmind + rules + skills)..."
  gemini extensions link "$DIR" || gemini extensions install "$DIR"
else
  echo "ℹ️  Gemini CLI not found, skipping the extension."
fi

# Agent Skills: ~/.agents/skills is read by Gemini CLI (user scope); copy elsewhere if your agent uses another folder
mkdir -p "$HOME/.agents/skills"
cp -R "$DIR/skills/." "$HOME/.agents/skills/"
echo "✓ Skills copied to ~/.agents/skills"

for agent in "$@"; do
  echo "→ engram setup $agent"
  engram setup "$agent" || echo "⚠️  engram setup $agent failed"
done

cat <<EOF

✅ Done.
- Engram:    primary memory (~/.engram/engram.db)
- flashmind: fallback memory ($(node "$DIR/server/index.js" --path))
- Skills:    plan-first, no-invented-code, systematic-debugging, verify-before-done

Other apps: copy the config from configs/<app>/ and the rules from AGENTS.md.
Or run:     ./install.sh antigravity-cli cursor vscode-copilot
EOF
