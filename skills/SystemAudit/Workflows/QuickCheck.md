# Quick Check Workflow

**Mode:** Single CLI run, critical checks only | **Time:** ~30 sec

## When to Use

- "quick check", "health check", "is system ok", "status"
- Daily system verification
- Before deployment or commits
- Quick sanity check after changes

## Workflow

### Step 1: Run CLI in Quick Mode

```bash
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts --quick
```

This runs only CRITICAL severity checks:
- hooks-file-sync (hooks exist on disk)
- skills-index-sync (index matches reality)
- voice-server (voice server responding)
- security-exposed-keys (no raw API keys)
- config-context-files (context files exist)
- memory-learning-pipeline (ratings pipeline alive)

### Step 2: Interpret Results

**All PASS (exit 0):**
```
✅ Система здорова. [count] критических проверок пройдено.
```

**Warnings (exit 1):**
```
⚠️ [count] предупреждений. Показать детали или запустить полный аудит?
```

**Failures (exit 2):**
```
❌ [count] критических проблем! Рекомендую полный аудит: /SystemAudit full
```

### Step 3: Voice Summary

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Быстрая проверка завершена. [result summary in Russian]"}'
```
