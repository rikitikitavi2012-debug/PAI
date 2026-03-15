# Research browser setup options

**Agent:** Explore
**Captured:** 2026-03-16T00:13:45+03:00
**Tool Use ID:** toolu_01WSPCS5QxzLTJ9uTg56WWpK
**Tokens:** 65716
**Duration:** 86s
**Source:** PostToolUse hook capture

---

Perfect! Now let me compile the comprehensive findings:

## Summary Report

Based on a thorough search of the PAI codebase, here are the findings regarding browser automation, Playwright, Puppeteer, MCP server, and Lighthouse configuration:

### Current Status

**No Playwright/Puppeteer/Lighthouse installed or configured yet**, but there is clear research and planning in place.

### Existing Browser Automation Infrastructure

1. **Browser Skill** (`/home/ser/.claude/skills/Utilities/Browser/SKILL.md`)
   - Version 3.3.0 — CLI-First Browser Automation
   - Uses `playwright-cli` (not the npm package) via CLI commands
   - Supports named sessions with ref-based element interaction
   - Zero-token multi-step interaction via `playwright-cli -s=<name>`
   - Tier 2: BrowserAgent (`/home/ser/.claude/agents/BrowserAgent.md`) for AI-driven interactions
   - Tier 3: Headed Chrome for authenticated sessions (limited to `claude --chrome`)

2. **MCP Servers in settings.json** (`/home/ser/.claude/settings.json` lines 1072-1109)
   - Currently configured: `supabase`, `exa`, `cloudflare`, `zai-vision`, `agent-zero`
   - **No Playwright or browser automation MCP servers currently active**
   - Setting allows: `mcp__*` permissions (line 31)

3. **Apify Web Scraping** (`/home/ser/.claude/skills/Scraping/Apify/`)
   - MCP reference: `mcp__Apify__apify-slash-rag-web-browser()` 
   - Used in Research Workflows for advanced content retrieval (lines 204-234 of Retrieve.md)
   - Can handle JavaScript rendering and returns RAG-optimized markdown

4. **Research Notes** (`/home/ser/.claude/MEMORY/RESEARCH/2026-03/2026-03-16-001252_AGENT-claude-code-guide_research-claude-code-browser-m_toolu-01m5cy.md`)
   - Comprehensive research on Claude Code browser capabilities
   - **Recommended solution for WSL2**: Playwright MCP server via `claude mcp add --transport stdio playwright -- npx -y @playwright/mcp@latest`
   - Alternative: Claude's built-in Chrome extension (not WSL2 compatible)

5. **Open Work Item** (`/home/ser/.claude/MEMORY/WORK/20260316-001159_lighthouse-ch/tasks/001_lighthouse-ch/PRD-20260316-lighthouse-ch.md`)
   - Title: "Lighthouse not installed locally, need Chrome in WSL2 for browser browsing"
   - Status: ACTIVE (OBSERVE phase)
   - Budget: <2min, 1 session, 8-16 ISC criteria

### Key Files and Paths

- `/home/ser/.claude/skills/Utilities/Browser/SKILL.md` — Browser automation with playwright-cli
- `/home/ser/.claude/agents/BrowserAgent.md` — Parallel browser agent definition
- `/home/ser/.claude/agents/UIReviewer.md` — UI story validation agent
- `/home/ser/.claude/skills/Research/Workflows/Retrieve.md` — Multi-layer content retrieval with Apify RAG browser
- `/home/ser/.claude/skills/Scraping/Apify/` — Social media and web scraping via Apify actors
- `/home/ser/.claude/settings.json` — MCP server configuration (lines 1072-1109)
- `/home/ser/.claude/MEMORY/RESEARCH/2026-03/2026-03-16-001252_...md` — Playwright MCP setup research

### Technology Stack Configuration

From settings.json (line 1005):
- **Browser**: "Dia" (user's preferred browser for visual display)
- **Environment**: WSL2 (Windows Subsystem for Linux 2)
- **Package Manager**: bun

### What Exists vs. What's Missing

**Exists:**
- Playwright CLI commands documentation and BrowserAgent implementation
- Multi-layer scraping framework (WebFetch → BrightData → Apify)
- UIReviewer agent for structured story validation
- Apify MCP integration for RAG-based web browsing

**Missing/Not Configured:**
- Playwright MCP server (not in settings.json)
- Puppeteer (no references found)
- Lighthouse integration (only in open PRD)
- Chrome/Chromium installation in WSL2