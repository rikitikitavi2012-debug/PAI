#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# PAI Bootstrap — Full restoration from git clone
# ═══════════════════════════════════════════════════════════════════
#
# Usage:
#   git clone git@github.com:rikitikitavi2012-debug/PAI-personal.git ~/.claude
#   cd ~/.claude && bash scripts/pai-bootstrap.sh
#
# What this does:
#   1. Installs system dependencies (bun, node, pip packages)
#   2. Installs MCP servers (npm global)
#   3. Creates symlinks for brigade (Gemini CLI, OpenCode)
#   4. Sets up .env symlink
#   5. Makes hooks executable
#   6. Verifies everything works
#
# What this does NOT do (manual steps):
#   - Install Claude Code itself (npm install -g @anthropic-ai/claude-code)
#   - Install Gemini CLI auth (gcloud auth / API key)
#   - Install OpenCode (separate binary)
#   - NotebookLM login (notebooklm login — requires browser)
#   - VPS proxy setup (.bashrc aliases)
#   - A0 server setup (separate VPS)
#
# Time: ~5 minutes (automated) + ~10 minutes (manual steps)
# ═══════════════════════════════════════════════════════════════════

set -uo pipefail

PAI_ROOT="${HOME}/.claude"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✅${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠️${NC} $1"; }
fail() { echo -e "  ${RED}❌${NC} $1"; }
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }
step() { echo -e "\n${BLUE}═══${NC} $1 ${BLUE}═══${NC}"; }

# ─── Pre-checks ───
if [[ ! -f "${PAI_ROOT}/CLAUDE.md" ]]; then
    fail "CLAUDE.md not found. Run this from ~/.claude after git clone."
    exit 1
fi

echo -e "${BLUE}"
echo "  ██████╗  █████╗ ██╗"
echo "  ██╔══██╗██╔══██╗██║"
echo "  ██████╔╝███████║██║"
echo "  ██╔═══╝ ██╔══██║██║"
echo "  ██║     ██║  ██║██║"
echo "  ╚═╝     ╚═╝  ╚═╝╚═╝  Bootstrap"
echo -e "${NC}"
echo "  Restoring PAI infrastructure from git..."
echo ""

# ─── Step 1: System dependencies ───
step "1/7 System Dependencies"

# Bun
if command -v bun &>/dev/null; then
    ok "Bun $(bun --version) already installed"
else
    info "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="${HOME}/.bun/bin:${PATH}"
    ok "Bun installed: $(bun --version)"
fi

# Node.js (needed for npm global packages)
if command -v node &>/dev/null; then
    ok "Node.js $(node --version) already installed"
else
    warn "Node.js not found. Install via: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs"
fi

# Python3 + pip
if command -v python3 &>/dev/null; then
    ok "Python3 $(python3 --version 2>&1 | awk '{print $2}') already installed"
else
    warn "Python3 not found. Install via: sudo apt install python3 python3-pip"
fi

# ─── Step 2: Python packages ───
step "2/7 Python Packages"

PIP_FLAGS="--break-system-packages --quiet"

# notebooklm-py
if python3 -c "import notebooklm" 2>/dev/null; then
    ok "notebooklm-py already installed"
else
    info "Installing notebooklm-py..."
    pip install $PIP_FLAGS notebooklm-py && ok "notebooklm-py installed" || warn "notebooklm-py failed"
fi

# playwright
if python3 -c "import playwright" 2>/dev/null; then
    ok "playwright already installed"
else
    info "Installing playwright + chromium..."
    pip install $PIP_FLAGS playwright && playwright install chromium && playwright install-deps chromium 2>/dev/null
    ok "playwright installed"
fi

# ─── Step 3: npm global packages (MCP servers) ───
step "3/7 MCP Servers (npm global)"

NPM_GLOBAL="${HOME}/.npm-global"
mkdir -p "$NPM_GLOBAL"
npm config set prefix "$NPM_GLOBAL" 2>/dev/null
export PATH="${NPM_GLOBAL}/bin:${PATH}"

for pkg in "exa-mcp-server" "@google/gemini-cli" "zai-cli"; do
    if npm list -g "$pkg" &>/dev/null; then
        ok "$pkg already installed"
    else
        info "Installing $pkg..."
        npm install -g "$pkg" 2>/dev/null && ok "$pkg installed" || warn "$pkg failed"
    fi
done

# ─── Step 4: .env symlink ───
step "4/7 Environment Configuration"

ENV_SOURCE="${HOME}/.config/PAI/.env"
ENV_LINK="${PAI_ROOT}/.env"

if [[ -L "$ENV_LINK" ]]; then
    ok ".env symlink exists → $(readlink "$ENV_LINK")"
elif [[ -f "$ENV_LINK" && ! -L "$ENV_LINK" ]]; then
    # .env is a real file from git — move to .config/PAI/ and symlink
    mkdir -p "$(dirname "$ENV_SOURCE")"
    if [[ ! -f "$ENV_SOURCE" ]]; then
        cp "$ENV_LINK" "$ENV_SOURCE"
        chmod 600 "$ENV_SOURCE"
    fi
    ln -sf "$ENV_SOURCE" "$ENV_LINK"
    ok ".env moved to ${ENV_SOURCE} and symlinked"
elif [[ -f "$ENV_SOURCE" ]]; then
    ln -sf "$ENV_SOURCE" "$ENV_LINK"
    ok ".env symlinked from ${ENV_SOURCE}"
else
    warn ".env not found. Create ${ENV_SOURCE} with your API keys."
fi

# ─── Step 5: Brigade symlinks ───
step "5/7 Brigade Symlinks (Gemini CLI + OpenCode)"

