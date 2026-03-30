# Research Jules CLI installation

**Agent:** Explore
**Captured:** 2026-03-16T22:43:42+03:00
**Tool Use ID:** toolu_01PtEqm5kKaAL6Bc9amrHxc5
**Tokens:** 30093
**Duration:** 49s
**Source:** PostToolUse hook capture

---

## Research Results: Jules CLI Installation

**Exact Installation Command:**

```bash
npm install -g @google/jules
```

**Key Findings:**

1. **Package Name:** `@google/jules` (on npm registry)
   - Not `@google/jules-cli`
   - Not `google-jules-cli`
   - Not `jules-cli`
   - Correct: **`@google/jules`**

2. **How It Works with Gemini CLI:**
   - When you install the Gemini CLI Jules extension with:
     ```bash
     gemini extensions install https://github.com/gemini-cli-extensions/jules --auto-update
     ```
   - Gemini CLI will **automatically install `@google/jules` globally** if it's not already present
   - You can also install it manually ahead of time with: `npm install -g @google/jules`

3. **Alternative (without installation):**
   ```bash
   npx @google/jules
   ```
   This runs Jules without a permanent installation.

4. **What the `julius` binary does:**
   - Provides CLI commands like `jules remote new` (which matches what `gemini-cli-jules` extension calls)
   - Manages coding sessions, monitors progress, and integrates Jules into workflows
   - Requires authentication with a Google account before first use

5. **Verification:**
   After installation, verify with:
   ```bash
   jules help
   ```
   This should list all available commands if installation succeeded.

**Bottom Line:** Install `@google/jules` via npm globally, or let the Gemini CLI extension handle it automatically on first use.

Sources:
- [NPM @google/jules package](https://www.npmjs.com/package/@google/jules)
- [Gemini CLI Jules Extension GitHub](https://github.com/gemini-cli-extensions/jules)
- [Jules CLI Tools Reference](https://jules.google/docs/cli/reference/)
- [Jules Getting Started Guide](https://jules.google/docs/)
- [Google Developers Blog: Jules Extension Introduction](https://developers.googleblog.com/en/introducing-the-jules-extension-for-gemini-cli/)
- [Meet Jules Tools Blog Post](https://developers.googleblog.com/en/meet-jules-tools-a-command-line-companion-for-googles-async-coding-agent/)