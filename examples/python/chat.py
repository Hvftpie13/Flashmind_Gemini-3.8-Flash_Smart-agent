"""
Terminal chat: Gemini 3.8 Flash + persistent memory (through this plugin's flashmind MCP server).

    pip install google-genai
    export GEMINI_API_KEY=...        # Windows: set GEMINI_API_KEY=...
    python examples/python/chat.py

Env options:
    GEMINI_MODEL     default gemini-3.8-flash
    THINKING_LEVEL   low | medium | high   (default high; 3.8 Flash does not support "minimal")
"""
import json
import os
import pathlib
import subprocess
import sys

from google import genai
from google.genai import types

ROOT = pathlib.Path(__file__).resolve().parents[2]
SERVER = ROOT / "server" / "index.js"
RULES = (ROOT / "GEMINI.md").read_text(encoding="utf-8")
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
THINKING = os.environ.get("THINKING_LEVEL", "high")


class McpStdio:
    """Minimal MCP client (stdio, JSON-RPC 2.0)."""

    def __init__(self, cmd):
        self.p = subprocess.Popen(
            cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            text=True, encoding="utf-8",
        )
        self.n = 0
        self.call("initialize", {
            "protocolVersion": "2025-06-18", "capabilities": {},
            "clientInfo": {"name": "flashmind-chat", "version": "1.0"},
        })
        self.notify("notifications/initialized")

    def notify(self, method, params=None):
        self.p.stdin.write(json.dumps({"jsonrpc": "2.0", "method": method, "params": params or {}}) + "\n")
        self.p.stdin.flush()

    def call(self, method, params=None):
        self.n += 1
        self.p.stdin.write(json.dumps({"jsonrpc": "2.0", "id": self.n, "method": method, "params": params or {}}) + "\n")
        self.p.stdin.flush()
        while True:
            msg = json.loads(self.p.stdout.readline())
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError(msg["error"]["message"])
                return msg["result"]

    def tool(self, name, **args):
        res = self.call("tools/call", {"name": name, "arguments": {k: v for k, v in args.items() if v is not None}})
        return "\n".join(c.get("text", "") for c in res.get("content", []))


mcp = McpStdio(["node", str(SERVER)])


# --- Functions exposed to Gemini (automatic function calling) ---------------
def memory_context() -> str:
    """Digest of key memories. Call at the start of a session."""
    return mcp.tool("memory_context")


def memory_search(query: str, category: str = None) -> str:
    """Search memory by keyword before answering about the user or project.
    category: user|preference|project|fact|decision|lesson|other (optional)."""
    return mcp.tool("memory_search", query=query, category=category)


def memory_save(content: str, category: str = "fact", source: str = "user", confidence: str = "user_stated") -> str:
    """Save one durable fact. confidence: verified|user_stated|inferred."""
    return mcp.tool("memory_save", content=content, category=category, source=source, confidence=confidence)


def memory_update(id: str, content: str) -> str:
    """Update an existing memory."""
    return mcp.tool("memory_update", id=id, content=content)


def memory_delete(id: str) -> str:
    """Delete a memory (only if the user asks or it is proven wrong)."""
    return mcp.tool("memory_delete", id=id)


def memory_verify(claim: str) -> str:
    """Check a claim against memory before stating it as fact."""
    return mcp.tool("memory_verify", claim=claim)


def main():
    client = genai.Client()  # reads GEMINI_API_KEY
    config = types.GenerateContentConfig(
        system_instruction=RULES + "\n\nCurrent memory context:\n" + memory_context(),
        thinking_config=types.ThinkingConfig(thinking_level=THINKING),
        tools=[memory_search, memory_save, memory_update, memory_delete, memory_verify],
    )
    chat = client.chats.create(model=MODEL, config=config)
    print(f"Model: {MODEL} (thinking: {THINKING}). Type 'exit' to quit.\n")
    while True:
        try:
            q = input("you > ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if q.lower() in {"exit", "quit"}:
            break
        if not q:
            continue
        resp = chat.send_message(q)
        print("\ngemini > " + (resp.text or "").strip() + "\n")


if __name__ == "__main__":
    try:
        main()
    finally:
        mcp.p.terminate()
        sys.exit(0)
