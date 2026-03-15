# Research Claude Code browser MCP

**Agent:** claude-code-guide
**Captured:** 2026-03-16T00:12:52+03:00
**Tool Use ID:** toolu_01M5cykk1sijY1ykfJyehPxJ
**Tokens:** 50740
**Duration:** 28s
**Source:** PostToolUse hook capture

---

Based on the official Claude Code documentation, I have clear answers to all your questions about browser automation. Let me summarize:

## Summary: Browser Automation in Claude Code

### 1. Does Claude Code have built-in browser capabilities or MCP servers?

Claude Code has **two distinct approaches**:

**Built-in Chrome Integration (Recommended for local testing):**
- Claude Code has native Chrome/Edge browser integration via the "Claude in Chrome" extension
- This is simpler, requires no configuration, and works directly with the browser you use
- **However, WSL2 is NOT supported** (currently only macOS, Linux, and Windows with Chrome installed)

**MCP Servers (For headless/programmatic automation):**
- You can connect browser automation MCP servers via the Model Context Protocol
- Popular option: Playwright MCP server
- This approach works on WSL2

### 2. Recommended approach for WSL2: Use Playwright MCP

Since you're on WSL2 without Chrome installed, use the **Playwright MCP server**:

```bash
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest
```

### 3. How to configure MCP servers in settings.json

The MCP server configuration uses **CLI commands** (not direct settings.json editing). However, it **stores in** `.mcp.json` at your project root for team sharing, or `~/.claude.json` for user scope.

Your settings.json can set the `MAX_MCP_OUTPUT_TOKENS` environment variable:

```json
{
  "env": {
    "MAX_MCP_OUTPUT_TOKENS": "50000"
  }
}
```

### 4. Exact configuration needed for WSL2

Add the Playwright MCP server:

```bash
# Stdio transport (works on WSL2)
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest

# Optionally set environment variables
claude mcp add --transport stdio playwright --env PLAYWRIGHT_BROWSER=chromium -- npx -y @playwright/mcp@latest

# Verify it's installed
claude mcp list
```

This creates a `.mcp.json` file in your project:

```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": {}
    }
  }
}
```

### Key configuration paths in your environment:

- **MCP server configs**: `.mcp.json` (project scope, checked into git)
- **User-level MCP**: `~/.claude.json` (user scope, not shared)
- **Settings.json**: `/home/ser/.claude/settings.json` (already using this)

### Usage in Claude Code

Once configured, use it like:

```
Take a screenshot of https://example.com
Navigate to the login page and fill in the form
Run a Lighthouse audit on my local app at localhost:3000
```

The documentation link for complete MCP reference is here: https://code.claude.com/docs/en/mcp.md

For Playwright-specific capabilities, once added, run `/mcp` in Claude Code to see available browser tools from the Playwright server.