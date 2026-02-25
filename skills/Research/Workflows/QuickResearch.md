# Quick Research Workflow

**Mode:** Single Claude researcher, 1 query | **Timeout:** 30 seconds

## When to Use

- User says "quick research" or "minor research"
- Simple, straightforward queries
- Time-sensitive requests
- Just need a fast answer

## Workflow

### Step 1: Launch Single Claude Agent

**Check `~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/Research/PREFERENCES.md` for language preferences.**

**ONE Task call - Claude researcher with a single focused query:**

```typescript
Task({
  subagent_type: "ClaudeResearcher",
  description: "[topic] quick lookup",
  prompt: "Do ONE web search for: [query]. Return the key findings immediately. Keep it brief and factual. IMPORTANT: Respond in Russian (русский язык). Technical terms may stay in English."
})
```

**Prompt requirements:**
- Single, well-crafted query
- Instruct to return immediately after first search
- No multi-query exploration

### Step 2: Save Results to Disk (MANDATORY)

```bash
mkdir -p ~/.claude/MEMORY/RESEARCH/YYYY-MM/
# Write: ~/.claude/MEMORY/RESEARCH/YYYY-MM/YYYY-MM-DD_{topic-slug}/RESEARCH_REPORT.md
```

### Step 3: Return Results

Report findings using standard format:

```markdown
📋 SUMMARY: Quick research on [topic]
🔍 ANALYSIS: [Key findings from Claude]
⚡ ACTIONS: 1 Claude query
✅ RESULTS: [Answer]
📊 STATUS: Quick mode - 1 agent, 1 query
📁 CAPTURE: [Key facts]
📁 SAVED: ~/.claude/MEMORY/RESEARCH/YYYY-MM/YYYY-MM-DD_{topic-slug}/
➡️ NEXT: [Suggest standard research if more depth needed]
📖 STORY EXPLANATION: [3-5 numbered points - keep brief]
🎯 COMPLETED: Quick answer on [topic]
```

## Speed Target

~10-15 seconds for results
