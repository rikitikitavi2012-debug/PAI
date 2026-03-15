#!/bin/bash
# [Q]-2: Test failure count
bun test /home/ser/.claude/hooks/tests/ 2>&1 | grep -oP '\d+ fail' | grep -oP '\d+' || echo "0"
