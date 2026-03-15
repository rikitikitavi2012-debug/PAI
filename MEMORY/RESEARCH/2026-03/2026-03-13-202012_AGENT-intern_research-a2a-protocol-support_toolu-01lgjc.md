# Research A2A protocol support

**Agent:** Intern
**Captured:** 2026-03-13T20:20:12+03:00
**Tool Use ID:** toolu_01LGJCsN1dAwmmnPp3VUJ6fD
**Tokens:** 47782
**Duration:** 234s
**Source:** PostToolUse hook capture

---

```
════ PAI | NATIVE MODE ═══════════════════════
🗒️ TASK: A2A protocol support research across AI coding tools
📃 CONTENT:

# A2A Protocol Landscape — Verified Facts (March 2026)

---

## 1. CLAUDE CODE (Anthropic CLI)

**A2A support: NO.** Claude Code does not natively implement Google's A2A protocol.

What it HAS:
- **`claude mcp serve`** — exposes Claude Code as an MCP server (JSON-RPC 2.0 over stdio). Exposes Bash, Read, Write, Edit, Grep, Glob, dispatch_agent tools. One process per client, no shared state.
- **Claude Agent SDK** (Python v0.1.48, TS v0.2.71) — programmatic wrapper around Claude Code subprocess. NOT A2A.
- **Subagents** — internal delegation system within sessions. NOT inter-process A2A.
- **No `claude serve`, no HTTP API, no A2A endpoint.**
- A2A connectivity is ONLY possible through third-party bridges (e.g., GongRzhe/A2A-MCP-Server that bridges MCP to A2A).

---

## 2. OPENCODE CLI

**A2A support: NO.** OpenCode does not implement Google's A2A.

What it HAS:
- **`opencode acp`** — ACP (Agent Client Protocol) server. JSON-RPC over stdio. This is a DIFFERENT protocol created by Zed + JetBrains (Sept 2025). ACP = editor-to-agent (like LSP for AI agents). Compatible with Zed, JetBrains IDEs 2025.3+, Neovim, Emacs.
- **`opencode serve`** — HTTP server with OpenAPI 3.1. REST API for sessions, messages, agents, files, tools, SSE. Auth via HTTP basic. mDNS discovery.

**CRITICAL ACP CONFUSION**: There are TWO different "ACP" protocols:
  1. **Agent Client Protocol** (Zed/JetBrains) — editor-to-agent, what OpenCode uses
  2. **Agent Communication Protocol** (IBM) — agent-to-agent, merged INTO A2A in August 2025

---

## 3. GEMINI CLI

**A2A support: NOT YET (in progress).**

- PR #3079 adding A2A client was **closed without merge** (Sept 3, 2025). Maintainers: "currently not prioritized."
- RFC Discussion #7822 proposes standardizing A2A for Gemini CLI. Experimental A2A server exists in repo. Status: RFC under discussion.
- Google's CLOUD products (ADK, Vertex AI, Agent Engine, Gemini Enterprise) fully support A2A. The CLI itself does not yet.

---

## 4. AGENT ZERO

**A2A support: YES.** Uses Google's official A2A protocol via Pydantic's FastA2A library.

- FastA2A = Python framework converting AI agents into A2A servers (by Pydantic team).
- Enables multiple Agent Zero instances to discover and communicate.
- Also has MCP server (tools: `send_message`, `finish_chat`).
- A2A for reasoning/conversation delegation, MCP for tool/function access.

---

## 5. GOOGLE A2A PROTOCOL — CURRENT STATE

**Timeline:**
- Apr 2025: Launched with 50+ partners (Salesforce, SAP, ServiceNow, PayPal, etc.)
- Jun 2025: Donated to Linux Foundation
- Jul 2025: v0.3, 150+ organizations
- Aug 2025: IBM's ACP merged into A2A
- 2026: Continued enterprise adoption

**Who implements natively:**
- Google (ADK, Vertex, Agent Engine, Gemini Enterprise)
- Microsoft (Azure AI Foundry, Copilot Studio)
- Amazon (Bedrock AgentCore)
- SAP (Joule), Elastic, many SIs
- Agent Zero (via FastA2A)

**Technical stack:** HTTP + JSON-RPC 2.0 + SSE. Discovery via `.well-known/agent.json`.

---

## 6. MCP vs A2A vs ACP — THE MAP

| Protocol | Creator | Purpose | Status |
|---|---|---|---|
| **MCP** | Anthropic | Agent-to-TOOL (vertical) | De facto standard |
| **A2A** | Google → Linux Foundation | Agent-to-AGENT (horizontal) | Growing enterprise adoption |
| **ACP (Agent Client)** | Zed + JetBrains | Editor-to-AGENT (like LSP) | Active, IDE ecosystem |
| **ACP (Agent Comm)** | IBM | Agent-to-agent | MERGED into A2A, Aug 2025 |

MCP and A2A are **complementary**, not competing. Typical architecture: A2A for inter-agent + MCP for each agent's tools.

---

🔧 CHANGE:
- Research file saved to MEMORY/RESEARCH/2026-03/a2a-protocol-landscape-research.md
- 8 web searches + 6 page fetches conducted
- All claims verified against primary sources

✅ VERIFY:
- Claude Code: confirmed no A2A, confirmed `claude mcp serve` exists
- OpenCode: confirmed ACP (not A2A), confirmed `opencode serve` HTTP API
- Gemini CLI: confirmed PR closed, RFC open, cloud products support A2A
- Agent Zero: confirmed FastA2A (Pydantic) for Google A2A protocol
- Protocol landscape: confirmed merger of IBM ACP into A2A

🗣️ Navi: A2A native only in Agent Zero; Claude/OpenCode/Gemini CLI lack it. Bridges exist.
```

**Sources:**
- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp)
- [Claude Code as MCP Server](https://www.ksred.com/claude-code-as-an-mcp-server-an-interesting-capability-worth-understanding/)
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)
- [steipete/claude-code-mcp (unofficial)](https://github.com/steipete/claude-code-mcp)
- [GongRzhe/A2A-MCP-Server bridge](https://github.com/GongRzhe/A2A-MCP-Server)
- [OpenCode ACP Docs](https://opencode.ai/docs/acp/)
- [OpenCode Server Docs](https://opencode.ai/docs/server/)
- [ACP Intro by Calum Murray](https://www.calummurray.ca/blog/intro-to-acp)
- [JetBrains ACP Announcement](https://blog.jetbrains.com/ai/2025/10/jetbrains-zed-open-interoperability-for-ai-coding-agents-in-your-ide/)
- [Gemini CLI A2A PR #3079 (closed)](https://github.com/google-gemini/gemini-cli/pull/3079)
- [Gemini CLI A2A RFC #7822](https://github.com/google-gemini/gemini-cli/discussions/7822)
- [A2A Protocol Upgrade (Google Cloud Blog)](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade)
- [Agent Zero MCP & A2A Docs](https://www.agent-zero.ai/p/docs/mcp-a2a/)
- [FastA2A by Pydantic](https://github.com/pydantic/fasta2a)
- [Google A2A Announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)
- [MCP vs A2A Guide (auth0)](https://auth0.com/blog/mcp-vs-a2a/)
- [MCP, ACP, A2A Comparison (Heidloff)](https://heidloff.net/article/mcp-acp-a2a-agent-protocols/)
- [IBM: ACP merged into A2A](https://www.ibm.com/think/topics/agent-communication-protocol)