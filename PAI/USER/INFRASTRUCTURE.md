# Infrastructure

**Серверы, сервисы и инфраструктура Ivan.**

---

## Серверы

### 1. Agent Zero VPS (Timeweb)

| Параметр | Значение |
|----------|----------|
| **SSH alias** | `agentzero` |
| **IP** | 72.56.86.51 |
| **User** | agentzero (sudo доступ) |
| **OS** | Ubuntu 24.04 LTS (kernel 6.8.0) |
| **CPU/RAM** | 8 GB RAM |
| **Disk** | 77 GB (53% used, 37 GB free) |
| **Swap** | 4 GB (2.2 GB used) |
| **Uptime** | Стабильный, ~7+ дней |
| **Назначение** | Agent Zero — AI агенты в Docker контейнерах |

**Docker контейнеры (3 штуки):**

| Контейнер | Образ | Порт | Статус | Назначение |
|-----------|-------|------|--------|------------|
| `agent-zero` | agent0ai/agent-zero | :50001→80 | Up 7 дней | Основной Agent Zero |
| `agent-zero-new` | agent0ai/agent-zero | :50002→80 | Up 6 дней | Новая версия Agent Zero |
| `agent-zero-construction` | agent0ai/agent-zero | :50003→80 | Up 2 дня | Строительный Agent Zero |

**Порты:** 22 (SSH), 50001-50003 (Agent Zero Web UI), 10050 (Zabbix agent)

---

### 2. Xray Tunnel VPS (Timeweb)

| Параметр | Значение |
|----------|----------|
| **SSH alias** | `xray-vps` |
| **IP** | 72.56.99.127 |
| **User** | root |
| **OS** | Ubuntu 24.04 LTS (kernel 6.8.0) |
| **CPU/RAM** | 1 GB RAM (минимальный) |
| **Disk** | 14 GB (21% used, 11 GB free) |
| **Swap** | Нет |
| **Uptime** | 37+ дней |
| **Назначение** | VPN/прокси для обхода блокировок (Xray + SOCKS5) |

**Сервисы:**
- `xray.service` — Xray прокси на порту 443 (VLESS/XTLS)
- Используется как SOCKS5 туннель (`ssh -D 1080`) для Claude Code через privoxy

**Порты:** 22 (SSH), 443 (Xray), 10050 (Zabbix agent)

---

## Локальная машина (WSL2)

| Параметр | Значение |
|----------|----------|
| **OS** | Windows 11 Pro + WSL2 (Ubuntu 24.04) |
| **WSL user** | ser |
| **Туннель** | `ssh -D 1080 root@72.56.99.127` → privoxy :8118 → Claude Code |
| **SSH ключ** | `~/.ssh/id_rsa` (общий для обоих VPS) |
| **Kitty** | Установлен (v0.45.0) |
| **Claude Code** | Anthropic Max подписка |

---

## Схема сети

```
[Windows 11 Pro]
  └── [WSL2 Ubuntu 24.04]
       ├── Claude Code (PAI 3.0) ──HTTP_PROXY──→ privoxy:8118 ──SOCKS5──→ xray-vps:1080 → интернет
       ├── Voice Server :8888 (ElevenLabs TTS)
       └── SSH ──→ agentzero:22 (Agent Zero Docker ×3)
                ──→ xray-vps:22 (Xray туннель)
```

---

## Доступ

- SSH конфиг: `~/.ssh/config`
- SSH ключ: `~/.ssh/id_rsa` (единый для всех серверов)
- Подключение: `ssh agentzero` или `ssh xray-vps`

---

## Мониторинг

- Оба сервера имеют Zabbix agent (порт 10050) — мониторинг от Timeweb

---

*Этот файл является приватным и содержит инфраструктурные данные.*
