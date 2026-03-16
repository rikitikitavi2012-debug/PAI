---
name: Investigation
description: OSINT and people-finding — structured investigations, company intel, due diligence, and ethical people search across public records and social media. USE WHEN OSINT, due diligence, company intel, background check, find person, locate, people search, reconnect, public records, reverse lookup, social media search, verify identity, domain lookup, entity lookup, organization lookup, company lookup, threat intel, расследование, проверка компании, дью дилидженс, фоновая проверка, найди человека, поиск людей, публичные записи, обратный поиск, поиск в соцсетях, проверка личности, разведка угроз.
context: fork
---

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле Investigation", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **Investigation** skill...
   ```

# Investigation

Unified skill for OSINT and investigation workflows.

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| OSINT, due diligence, company intel, background check, entity intel, threat intel | `OSINT/SKILL.md` |
| Find person, locate, people search, reconnect, public records, reverse lookup | `PrivateInvestigator/SKILL.md` |
