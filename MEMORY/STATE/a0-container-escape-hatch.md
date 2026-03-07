# A0 Container Escape Hatch — Quick Reference

Container 1 (port 50001) has SSH access to docker host (172.18.0.1, user: agentzero).
Use when container 2 is unresponsive or needs management.

## Check container 2 status
```bash
# Via container 1 API
curl -s http://72.56.86.51:50001/api_message \
  -H "X-API-KEY: $A0_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Run: ssh agentzero@172.18.0.1 docker ps --filter name=agent-zero-2"}'
```

## Restart container 2
```bash
# Via container 1
curl -s http://72.56.86.51:50001/api_message \
  -H "X-API-KEY: $A0_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Run: ssh agentzero@172.18.0.1 docker restart agent-zero-2"}'
```

## View container 2 logs
```bash
curl -s http://72.56.86.51:50001/api_message \
  -H "X-API-KEY: $A0_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Run: ssh agentzero@172.18.0.1 docker logs --tail 50 agent-zero-2"}'
```

## Execute command in container 2
```bash
curl -s http://72.56.86.51:50001/api_message \
  -H "X-API-KEY: $A0_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Run: ssh agentzero@172.18.0.1 docker exec agent-zero-2 ls /a0/python/extensions/"}'
```

## Direct health checks
```bash
# Container 1
curl -s http://72.56.86.51:50001/health

# Container 2
curl -s http://72.56.86.51:50002/health
```

## Restart Procedure (tested 2026-03-07)
1. Check container 2 health: `curl -s http://72.56.86.51:50002/health`
2. If unresponsive, use container 1: `curl -s http://72.56.86.51:50001/api_message -H "X-API-KEY: $A0_API_TOKEN" -H "Content-Type: application/json" -d '{"message": "Run: ssh agentzero@172.18.0.1 docker restart agent-zero-2"}'`
3. Wait 30s, re-check health
4. Extensions in /a0/python/extensions/ survive restart (/a0 is ext4 volume mount, not ephemeral)

## Volume Info
- `/a0` mounted as ext4 volume (`/dev/sda1 on /a0 type ext4 (rw,relatime)`)
- NOT a bind mount — persistent docker volume
- All custom files under /a0 survive restarts

## Key facts
- Container 1 = escape hatch, port 50001
- Container 2 = primary brain, port 50002
- Docker host: 172.18.0.1 (from container 1 perspective)
- SSH user: agentzero
- Extensions path: /a0/python/extensions/message_loop_prompts_after/
- Container name may vary — check with `docker ps`
