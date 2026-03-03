# Report: Cross-Reference of BRIGADE.md and AGENTS.md

## Findings

After reviewing `PAI/BRIGADE.md` and `AGENTS.md`, both files represent the 6 agents/tools accurately, but there are a few minor omissions in the `AI Brigade` summary table of `AGENTS.md` compared to the exhaustive details in `BRIGADE.md`.

### Agent Documentation Overview

**BRIGADE.md:**
1. Navi (Claude Opus)
2. Jules (Google Gemini)
3. Agent Zero (Claude Sonnet, 24/7 VPS Docker)
4. Gemini CLI (Google Gemini Pro)
5. GLM-5 (Zhipu AI)
6. zai-cli (MCP tools / Zhipu AI)

**AGENTS.md:**
The `AI Brigade` table explicitly lists 4 main rows:
- Navi (Claude Opus)
- Jules (Google Gemini)
- Agent Zero (Claude Sonnet, 24/7 VPS)
- Gemini CLI / GLM-5 (Inference tools)
Note: `zai-cli` is absent from the `AI Brigade` table in `AGENTS.md`.

### Missing Information / Inconsistencies

1. **`zai-cli` is not explicitly mentioned in `AGENTS.md`**
   - In `BRIGADE.md`, `zai-cli` is listed as the 6th tool/agent, responsible for "MCP tools (vision/search/read)".
   - However, the `AI Brigade` table in `AGENTS.md` does not list `zai-cli`.

2. **Delegation Matrix in `BRIGADE.md` vs. Roles in `AGENTS.md`**
   - The roles for Jules are consistent: Tests, bugs, TODOs, dependency updates, security scans.
   - The roles for Agent Zero are consistent: Deep research, code execution, browser, documents, DevOps.
   - The matrix perfectly matches the descriptions.

### Conclusion
Overall, the documents are highly consistent. The only inconsistency is the missing `zai-cli` in the `AI Brigade` summary table within `AGENTS.md`. Both `BRIGADE.md` and `AGENTS.md` effectively capture commands, limits, health checks, and delegation guidelines.