create_symlinks() {
    local target_dir="$1"
    local label="$2"

    mkdir -p "$target_dir"

    # Core USER files
    for f in ABOUTME.md AISTEERINGRULES.md; do
        local src="${PAI_ROOT}/PAI/USER/${f}"
        local dst="${target_dir}/${f}"
        if [[ -f "$src" ]]; then
            ln -sf "$src" "$dst"
        fi
    done

    # TELOS files
    for f in MISSION.md GOALS.md CHALLENGES.md STATUS.md STRATEGIES.md BELIEFS.md WISDOM.md; do
        local src="${PAI_ROOT}/PAI/USER/TELOS/${f}"
        local dst="${target_dir}/${f}"
        if [[ -f "$src" ]]; then
            ln -sf "$src" "$dst"
        fi
    done

    local count
    count=$(find "$target_dir" -maxdepth 1 -type l 2>/dev/null | wc -l)
    ok "${label}: ${count} symlinks created in ${target_dir}"
}

# Gemini CLI
GEMINI_SHARED="${HOME}/.gemini/shared"
create_symlinks "$GEMINI_SHARED" "Gemini CLI"

# Copy GEMINI.md if exists in repo
if [[ -f "${PAI_ROOT}/PAI/config/GEMINI.md" ]]; then
    cp "${PAI_ROOT}/PAI/config/GEMINI.md" "${HOME}/.gemini/GEMINI.md"
    ok "GEMINI.md copied"
fi

# OpenCode
OPENCODE_SHARED="${HOME}/.config/opencode/shared"
create_symlinks "$OPENCODE_SHARED" "OpenCode"

# Copy AGENTS.md if exists in repo
if [[ -f "${PAI_ROOT}/PAI/config/AGENTS.md" ]]; then
    cp "${PAI_ROOT}/PAI/config/AGENTS.md" "${HOME}/.config/opencode/AGENTS.md"
    ok "AGENTS.md copied"
fi

# ─── Step 6: Hooks executable ───
step "6/7 Hooks Permissions"

HOOK_COUNT=0
if [[ -d "${PAI_ROOT}/hooks" ]]; then
    while IFS= read -r -d '' hook; do
        chmod +x "$hook"
        ((HOOK_COUNT++))
    done < <(find "${PAI_ROOT}/hooks" \( -name "*.ts" -o -name "*.sh" \) -print0 2>/dev/null)
    ok "${HOOK_COUNT} hooks made executable"
else
    warn "hooks/ directory not found"
fi

# Also make scripts executable
find "${PAI_ROOT}/scripts" -name "*.sh" -exec chmod +x {} \; 2>/dev/null
ok "scripts/ made executable"

# ─── Step 7: Verification ───
step "7/7 Verification"

PASS=0
TOTAL=0

check() {
    ((TOTAL++))
    if eval "$2" &>/dev/null; then
        ok "$1"
        ((PASS++))
    else
        fail "$1"
    fi
}

check "CLAUDE.md exists"           "[[ -f ${PAI_ROOT}/CLAUDE.md ]]"
check "Algorithm v4 exists"        "[[ -f ${PAI_ROOT}/PAI/Algorithm/v4.0.0.md ]]"
check "settings.json exists"       "[[ -f ${PAI_ROOT}/settings.json ]]"
check ".env accessible"            "[[ -f ${PAI_ROOT}/.env ]]"
check "Bun available"              "command -v bun"
check "notebooklm CLI available"   "command -v notebooklm"
check "Hooks executable"           "[[ -x ${PAI_ROOT}/hooks/ModeClassifier.hook.ts ]]"
check "Skills present"             "[[ -f ${PAI_ROOT}/skills/skill-index.json ]]"
check "TELOS present"              "[[ -f ${PAI_ROOT}/PAI/USER/TELOS/GOALS.md ]]"
check "BRIGADE present"            "[[ -f ${PAI_ROOT}/PAI/BRIGADE.md ]]"
check "MEMORY present"             "[[ -f ${PAI_ROOT}/MEMORY/MEMORY.md ]]"
check "Audit collector"            "[[ -x ${PAI_ROOT}/scripts/pai-audit-collector.sh ]]"
check "Gemini symlinks"            "[[ -L ${GEMINI_SHARED}/MISSION.md ]]"
check "OpenCode symlinks"          "[[ -L ${OPENCODE_SHARED}/MISSION.md ]]"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "  Result: ${GREEN}${PASS}/${TOTAL}${NC} checks passed"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

# ─── Manual steps reminder ───
echo ""
echo -e "${YELLOW}📋 Manual steps remaining:${NC}"
echo ""
echo "  1. Install Claude Code (if not installed):"
echo "     npm install -g @anthropic-ai/claude-code"
echo ""
echo "  2. NotebookLM auth (requires browser):"
echo "     notebooklm login"
echo ""
echo "  3. Verify API keys in .env:"
echo "     cat ~/.config/PAI/.env | grep -c '=.' "
echo "     (should show 40+ configured keys)"
echo ""
echo "  4. Add bash aliases to ~/.bashrc (optional, for proxy):"
echo '     function pai() { _ensure_proxy; claude "$@"; }'
echo '     function gemi() { _ensure_proxy; gemini --include-directories ~/.claude/PAI/USER/ "$@"; }'
echo ""
echo "  5. Start notification server (optional):"
echo "     bun ~/.claude/PAI/Tools/NotificationServer.ts &"
echo ""
echo "  6. Verify brigade health:"
echo "     bun ~/.claude/PAI/Tools/AgentZero.ts health"
echo "     notebooklm auth check"
echo ""
echo -e "${GREEN}PAI Bootstrap complete. Run 'claude' to start.${NC}"
