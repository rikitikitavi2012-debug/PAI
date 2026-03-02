# JulesAPI.ts

TypeScript CLI wrapper for the Google Jules REST API (v1alpha).

## Prerequisites

- `JULES_API_KEY` must be set in `~/.config/PAI/.env`
- Bun runtime

## Commands

### sources
List all connected GitHub repositories.
```bash
bun JulesAPI.ts sources
```

### sessions
List all Jules sessions, optionally filtered by state.
```bash
bun JulesAPI.ts sessions              # All sessions
bun JulesAPI.ts sessions IN_PROGRESS  # Only running
bun JulesAPI.ts sessions COMPLETED    # Only finished
```

### create
Create a new Jules session with a coding task.
```bash
bun JulesAPI.ts create "Add unit tests for the auth module"
```

Override target repo/branch:
```bash
JULES_REPO="sources/github/owner/repo" JULES_BRANCH="dev" \
  bun JulesAPI.ts create "Fix the login bug"
```

### status
Get full details for a specific session.
```bash
bun JulesAPI.ts status sessions/abc123
bun JulesAPI.ts status abc123           # sessions/ prefix optional
```

### approve
Approve a session's plan so Jules proceeds with implementation.
```bash
bun JulesAPI.ts approve sessions/abc123
```

### message
Send a follow-up message to an active session.
```bash
bun JulesAPI.ts message sessions/abc123 "Also add integration tests"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JULES_REPO` | `sources/github/rikitikitavi2012-debug/PAI-personal` | Target repo source path |
| `JULES_BRANCH` | `master` | Starting branch for new sessions |

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (missing args, API error, missing key) |

## API Reference

Base URL: `https://jules.googleapis.com/v1alpha`
Auth: `X-Goog-Api-Key` header
