---
name: a0-deployer
description: "Deploy, manage, and orchestrate Agent Zero container instances on VPS. Handles container lifecycle, A2A networking, health monitoring, backups and updates. Use when user needs to deploy new A0 instances, manage existing containers, configure inter-agent communication, or perform infrastructure operations."
version: 1.0.0
author: Agent Zero Custom
tags: [docker, deployment, containers, a2a, infrastructure, orchestration, vps]
trigger_patterns:
  - "deploy agent"
  - "new container"
  - "new instance"
  - "launch agent"
  - "container status"
  - "a2a setup"
  - "docker network"
  - "scale agents"
  - "container health"
  - "backup container"
  - "update agent zero"
  - "строительный контейнер"
  - "развернуть агента"
allowed_tools:
  - code_execution_tool
  - memory_save
  - memory_load
  - response
---

# A0 Deployer — Agent Zero Container Orchestrator

Deploy, manage, and orchestrate multiple Agent Zero instances on VPS infrastructure.

## Prerequisites

- SSH access to VPS host (configured via ops-commander or direct SSH key)
- Docker installed on VPS host
- Sudo access on VPS host

## Quick Reference

### Instance Registry
All managed instances are tracked in: `/a0/usr/skills/a0-deployer/config/instances.json`

### VPS Host Connection
```bash
# Default connection (configured in ops-commander)
ssh agentzero@72.56.86.51
# All docker commands require sudo on host
ssh agentzero@72.56.86.51 'sudo docker ps'
```

## Operations

### 1. List Running Instances
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode list
```
Shows all Agent Zero containers with status, ports, RAM usage, and A2A endpoints.

### 2. Deploy New Instance
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py \
  --mode deploy \
  --name "agent-zero-construction" \
  --port 50003 \
  --data-dir data3 \
  --auth-login admin \
  --auth-password "SecurePass123"
```

**What it does:**
1. Creates data directory on host (`~/agent-zero/<data-dir>`)
2. Pulls latest agent0ai/agent-zero image
3. Creates .env file with authentication
4. Runs container with proper volumes (data + SSH key)
5. Waits for container health check
6. Registers instance in local registry
7. Opens UFW port if needed

**Options:**
- `--name` — Container name (required)
- `--port` — Host port mapping (required)
- `--data-dir` — Data directory name under ~/agent-zero/ (required)
- `--auth-login` — Web UI username (default: admin)
- `--auth-password` — Web UI password (required)
- `--ssh-key` — Mount SSH key into container (default: true)
- `--image` — Docker image (default: agent0ai/agent-zero:latest)
- `--memory-limit` — RAM limit e.g. "2g" (optional)
- `--env-vars` — Additional env vars as JSON (optional)

### 3. Stop / Start / Restart Instance
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode stop --name "agent-zero-construction"
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode start --name "agent-zero-construction"
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode restart --name "agent-zero-construction"
```

### 4. View Logs
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode logs --name "agent-zero-construction" --tail 50
```

### 5. Health Check
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode health
```
Checks all registered instances: container status, HTTP response, RAM/CPU usage.

### 6. Setup Docker Network
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode network --network-name a0-network
```
Creates a Docker bridge network and connects all A0 containers for internal communication.

### 7. Setup A2A Connection
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode a2a-info --name "agent-zero-construction"
```
Shows A2A connection URL format. A2A must be enabled in each instance's Settings UI.

**A2A URL Format:**
```
http://<HOST>:<PORT>/a2a/t-<API_TOKEN>
http://<HOST>:<PORT>/a2a/t-<API_TOKEN>/p-<PROJECT_NAME>
```

**For containers on same Docker network:**
```
http://<CONTAINER_NAME>:80/a2a/t-<API_TOKEN>
```

### 8. Backup Instance
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode backup --name "agent-zero-construction"
```
Creates tarball of instance data directory on host.

### 9. Update Instance
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode update --name "agent-zero-construction"
```
**Safe update process:**
1. Backup current data
2. Pull latest image
3. Stop old container
4. Start new container with same config
5. Health check
6. Keep old container as rollback option

### 10. Remove Instance
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode remove --name "agent-zero-construction" --keep-data
```
`--keep-data` preserves the data directory for potential restoration.

### 11. Resource Overview
```bash
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode resources
```
Shows VPS resource usage: RAM, CPU, disk, swap across all containers.

## Infrastructure Map

### Current VPS Layout (72.56.86.51)
```
/home/agentzero/agent-zero/
├── docker-compose.yml          # Legacy compose for :50001
├── .env                        # Shared env vars
├── data/                       # Volume for :50001 (reserve)
├── data2/                      # Volume for :50002 (brain)
└── data3/                      # Volume for :50003 (to be created)

SSH Keys: /home/agentzero/.ssh_container_keys/id_rsa
```

### Container Naming Convention
- `agent-zero` — Reserve instance (:50001)
- `agent-zero-new` — Brain/coordinator (:50002)
- `agent-zero-<domain>` — Domain-specific instances

### Port Allocation
| Port | Instance | Role |
|------|----------|------|
| 50001 | agent-zero | Reserve/backup |
| 50002 | agent-zero-new | Brain/coordinator |
| 50003 | agent-zero-construction | Construction domain |
| 50004+ | Future instances | Available |

## Docker Run Template

The deployer uses this template for new containers:
```bash
sudo docker run -d \
  --name <NAME> \
  --restart unless-stopped \
  -p <PORT>:80 \
  -v /home/agentzero/agent-zero/<DATA_DIR>:/a0 \
  -v /home/agentzero/.ssh_container_keys/id_rsa:/root/.ssh/id_rsa:ro \
  --env-file /home/agentzero/agent-zero/<DATA_DIR>/.env \
  agent0ai/agent-zero:latest
```

## Security Notes

- SSH key mounted as read-only (:ro)
- Each instance has separate auth credentials
- UFW firewall rules managed per port
- A2A tokens auto-generated from instance credentials
- Docker network isolates inter-container traffic

## Integration with Other Skills

- **ops-commander**: VPS host registered as `vps-host` for SSH operations
- **A2A chat**: Use `a2a_chat` tool with instance A2A URL for inter-agent communication
- **Scheduler**: Automate health checks and backups via task scheduler

## Troubleshooting

### Container won't start
```bash
# Check logs
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode logs --name <NAME> --tail 100
# Check port conflicts
ssh agentzero@72.56.86.51 'sudo netstat -tlnp | grep <PORT>'
```

### Out of memory
```bash
# Check resources
python /a0/usr/skills/a0-deployer/scripts/a0_deployer.py --mode resources
# Consider: increase swap, set memory limits, or upgrade VPS
```

### A2A connection refused
1. Verify A2A is enabled in target instance Settings > MCP/A2A
2. Check container is on same Docker network or port is accessible
3. Verify API token matches (changes when credentials change)
