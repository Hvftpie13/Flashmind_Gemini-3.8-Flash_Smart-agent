// Generates MCP configs and rule files for every client from a single source (GEMINI.md).
// Usage: node scripts/build-configs.js [GITHUB_USERNAME]
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const USER = process.argv[2] || process.env.GITHUB_USERNAME || "GITHUB_USERNAME";
const REPO = "flashmind";
const OUT = path.join(ROOT, "configs");
const rules = fs.readFileSync(path.join(ROOT, "GEMINI.md"), "utf8");

const ENGRAM = { command: "engram", args: ["mcp", "--tools=agent"] };
const FLASH = { command: "npx", args: ["-y", `github:${USER}/${REPO}`] };
const FLASH_LOCAL = { command: "node", args: ["/PATH/TO/flashmind/server/index.js"] };

const write = (rel, content) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof content === "string" ? content : JSON.stringify(content, null, 2) + "\n");
};
const std = (flash = FLASH) => ({ mcpServers: { engram: ENGRAM, flashmind: flash } });

fs.rmSync(OUT, { recursive: true, force: true });

// Generic (Claude Desktop, Kiro, Qwen, any MCP client)
write("mcp.json", std());
write("mcp.local.json", std(FLASH_LOCAL));
// Antigravity → ~/.gemini/config/mcp_config.json
write("antigravity/mcp_config.json", std());
// Gemini CLI without the extension → ~/.gemini/settings.json
write("gemini-cli/settings.json", std());
// Cursor → ~/.cursor/mcp.json + ~/.cursor/rules/flashmind.mdc
write("cursor/mcp.json", std());
write("cursor/flashmind.mdc", `---\ndescription: Engram memory, coding skills, no hallucination\nalwaysApply: true\n---\n\n${rules}`);
// Windsurf → ~/.codeium/windsurf/mcp_config.json + memories/global_rules.md
write("windsurf/mcp_config.json", std());
write("windsurf/global_rules.md", rules);
// VS Code → .vscode/mcp.json (uses "servers") + prompts/flashmind.instructions.md
write("vscode/mcp.json", {
  servers: { engram: { type: "stdio", ...ENGRAM }, flashmind: { type: "stdio", ...FLASH } },
});
write("vscode/flashmind.instructions.md", `---\napplyTo: "**"\n---\n\n${rules}`);
// Codex → ~/.codex/config.toml
const toml = (a) => "[" + a.map((x) => JSON.stringify(x)).join(", ") + "]";
write(
  "codex/config.toml",
  `# Add to ~/.codex/config.toml\n` +
    `[mcp_servers.engram]\ncommand = "engram"\nargs = ${toml(ENGRAM.args)}\n\n` +
    `[mcp_servers.flashmind]\ncommand = "npx"\nargs = ${toml(FLASH.args)}\n`
);
// OpenCode → ~/.config/opencode/opencode.json
write("opencode/opencode.json", {
  $schema: "https://opencode.ai/config.json",
  mcp: {
    engram: { type: "local", command: ["engram", ...ENGRAM.args], enabled: true },
    flashmind: { type: "local", command: [FLASH.command, ...FLASH.args], enabled: true },
  },
});
// Claude Code
write(
  "claude-code.sh",
  `#!/usr/bin/env bash\n` +
    `claude mcp add --transport stdio --scope user engram -- engram mcp --tools=agent\n` +
    `claude mcp add --transport stdio --scope user flashmind -- npx -y github:${USER}/${REPO}\n` +
    `# Then copy AGENTS.md into your project's CLAUDE.md (or ~/.claude/CLAUDE.md)\n`
);

fs.copyFileSync(path.join(ROOT, "GEMINI.md"), path.join(ROOT, "AGENTS.md"));

// Replace the username placeholder in docs too, when a real one is given
if (USER !== "GITHUB_USERNAME") {
  for (const f of ["README.md", "package.json", "CONTRIBUTING.md", "CHANGELOG.md"]) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, "utf8").replaceAll("GITHUB_USERNAME", USER));
  }
}
console.log(`Configs written to configs/ (GitHub user: ${USER})`);
