// Checks that Engram is wired into every config, rules are complete and in sync, and skills are valid.
"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.join(__dirname, "..");

// Normalisasi \r\n (Windows CRLF) ke \n (LF) agar tidak gagal di OS Windows
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

// --- Gemini CLI extension manifest
const ext = JSON.parse(read("gemini-extension.json"));
assert.equal(ext.name, "flashmind");
assert.deepEqual(ext.mcpServers.engram, { command: "engram", args: ["mcp", "--tools=agent"] });
assert.ok(ext.mcpServers.flashmind);
assert.equal(ext.version, JSON.parse(read("package.json")).version, "version mismatch with package.json");

// --- Rules
const rules = read("GEMINI.md").trim();
for (const s of [
  "At the start of a task, search Engram for relevant memories; after an important decision, save it to Engram.",
  "## Memory (Engram)",
  "mem_context", "mem_search", "mem_save", "mem_session_summary",
  "What / Why / Where / Lesson",
  "Never save passwords, API keys, or tokens to memory.",
]) {
  assert.ok(rules.includes(s), "rules missing: " + s);
}

assert.equal(read("AGENTS.md").trim(), rules, "AGENTS.md out of sync — run: npm run build:configs");

// --- Client configs
for (const f of [
  "configs/mcp.json", "configs/antigravity/mcp_config.json", "configs/gemini-cli/settings.json",
  "configs/cursor/mcp.json", "configs/windsurf/mcp_config.json",
]) {
  const c = JSON.parse(read(f));
  assert.deepEqual(c.mcpServers.engram.args, ["mcp", "--tools=agent"], f);
  assert.ok(c.mcpServers.flashmind, f);
}
assert.equal(JSON.parse(read("configs/vscode/mcp.json")).servers.engram.command, "engram");
assert.deepEqual(JSON.parse(read("configs/opencode/opencode.json")).mcp.engram.command, ["engram", "mcp", "--tools=agent"]);
assert.ok(read("configs/codex/config.toml").includes("[mcp_servers.engram]"));

for (const f of ["configs/cursor/flashmind.mdc", "configs/vscode/flashmind.instructions.md", "configs/windsurf/global_rules.md"]) {
  assert.ok(read(f).includes(rules), f + " out of sync with GEMINI.md");
}

// --- Skills: skills/<name>/SKILL.md with name == folder and a real description
const skillsDir = path.join(ROOT, "skills");
const skills = fs.readdirSync(skillsDir).filter((d) => fs.statSync(path.join(skillsDir, d)).isDirectory());
assert.deepEqual(skills.sort(), ["no-invented-code", "plan-first", "systematic-debugging", "verify-before-done"]);

for (const name of skills) {
  const md = read(`skills/${name}/SKILL.md`);
  // Mendukung baik \n maupun \r\n
  const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, `${name}: missing frontmatter`);
  
  const get = (k) => {
    const m = fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, "m"));
    return m ? m[1].trim() : undefined;
  };

  assert.equal(get("name"), name, `${name}: frontmatter name must match folder`);
  const desc = get("description") || "";
  assert.ok(desc.length >= 80 && desc.length <= 1024, `${name}: description length ${desc.length}`);
  assert.ok(/^Use (when|for|before|whenever)/.test(desc), `${name}: description should say when to use it`);
  assert.ok(rules.includes("`" + name + "`"), `${name}: not referenced in GEMINI.md`);
}

console.log(`✅ config: Engram wired into all clients, rules in sync, ${skills.length} skills valid`);
