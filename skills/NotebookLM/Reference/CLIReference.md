# NotebookLM CLI Reference

**Package:** `notebooklm-py` v0.3.4 | **Command:** `notebooklm`

## Authentication

```bash
notebooklm login                    # Open browser for Google login
notebooklm login --browser msedge   # Use Edge (for SSO)
notebooklm auth check               # Verify auth status
notebooklm auth status              # Detailed auth info
```

**Auth storage:** `~/.notebooklm/storage_state.json`
**Cookie validity:** days to weeks (varies by region)
**CI/CD:** set `NOTEBOOKLM_AUTH_JSON` env var

## Session Management

```bash
notebooklm list                     # List all notebooks
notebooklm create "Title"           # Create new notebook
notebooklm use <id>                 # Set active notebook (supports partial IDs)
notebooklm status                   # Show current context
notebooklm clear                    # Clear active notebook
notebooklm rename <id> "New Title"  # Rename notebook
notebooklm delete <id>              # Delete notebook (irreversible!)
notebooklm summary                  # AI-generated notebook summary
notebooklm metadata                 # Export metadata with sources list
```

## Sources

```bash
# Add sources
notebooklm source add URL                    # Web page
notebooklm source add URL1 URL2 URL3         # Multiple URLs
notebooklm source add file.pdf               # Local file upload
notebooklm source add --youtube "YT_URL"     # YouTube video
notebooklm source add-drive "DRIVE_ID"       # Google Drive file
notebooklm source add-research "query"       # Research + auto-add

# Manage sources
notebooklm source list                       # List all sources
notebooklm source get <id>                   # Get source details
notebooklm source fulltext <id>              # Get full source text
notebooklm source rename <id> "New Name"     # Rename source
notebooklm source delete <id>                # Delete source
notebooklm source delete-by-title "Title"    # Delete by title
notebooklm source refresh <id>               # Refresh URL source
notebooklm source stale                      # Find stale sources
notebooklm source guide                      # Source guide/help
notebooklm source wait                       # Wait for processing
```

## Chat

```bash
notebooklm ask "question"                    # Ask active notebook
notebooklm ask "question" -n <notebook_id>   # Ask specific notebook
notebooklm configure                         # Configure chat persona
notebooklm history                           # View conversation history
notebooklm history --save                    # Save history as note
```

## Artifact Generation

```bash
# Audio (podcast)
notebooklm generate audio "instructions" --wait
notebooklm generate audio "instructions" --type brief      # Brief overview
notebooklm generate audio "instructions" --type critique    # Critical analysis
notebooklm generate audio "instructions" --type debate      # Debate format

# Video
notebooklm generate video "instructions" --wait
notebooklm generate cinematic-video "instructions" --wait

# Documents
notebooklm generate slide-deck "instructions"
notebooklm generate report "instructions" --wait
notebooklm generate data-table "instructions"

# Study Materials
notebooklm generate quiz "instructions"
notebooklm generate flashcards "instructions"
notebooklm generate mind-map "instructions"
notebooklm generate infographic "instructions"

# Slide revision
notebooklm generate revise-slide "change instructions" --slide-index 3
```

## Downloads

```bash
notebooklm download audio ./output/
notebooklm download video ./output/
notebooklm download cinematic-video ./output/
notebooklm download slide-deck ./output/
notebooklm download report ./output/
notebooklm download quiz ./output/
notebooklm download flashcards ./output/
notebooklm download mind-map ./output/
notebooklm download infographic ./output/
notebooklm download data-table ./output/
```

## Artifact Management

```bash
notebooklm artifact list                     # List all artifacts
notebooklm artifact get <id>                 # Get artifact details
notebooklm artifact poll <id>                # Check generation status
notebooklm artifact wait <id>                # Wait for completion
notebooklm artifact delete <id>              # Delete artifact
notebooklm artifact rename <id> "New Name"   # Rename artifact
notebooklm artifact suggestions              # Get AI suggestions
notebooklm artifact export                   # Export all artifacts
```

## Notes

```bash
notebooklm note create "Title" "Content"     # Create note
notebooklm note list                         # List notes
notebooklm note get <id>                     # Get note content
notebooklm note rename <id> "New Title"      # Rename note
notebooklm note delete <id>                  # Delete note
notebooklm note save                         # Save chat as note
```

## Sharing

```bash
notebooklm share status                      # Current sharing status
notebooklm share public                      # Make notebook public
notebooklm share add "email@example.com"     # Share with user
notebooklm share remove "email@example.com"  # Remove user access
notebooklm share update "email" --role editor # Update role
notebooklm share view-level                  # View access levels
```

## Research

```bash
notebooklm research web "query"              # Start web research
notebooklm research status                   # Check research status
notebooklm research wait                     # Wait for completion
```

## Other

```bash
notebooklm language set ru                   # Set output language
notebooklm language get                      # Get current language
notebooklm skill install                     # Install Claude Code skill
notebooklm --version                         # Show version
notebooklm --verbose <command>               # Verbose output
notebooklm -vv <command>                     # Debug output
```

## Environment Variables

| Variable | Purpose |
|---|---|
| `NOTEBOOKLM_HOME` | Custom config directory (default: `~/.notebooklm`) |
| `NOTEBOOKLM_AUTH_JSON` | Auth JSON for CI/CD (headless) |

## Limits

- **50 sources per notebook** — split into sub-notebooks for larger research
- **Cookie expiry** — re-login when auth fails
- **Rate limiting** — Google may throttle heavy usage
- **Undocumented API** — may break without warning
