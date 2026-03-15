#!/bin/bash
# Verify command: build project and measure total JS bundle size in kB
cd /home/ser/projects/timber-frame-site
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "BUILD_FAILED"
  exit 1
fi
find .next/static/chunks -name "*.js" -exec stat --printf='%s\n' {} \; 2>/dev/null | awk '{s+=$1} END {printf "%.1f", s/1024}'
