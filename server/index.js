#!/usr/bin/env node
/**
 * flashmind — zero-dependency MCP server (stdio): persistent memory + no-hallucination guardrails.
 * Fallback memory for when Engram is not installed.
 *
 * Requires only Node.js >= 18. Works with any MCP client: Gemini CLI, Antigravity, Cursor,
 * VS Code, Windsurf, Claude Desktop/Code, Codex, OpenCode, ...
 *
 * Data location (first match wins):
 *   1. env FLASHMIND_FILE  (full path to a JSON file)
 *   2. env FLASHMIND_DIR   (folder; file = memory.json)
 *   3. ~/.flashmind/memory.json
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const SERVER_NAME = "flashmind";
const SERVER_VERSION = "1.0.0";
const SUPPORTED_PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const CATEGORIES = ["user", "preference", "project", "fact", "decision", "lesson", "other"];
const CONFIDENCE = ["verified", "user_stated", "inferred"];

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
function memoryFilePath() {
  if (process.env.FLASHMIND_FILE) return path.resolve(process.env.FLASHMIND_FILE);
  const dir = process.env.FLASHMIND_DIR
    ? path.resolve(process.env.FLASHMIND_DIR)
    : path.join(os.homedir(), ".flashmind");
  return path.join(dir, "memory.json");
}

const FILE = memoryFilePath();

function emptyStore() {
  return { version: 1, memories: [] };
}

function load() {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.memories)) return emptyStore();
    return data;
  } catch (err) {
    if (err.code === "ENOENT") return emptyStore();
    // Corrupt file: keep a backup instead of silently overwriting it.
    try {
      fs.copyFileSync(FILE, FILE + ".corrupt-" + Date.now());
    } catch (_) {}
    return emptyStore();
  }
}

function save(store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tmp, FILE); // atomic on the same filesystem
}

function now() {
  return new Date().toISOString();
}

function newId() {
  return "m_" + crypto.randomBytes(5).toString("hex");
}

function normalize(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Search (BM25-lite, no dependencies)
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(
  (
    "yang dan di ke dari ini itu untuk dengan pada adalah atau juga saya aku kamu " +
    "the a an of to in on for and or is are was were be it this that with as at by"
  ).split(" ")
);

function tokenize(text) {
  return normalize(text)
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function docText(m) {
  return [m.content, m.category, (m.tags || []).join(" "), m.source || ""].join(" ");
}

function search(store, query, { limit = 8, category } = {}) {
  const qTokens = [...new Set(tokenize(query))];
  let pool = store.memories;
  if (category) pool = pool.filter((m) => m.category === category);
  if (!qTokens.length) return [];

  const docs = pool.map((m) => ({ m, tokens: tokenize(docText(m)) }));
  const N = docs.length || 1;
  const avgLen = docs.reduce((a, d) => a + d.tokens.length, 0) / N || 1;
  const df = {};
  for (const q of qTokens) {
    df[q] = docs.filter((d) => d.tokens.some((t) => t === q || t.startsWith(q))).length;
  }

  const k1 = 1.2;
  const b = 0.75;
  const scored = [];
  for (const d of docs) {
    let score = 0;
    let matched = 0;
    for (const q of qTokens) {
      const tf = d.tokens.filter((t) => t === q || t.startsWith(q)).length;
      if (!tf) continue;
      matched++;
      const idf = Math.log(1 + (N - df[q] + 0.5) / (df[q] + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.tokens.length) / avgLen)));
    }
    // Exact phrase match → bonus
    if (normalize(d.m.content).includes(normalize(query))) score += 2;
    if (score > 0) {
      scored.push({ m: d.m, score, coverage: matched / qTokens.length });
    }
  }
  scored.sort((a, b2) => b2.score - a.score);
  return scored.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
function fmt(m, extra = "") {
  const tags = m.tags && m.tags.length ? ` #${m.tags.join(" #")}` : "";
  const src = m.source ? ` | source: ${m.source}` : "";
  return `[${m.id}] (${m.category}, ${m.confidence}${src}) ${m.content}${tags}${extra}`;
}

function text(t) {
  return { content: [{ type: "text", text: t }] };
}

function errorResult(t) {
  return { content: [{ type: "text", text: "ERROR: " + t }], isError: true };
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => normalize(t).replace(/^#/, "")).filter(Boolean))].slice(0, 12);
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: "memory_context",
    description:
      "(Engram fallback.) Call ONCE at the start of a task when the mem_* tools are not available. Returns a digest of key memories " +
      "(user profile, preferences, active projects, decisions) so you do not re-ask what is already known.",
    inputSchema: {
      type: "object",
      properties: {
        max_items: { type: "integer", minimum: 1, maximum: 100, description: "Default 30" },
      },
    },
  },
  {
    name: "memory_search",
    description:
      "Search memories by keyword. Call this BEFORE answering anything about the user, their projects, " +
      "or things that may have been discussed before. If nothing is found, say you do not know — do not make it up.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords or a question" },
        category: { type: "string", enum: CATEGORIES },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      required: ["query"],
    },
  },
  {
    name: "memory_save",
    description:
      "Save a durable fact: user identity/preferences, project details, decisions, lessons from mistakes. " +
      "Never store your guesses as 'verified'. Never store passwords, API keys, tokens, card/account numbers, or ID numbers.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "One self-contained, concise fact" },
        category: { type: "string", enum: CATEGORIES, description: "Default: fact" },
        tags: { type: "array", items: { type: "string" } },
        source: {
          type: "string",
          description: "Where the fact came from: 'user', a URL, a file path, or a document name",
        },
        confidence: {
          type: "string",
          enum: CONFIDENCE,
          description:
            "verified = checked against a source; user_stated = the user said it; inferred = your conclusion (avoid)",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "memory_get",
    description: "Read one full memory by id.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "memory_list",
    description: "List memories (newest first), optionally filtered by category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: CATEGORIES },
        limit: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
  },
  {
    name: "memory_update",
    description:
      "Update an existing memory (e.g. a fact changed). Prefer updating over creating duplicates.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        content: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
        tags: { type: "array", items: { type: "string" } },
        source: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE },
      },
      required: ["id"],
    },
  },
  {
    name: "memory_delete",
    description: "Delete a memory. Only when the user asks or the fact is proven wrong.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "memory_verify",
    description:
      "Check a claim against memory before stating it as fact. " +
      "Returns candidate memories and a status: SUPPORTED_CANDIDATES (compare the content yourself) or NO_EVIDENCE.",
    inputSchema: {
      type: "object",
      properties: { claim: { type: "string" } },
      required: ["claim"],
    },
  },
];

const SECRET_PATTERNS = [
  /\b(?:\d[ -]?){14,19}\b/, // card / national ID / long account numbers
  /\bAIza[0-9A-Za-z_-]{30,}\b/, // Google API key
  /\b(sk|pk|ghp|gho|xox[abp])[-_][0-9A-Za-z_-]{16,}\b/i, // common token formats
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(password|passwd|kata ?sandi)\s*[:=]\s*\S+/i,
];

function looksSecret(s) {
  return SECRET_PATTERNS.some((re) => re.test(s));
}

const handlers = {
  memory_context({ max_items = 30 }) {
    const store = load();
    if (!store.memories.length) {
      return text(
        "Memory is empty. Nothing is known yet about the user or their projects.\n" +
          "Do not assume — ask when needed, then save important facts with memory_save."
      );
    }
    const priority = { user: 0, preference: 1, project: 2, decision: 3, lesson: 4, fact: 5, other: 6 };
    const items = [...store.memories]
      .sort(
        (a, b) =>
          (priority[a.category] ?? 9) - (priority[b.category] ?? 9) ||
          (b.access_count || 0) - (a.access_count || 0) ||
          String(b.updated_at).localeCompare(String(a.updated_at))
      )
      .slice(0, max_items);
    const grouped = {};
    for (const m of items) (grouped[m.category] ||= []).push(m);
    let out = `Memory (${store.memories.length} total, showing ${items.length}):\n`;
    for (const cat of Object.keys(grouped)) {
      out += `\n## ${cat}\n` + grouped[cat].map((m) => "- " + fmt(m)).join("\n") + "\n";
    }
    out +=
      "\nNote: 'inferred' = uncertain. Use memory_search for more detail. " +
      "If a memory conflicts with what the user says now, follow the user and update the memory.";
    return text(out);
  },

  memory_search({ query, category, limit = 8 }) {
    if (!query || !String(query).trim()) return errorResult("query is required");
    const store = load();
    const hits = search(store, query, { limit, category });
    if (!hits.length) {
      return text(
        `NO_MATCH: no memory matches "${query}".\n` +
          "This information is NOT known yet. Do not make it up — say you do not know, check another source, or ask the user."
      );
    }
    // track access for memory_context ranking
    const ids = new Set(hits.map((h) => h.m.id));
    for (const m of store.memories) if (ids.has(m.id)) m.access_count = (m.access_count || 0) + 1;
    try {
      save(store);
    } catch (_) {}
    const lines = hits.map(
      (h) => "- " + fmt(h.m, `  (score ${h.score.toFixed(2)}, coverage ${Math.round(h.coverage * 100)}%)`)
    );
    return text(
      `${hits.length} memories found for "${query}":\n${lines.join("\n")}\n\n` +
        "Only use content that actually answers the question. A keyword match is not evidence."
    );
  },

  memory_save({ content, category = "fact", tags = [], source = "", confidence = "user_stated" }) {
    content = String(content || "").trim();
    if (!content) return errorResult("content is required");
    if (content.length > 2000) return errorResult("content is too long (max 2000 characters). Split it into several facts.");
    if (looksSecret(content)) {
      return errorResult("Rejected: this looks like a secret (password/API key/token/card number). Secrets are never stored.");
    }
    if (!CATEGORIES.includes(category)) category = "other";
    if (!CONFIDENCE.includes(confidence)) confidence = "user_stated";

    const store = load();
    const norm = normalize(content);
    const dup = store.memories.find((m) => normalize(m.content) === norm);
    if (dup) {
      dup.tags = cleanTags([...(dup.tags || []), ...tags]);
      if (source) dup.source = source;
      dup.updated_at = now();
      save(store);
      return text(`Already exists (not duplicated), metadata updated: ${fmt(dup)}`);
    }

    // Warn about near-duplicates so the model prefers updating
    const similar = search(store, content, { limit: 3 }).filter((h) => h.coverage >= 0.6);

    const m = {
      id: newId(),
      content,
      category,
      tags: cleanTags(tags),
      source: String(source || "").slice(0, 300),
      confidence,
      created_at: now(),
      updated_at: now(),
      access_count: 0,
    };
    store.memories.push(m);
    save(store);
    let out = `Saved: ${fmt(m)}`;
    if (similar.length) {
      out +=
        "\n\nSimilar to existing memories — if this is an update, update or delete the old one:\n" +
        similar.map((h) => "- " + fmt(h.m)).join("\n");
    }
    return text(out);
  },

  memory_get({ id }) {
    const m = load().memories.find((x) => x.id === id);
    if (!m) return errorResult(`id ${id} not found`);
    return text(JSON.stringify(m, null, 2));
  },

  memory_list({ category, limit = 50 }) {
    let list = load().memories;
    if (category) list = list.filter((m) => m.category === category);
    list = [...list].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, limit);
    if (!list.length) return text("No memories" + (category ? ` in category ${category}.` : "."));
    return text(list.map((m) => "- " + fmt(m)).join("\n"));
  },

  memory_update({ id, content, category, tags, source, confidence }) {
    const store = load();
    const m = store.memories.find((x) => x.id === id);
    if (!m) return errorResult(`id ${id} not found`);
    if (content !== undefined) {
      content = String(content).trim();
      if (!content) return errorResult("content must not be empty");
      if (looksSecret(content)) return errorResult("Rejected: this looks like a secret.");
      m.content = content;
    }
    if (category && CATEGORIES.includes(category)) m.category = category;
    if (Array.isArray(tags)) m.tags = cleanTags(tags);
    if (source !== undefined) m.source = String(source).slice(0, 300);
    if (confidence && CONFIDENCE.includes(confidence)) m.confidence = confidence;
    m.updated_at = now();
    save(store);
    return text(`Updated: ${fmt(m)}`);
  },

  memory_delete({ id }) {
    const store = load();
    const i = store.memories.findIndex((x) => x.id === id);
    if (i < 0) return errorResult(`id ${id} not found`);
    const [m] = store.memories.splice(i, 1);
    save(store);
    return text(`Deleted: ${fmt(m)}`);
  },

  memory_verify({ claim }) {
    if (!claim || !String(claim).trim()) return errorResult("claim is required");
    const hits = search(load(), claim, { limit: 5 }).filter((h) => h.coverage >= 0.34);
    if (!hits.length) {
      return text(
        `NO_EVIDENCE: no memory supports the claim:\n"${claim}"\n` +
          "Do not present it as fact. Options: (1) verify with another source/tool, " +
          "(2) state it labelled as 'unverified', or (3) ask the user."
      );
    }
    return text(
      `SUPPORTED_CANDIDATES for the claim:\n"${claim}"\n\n` +
        hits.map((h) => "- " + fmt(h.m)).join("\n") +
        "\n\nRead them and decide: do they SUPPORT, CONTRADICT, or NOT RELATE to the claim? " +
        "A keyword match is not evidence. 'inferred' memories are weak evidence."
    );
  },
};

// ---------------------------------------------------------------------------
// Prompts (for clients that do not read GEMINI.md / AGENTS.md)
// ---------------------------------------------------------------------------
function loadRules() {
  const candidates = [path.join(__dirname, "..", "GEMINI.md"), path.join(__dirname, "..", "AGENTS.md")];
  for (const f of candidates) {
    try {
      return fs.readFileSync(f, "utf8");
    } catch (_) {}
  }
  return "Call memory_context at the start, memory_search before answering, and never make things up.";
}

const PROMPTS = [
  {
    name: "anti_hallucination_rules",
    description: "Working rules: use memory, do not make things up, cite sources and confidence.",
    arguments: [],
  },
  {
    name: "recall",
    description: "Recall everything known about a topic.",
    arguments: [{ name: "topic", description: "Topic to recall", required: true }],
  },
];

function getPrompt(name, args = {}) {
  if (name === "anti_hallucination_rules") {
    return {
      description: "No-hallucination rules",
      messages: [{ role: "user", content: { type: "text", text: loadRules() } }],
    };
  }
  if (name === "recall") {
    return {
      description: "Recall a topic",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Call memory_search for the topic "${args.topic || ""}" (try 2–3 keyword variations). ` +
              "Summarize ONLY what is in memory, cite the ids, and state clearly what is unknown.",
          },
        },
      ],
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 over stdio (MCP)
// ---------------------------------------------------------------------------
function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function handle(msg) {
  const { id, method, params = {} } = msg;
  const isRequest = id !== undefined && id !== null;

  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0];
      return reply(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          "FALLBACK memory server. If the Engram tools (mem_*) are available, use Engram and do not also save here. " +
          "Otherwise: at the start of a task call memory_context then memory_search; save important decisions with memory_save. " +
          "If memory has no answer, say you do not know — never make it up.",
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return;
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS });
    case "tools/call": {
      const fn = handlers[params.name];
      if (!fn) return replyError(id, -32602, `Unknown tool: ${params.name}`);
      try {
        return reply(id, fn(params.arguments || {}));
      } catch (err) {
        return reply(id, errorResult(err && err.message ? err.message : String(err)));
      }
    }
    case "prompts/list":
      return reply(id, { prompts: PROMPTS });
    case "prompts/get": {
      const p = getPrompt(params.name, params.arguments);
      if (!p) return replyError(id, -32602, `Unknown prompt: ${params.name}`);
      return reply(id, p);
    }
    case "resources/list":
      return reply(id, { resources: [] });
    default:
      if (isRequest) replyError(id, -32601, `Method not found: ${method}`);
  }
}

// ---------------------------------------------------------------------------
// CLI helpers: --path, --export, --import <file>
// ---------------------------------------------------------------------------
function cli(argv) {
  if (argv.includes("--version")) {
    console.log(SERVER_VERSION);
    return true;
  }
  if (argv.includes("--path")) {
    console.log(FILE);
    return true;
  }
  if (argv.includes("--export")) {
    console.log(JSON.stringify(load(), null, 2));
    return true;
  }
  const i = argv.indexOf("--import");
  if (i >= 0) {
    const src = argv[i + 1];
    if (!src) {
      console.error("Usage: --import <file.json>");
      process.exitCode = 1;
      return true;
    }
    const incoming = JSON.parse(fs.readFileSync(src, "utf8"));
    const store = load();
    const seen = new Set(store.memories.map((m) => normalize(m.content)));
    let added = 0;
    for (const m of incoming.memories || []) {
      if (!m.content || seen.has(normalize(m.content))) continue;
      store.memories.push({ ...m, id: m.id || newId() });
      seen.add(normalize(m.content));
      added++;
    }
    save(store);
    console.log(`Imported ${added} memories into ${FILE}`);
    return true;
  }
  return false;
}

if (require.main === module) {
  if (!cli(process.argv.slice(2))) {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch (_) {
          replyError(null, -32700, "Parse error");
          continue;
        }
        if (Array.isArray(msg)) msg.forEach(handle);
        else handle(msg);
      }
    });
    process.stdin.on("end", () => process.exit(0));
    // Log to stderr only; stdout is reserved for the protocol.
    process.stderr.write(`[${SERVER_NAME}] ready. Memory file: ${FILE}\n`);
  }
}

module.exports = { search, tokenize, handlers, TOOLS };
