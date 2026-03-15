# A2A Protocol Landscape Research — 2026-03-13

## 1. Claude Code (Anthropic CLI)

### A2A Protocol Support: NO (not native)
- Claude Code does NOT natively implement Google's A2A protocol
- No `claude a2a` command exists
- No built-in A2A server or client

### What Claude Code DOES have:
- **`claude mcp serve`** — exposes Claude Code as an MCP server over JSON-RPC 2.0 via stdio
  - Exposes tools: Bash, Read/View, Write/Edit, LS, GrepTool, GlobTool, Replace, dispatch_agent
  - One process per client connection, no shared state
  - Source: https://www.ksred.com/claude-code-as-an-mcp-server-an-interesting-capability-worth-understanding/
- **Claude Agent SDK** (formerly Claude Code SDK) — Python v0.1.48, TypeScript v0.2.71
  - Thin wrapper around Claude Code CLI running as subprocess
  - Programmatic agent creation, not A2A protocol
  - Source: https://platform.claude.com/docs/en/agent-sdk/overview
- **Subagents system** — internal agent delegation within Claude Code sessions
- **Community bridge**: steipete/claude-code-mcp wraps Claude Code as MCP server (unofficial)
- **Community A2A bridge**: GongRzhe/A2A-MCP-Server bridges MCP to A2A protocol

### Connection to A2A ecosystem:
- Anthropic webinar "Deploying multi-agent systems using MCP and A2A with Claude on Vertex AI" exists
- A2A connectivity possible ONLY through third-party MCP-to-A2A bridges

## 2. OpenCode CLI

### A2A Protocol Support: NO
- OpenCode does NOT implement Google's A2A protocol

### What OpenCode DOES have:
- **`opencode acp`** — starts ACP (Agent Client Protocol) server via JSON-RPC over stdio
  - ACP is a DIFFERENT protocol from A2A
  - Created by Zed + JetBrains in September 2025
  - ACP = agent-to-CLIENT (editor-to-agent), NOT agent-to-agent
  - Compatible editors: Zed, JetBrains IDEs (2025.3+), Neovim (Avante/CodeCompanion), Emacs
  - Source: https://opencode.ai/docs/acp/
- **`opencode serve`** — HTTP server with OpenAPI 3.1 spec
  - Exposes REST API at configurable port (default 4096)
  - Endpoints: sessions, messages, projects, config, agents, files, search, tools, SSE
  - OpenAPI docs at http://localhost:4096/doc
  - HTTP basic auth supported
  - mDNS service discovery supported
  - Source: https://opencode.ai/docs/server/

### ACP vs A2A — CRITICAL DISTINCTION:
- **ACP (Agent Client Protocol)** by Zed/JetBrains = editor-to-agent communication (like LSP for AI agents)
- **A2A (Agent-to-Agent)** by Google = agent-to-agent communication across frameworks
- **ACP (Agent Communication Protocol)** by IBM = DIFFERENT protocol, merged into A2A in August 2025
- Three different things with overlapping acronyms

## 3. Gemini CLI

### A2A Protocol Support: PARTIAL / IN PROGRESS
- **PR #3079** adding A2A client support was CLOSED (not merged) on Sept 3, 2025
  - Maintainers: "Work to make gemini-cli an a2a client...is currently not prioritized"
  - Source: https://github.com/google-gemini/gemini-cli/pull/3079
- **RFC Discussion #7822** proposes standardizing on A2A for all Gemini CLI integrations
  - Status: RFC under community discussion
  - An experimental A2A server implementation exists in the repo
  - Source: https://github.com/google-gemini/gemini-cli/discussions/7822
- **A2A in Google Cloud**: Full A2A support in Gemini Enterprise, ADK, Vertex AI, Agent Engine
  - Register/manage A2A agents in Gemini Enterprise
  - Interactions API maps directly to A2A protocol surface
  - Source: https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade

### Summary: Gemini CLI itself does NOT have merged A2A support. Google's CLOUD products (ADK, Vertex, Agent Engine) fully support A2A.

## 4. Agent Zero

### A2A Protocol Support: YES (via FastA2A)
- Uses Google's A2A protocol via Pydantic's FastA2A library
- FastA2A = Python framework for building A2A servers (by Pydantic team)
  - Source: https://github.com/pydantic/fasta2a
- Enables multiple Agent Zero instances to communicate via A2A
- Also has MCP server with `send_message` and `finish_chat` tools
- A2A used for: distributed workflows, task delegation, persistent agent conversations
- Source: https://www.agent-zero.ai/p/docs/mcp-a2a/

### Note: Could not verify specific `a2a_chat` tool name from docs (page content was JS-rendered)

## 5. Google A2A Protocol — Current State (March 2026)

### Timeline:
- **April 2025**: Google launches A2A with 50+ technology partners
- **June 2025**: A2A donated to Linux Foundation
- **July 2025**: Version 0.3 released, 150+ organizations supporting
- **August 2025**: IBM's ACP (Agent Communication Protocol) merges into A2A
- **2025-2026**: Continued enterprise adoption

### Key Implementors:
- **Google**: ADK, Vertex AI, Agent Engine, Gemini Enterprise
- **Microsoft**: Azure AI Foundry, Copilot Studio
- **Amazon**: Bedrock AgentCore (native support)
- **SAP**: Wired into Joule AI assistant
- **Enterprise adopters**: Atlassian, Box, Salesforce, ServiceNow, PayPal, Adobe, Twilio, S&P Global
- **Real-world**: Tyson Foods, Gordon Food Service (supply chain A2A agents)

### Technical Specs:
- Built on HTTP, JSON-RPC 2.0, Server-Sent Events (SSE)
- Agent discovery via `.well-known/agent.json`
- Under Linux Foundation governance

## 6. MCP vs A2A — Relationship

- **MCP** (Anthropic) = agent-to-TOOL communication (vertical — connecting agent to data/tools)
- **A2A** (Google) = agent-to-AGENT communication (horizontal — agents collaborating as peers)
- They are COMPLEMENTARY, not competing
- Typical architecture: A2A for inter-agent communication + MCP for each agent's tool access
- Both can coexist in the same system

## 7. Protocol Landscape Summary

| Protocol | Creator | Purpose | Transport |
|----------|---------|---------|-----------|
| MCP | Anthropic | Agent-to-tool | JSON-RPC 2.0, stdio/HTTP/SSE |
| A2A | Google (Linux Foundation) | Agent-to-agent | HTTP, JSON-RPC 2.0, SSE |
| ACP (Agent Client Protocol) | Zed + JetBrains | Editor-to-agent | JSON-RPC 2.0, stdio |
| ACP (Agent Communication Protocol) | IBM | Agent-to-agent | REST | Merged into A2A Aug 2025 |
