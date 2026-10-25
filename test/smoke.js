// End-to-end smoke test: start the server over stdio and exercise every tool.
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flashmind-test-"));
const proc = spawn(process.execPath, [path.join(__dirname, "..", "server", "index.js")], {
  env: { ...process.env, FLASHMIND_DIR: dir },
  stdio: ["pipe", "pipe", "ignore"],
});

let buf = "";
let nextId = 1;
const waiting = new Map();
proc.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const msg = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    const w = waiting.get(msg.id);
    if (w) {
      waiting.delete(msg.id);
      w(msg);
    }
  }
});

function rpc(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
const call = async (name, args) => (await rpc("tools/call", { name, arguments: args })).result;
const txt = (r) => r.content.map((c) => c.text).join("\n");

(async () => {
  const init = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } });
  assert.equal(init.result.serverInfo.name, "flashmind");
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

  const tools = (await rpc("tools/list")).result.tools.map((t) => t.name);
  assert.deepEqual(tools.sort(), ["memory_context", "memory_delete", "memory_get", "memory_list", "memory_save", "memory_search", "memory_update", "memory_verify"].sort());

  assert.match(txt(await call("memory_context", {})), /empty/);

  const s1 = txt(await call("memory_save", { content: "The user is Budi, a backend developer in Bali", category: "user", source: "user" }));
  assert.match(s1, /Saved/);
  const id = s1.match(/\[(m_[0-9a-f]+)\]/)[1];
  await call("memory_save", { content: "Project AI Learning Assistant is built with Antigravity and Gemini 3.8 Flash", category: "project", tags: ["ai-learning"] });

  assert.match(txt(await call("memory_save", { content: "the user is budi, a backend developer in bali" })), /Already exists/);

  const r = txt(await call("memory_search", { query: "who is the user" }));
  assert.match(r, /Budi/);
  assert.match(txt(await call("memory_search", { query: "rendang recipe" })), /NO_MATCH/);

  assert.match(txt(await call("memory_verify", { claim: "the user works as a backend developer" })), /SUPPORTED_CANDIDATES/);
  assert.match(txt(await call("memory_verify", { claim: "user lives in Jakarta and owns a cat" })), /NO_EVIDENCE/);

  const sec = await call("memory_save", { content: "my API key is AIzaSyA1234567890abcdefghijklmnopqrstu" });
  assert.equal(sec.isError, true);

  assert.match(txt(await call("memory_update", { id, content: "The user is Budi, a backend developer in Denpasar" })), /Denpasar/);
  assert.match(txt(await call("memory_context", {})), /## user/);
  assert.match(txt(await call("memory_list", { category: "project" })), /Antigravity/);
  assert.match(txt(await call("memory_delete", { id })), /Deleted/);
  assert.equal((await call("memory_get", { id })).isError, true);

  const prompts = (await rpc("prompts/list")).result.prompts.map((p) => p.name);
  assert.ok(prompts.includes("anti_hallucination_rules"));
  const rules = (await rpc("prompts/get", { name: "anti_hallucination_rules" })).result;
  assert.match(rules.messages[0].content.text, /make things up/i);

  assert.equal((await rpc("nope/method")).error.code, -32601);

  const stored = JSON.parse(fs.readFileSync(path.join(dir, "memory.json"), "utf8"));
  assert.equal(stored.memories.length, 1);

  console.log("✅ smoke: all tool tests passed");
  proc.kill();
  fs.rmSync(dir, { recursive: true, force: true });
})().catch((e) => {
  console.error("❌", e);
  proc.kill();
  process.exit(1);
});
