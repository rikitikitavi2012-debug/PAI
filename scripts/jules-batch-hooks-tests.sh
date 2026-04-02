#!/bin/bash
# Jules batch: Write tests for new hooks
# Run: ./scripts/jules-batch-hooks-tests.sh

TASKS=(
  "Write comprehensive tests for hooks/AutoSkillProposal.hook.ts - test: pattern detection, complexity threshold, rate limiting, voice notification, AskUserQuestion output. Create hooks/tests/AutoSkillProposal.test.ts"
  "Write tests for hooks/VerificationGate.hook.ts - test: verification section detection, checked item parsing, PRD phase complete blocking. Create hooks/tests/VerificationGate.test.ts"
)

for TASK in "${TASKS[@]}"; do
  echo "Submitting to Jules: $TASK"
  gh issue create --title "[Jules] $TASK" --body "## Context
Part of hooks test coverage improvement.

## Task
$TASK

## Requirements
- Follow existing test patterns from hooks/tests/
- Use Bun test runner
- Mock external dependencies (Inference, fetch, fs)
- Test both success and error paths" --label "jules,test,hooks" --assignee "@me" --repo "rikitikitavi2012-debug/PAI-personal"
  sleep 2
done

echo ""
echo "Submitted ${#TASKS[@]} tasks to Jules"
