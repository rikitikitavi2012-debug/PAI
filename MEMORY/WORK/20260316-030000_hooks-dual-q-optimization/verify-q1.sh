#!/bin/bash
# [Q]-1: Total hook file size in kB
find /home/ser/.claude/hooks/ -name "*.hook.ts" -exec stat --printf='%s\n' {} \; | awk '{s+=$1} END {printf "%.1f", s/1024}'
