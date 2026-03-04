#!/bin/bash
# PAI Workspace — Domain Color Coding
# Вызывается из последнего таба при старте сессии
# Домены: Стратегия (amber) → Операции (cyan) → Работа (emerald)

# Wait for all tabs to initialize
sleep 1

SOCKET="unix:/tmp/kitty-$USER"
KC="kitty @ --to $SOCKET set-tab-color"

# ── 🟡 Стратегия (amber) — tabs 1-2 ──
$KC -m index:0 active_bg=#92400e inactive_bg=#451a03 active_fg=#fbbf24 inactive_fg=#d97706
$KC -m index:1 active_bg=#92400e inactive_bg=#451a03 active_fg=#fbbf24 inactive_fg=#d97706

# ── 🔵 Операции (cyan) — tabs 3-4 ──
$KC -m index:2 active_bg=#155e75 inactive_bg=#083344 active_fg=#22d3ee inactive_fg=#06b6d4
$KC -m index:3 active_bg=#155e75 inactive_bg=#083344 active_fg=#22d3ee inactive_fg=#06b6d4

# ── 🟢 Работа (emerald) — tabs 5-6 ──
$KC -m index:4 active_bg=#065f46 inactive_bg=#022c22 active_fg=#34d399 inactive_fg=#10b981
$KC -m index:5 active_bg=#065f46 inactive_bg=#022c22 active_fg=#34d399 inactive_fg=#10b981
