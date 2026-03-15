# Research PAI USER dir design intent

**Agent:** Explore
**Captured:** 2026-03-13T13:44:02+03:00
**Tool Use ID:** toolu_01QgkSPYz1DMBDUxX79t9FsS
**Tokens:** 63220
**Duration:** 71s
**Source:** PostToolUse hook capture

---

Perfect! Now I have enough information. Let me compile my comprehensive report on Miessler's design intent.

## DESIGN INTENT BEHIND PAI's USER DIRECTORY STRUCTURE

Based on my thorough analysis of the PAI documentation, here's Daniel Miessler's vision for the USER directory structure:

---

### THE CORE PHILOSOPHY

The **PAI/USER/** directory is fundamentally a **Personal Knowledge Operating System** — a comprehensive scaffold that captures:
- **Who you are** (identity, preferences, beliefs)
- **What you're working toward** (missions, goals, projects)  
- **What you know** (domains, processes, templates)
- **How you work** (workflows, business context, skill preferences)

This is not a filing cabinet. It's a **context engine** that feeds into every AI interaction, allowing PAI to make decisions *with knowledge of your situation* rather than in a vacuum.

---

### THE DESIGN HIERARCHY

Miessler organized USER/ around a **Maslow's-hierarchy-of-needs-style** progression:

#### **Level 1: IDENTITY (The Foundation)**
- `ABOUTME.md` — Who are you? Background, expertise, interests
- `DAIDENTITY.md` — What's your AI's name and personality?
- `WRITINGSTYLE.md` — How do you prefer to communicate?
- `AISTEERINGRULES.md` — Personal AI behavior overrides (your rules supersede system defaults)
- `OPINIONS.md` — Preferences that help AI adapt to you

**Intent:** PAI cannot personalize without self-knowledge. These files are the **baseline context** loaded at every session.

---

#### **Level 2: PURPOSE & DIRECTION (TELOS - "The End Toward Which Actions Are Directed")**
```
TELOS/
├── MISSION.md          # Ultimate purposes (M0, M1, M2...)
├── GOALS.md            # Specific objectives (G0, G1...)
├── CHALLENGES.md       # Obstacles blocking you (C0, C1...)
├── STRATEGIES.md       # How to overcome them (S0, S1...)
├── BELIEFS.md          # Core values guiding decisions (B0, B1...)
├── FRAMES.md           # Useful perspectives (FR0, FR1...)
├── MODELS.md           # Mental models of how things work (MO0, MO1...)
├── LEARNED.md          # Hard-won lessons
└── PROBLEMS.md         # World problems you're solving
```

**Intent:** A **connected graph** (not a linear list). Every goal links to which mission it supports. Every challenge identifies which strategy addresses it. Every project traces back to which mission it serves.

This creates a **meaning hierarchy**: Strategic decisions can be traced from tactical work → goals → missions → ultimate purpose.

Example from the system:
```
M1: Increase human flourishing through technology
  ├── G1: Launch AI tool (supports M1, blocked by C1, strategy S1)
  ├── G2: Write book (supports M1, blocked by C2, strategy S2)
  ├── C1: Time management issues (addressed by S1)
  └── S1: Time blocking system (enables G1, G3)
```

---

#### **Level 3: DOMAIN EXPERTISE (DOMAINS/)**

```
DOMAINS/
└── construction/              # Example: Your domain(s)
    ├── STRATEGY.md           # Business strategy in this domain
    ├── timber_frame/         # Specialized subdomain (TF engineering)
    ├── normatives/           # Regulatory docs distilled
    ├── templates/            # Reusable projects & components
    │   ├── projects/         # Full project templates (Gazebo, Carport, Terrace, Veranda)
    │   └── components/       # Reusable technical nodes (Roof, Foundation, Glazing, Electrical)
    ├── processes/            # Business processes (Lead-to-Cash, Onboarding, Change Orders)
    ├── market/               # Market intelligence & pricing
    └── reference/            # Supporting materials
```

**Intent:** **Compress domain expertise into structure**. Not just documents scattered in Obsidian—but organized hierarchically:
- **STRATEGY** answers *why* this domain matters
- **Normatives** contain distilled regulatory constraints (not raw law)
- **Templates** are **copy-paste starting points** for recurring work
- **Processes** are repeatable workflows (Lead-to-Cash, Onboarding, etc.)
- **Market intelligence** feeds pricing and positioning

When you ask PAI about construction, it doesn't search the internet—it reads this structure and knows:
- What rules apply (normatives)
- What patterns work (templates)
- What your strategy is (STRATEGY.md)
- What competitors charge (market intelligence)

---

#### **Level 4: EXECUTION INFRASTRUCTURE**

##### **4A: WORK TRACKING & PROJECTS**

```
WORK/                          # Client/consulting context
├── Consulting/
│   ├── clients/              # Per-client context
│   └── templates/            # Proposal/report templates
└── Resources/                # Professional resources

PROJECTS/                      # Project registry
├── PROJECTS.md              # Master registry
├── website.md               # Per-project context
└── api.md
```

**Intent:** Separate professional work context from personal life context. When working with a client, PAI loads `WORK/clients/{client}/` automatically to provide project-specific context.

---

##### **4B: WORKFLOW ORCHESTRATION**

```
FLOWS/                        # High-level flow definitions
├── flow1.json              # Trigger → sequence → result

PIPELINES/                    # Data pipeline configs
├── content-ingest.yaml     # Actions chained in sequence

ACTIONS/                      # Reusable automation
├── extract/
├── transform/
├── format/
└── social/
```

**Intent:** Three-level execution model:
- **ACTIONS** = atomic units (extract, label, send email)
- **PIPELINES** = chain actions in sequence (extract → label → email)
- **FLOWS** = schedule pipelines + source → destination (RSS feed → every 30min → email)

This mirrors the Arbol cloud system but lets you define **personal automation** before deploying to cloud.

---

##### **4C: TERMINAL & STATUSLINE**

```
TERMINAL/                     # Terminal configuration
├── kitty.conf              # Terminal theme, colors

STATUSLINE/                   # Status line display
├── README.md               # Customization guide
```

**Intent:** Personal environment configurations so PAI can enhance your local tooling with awareness of work state (e.g., tab colors change based on work status).

---

#### **Level 5: SKILL CUSTOMIZATIONS**

```
SKILLCUSTOMIZATIONS/
├── Research/PREFERENCES.md    # "Prefer academic sources, APA citations"
├── Media/PREFERENCES.md       # "Always use 1080p, 30fps, brand colors"
├── TFContent/PREFERENCES.md   # "Timber Frame expertise overrides"
```

**Intent:** Every skill in PAI has defaults. This directory overrides them **per user**. When the Research skill activates, it checks:
```
SKILLCUSTOMIZATIONS/Research/PREFERENCES.md
```
and adapts its behavior accordingly.

This is **skill personalization without forking the skill itself**.

---

#### **Level 6: BUSINESS CONTEXT**

```
BUSINESS/
├── COMPANY.md              # Company overview, mission, products
├── MEDIAKIT.md             # Press & partnership materials
├── TEMPLATES/              # Proposal, NDA, SOW templates
└── BRAND.md                # Brand guidelines, tone, visual identity
```

**Intent:** When PAI writes marketing copy, proposals, or business communications, it reads this context. Not generic output—context-aware, on-brand, aligned with your stated company mission.

---

#### **Level 7: INFRASTRUCTURE & SECURITY**

```
PAISECURITYSYSTEM/
├── PROJECTRULES.md         # Per-project security rules
├── QUICKREF.md             # Security patterns quick reference
```

**Intent:** Security policies live alongside work context. When working on sensitive projects, PAI knows which safeguards apply.

---

### THE INTENDED USER JOURNEY

Miessler designed this for **progressive accumulation**:

#### **Phase 1: Quick Start** (30 minutes)
```
1. Create ABOUTME.md — "Who am I?"
2. Create DAIDENTITY.md — "What's my AI's name?"
3. Add AISTEERINGRULES.md — "How should AI behave for me?"
```

At this point, PAI has baseline personalization.

---

#### **Phase 2: Direction & Purpose** (1-2 hours)
```
1. Fill TELOS/MISSION.md — "What am I ultimately trying to do?"
2. Add TELOS/GOALS.md — "What specific outcomes support that?"
3. Cross-reference them
```

Now PAI understands your strategic intent and can make better tactical suggestions.

---

#### **Phase 3: Domain Expertise** (Ongoing, 2-4 hours per domain)
```
1. Create DOMAINS/{YourDomain}/STRATEGY.md — Business/research strategy
2. Add DOMAINS/{YourDomain}/templates/ — Copy-paste starting points
3. Add DOMAINS/{YourDomain}/processes/ — Repeatable workflows
4. Distill key normatives/constraints into DOMAINS/{YourDomain}/normatives/
5. Capture market intelligence in DOMAINS/{YourDomain}/market/
```

Each domain becomes **self-contained**. When you ask about construction, PAI reads the entire construction/ subtree.

---

#### **Phase 4: Automation & Workflows** (Advanced, ongoing)
```
1. Create ACTIONS/ — Repeatable automations
2. Create PIPELINES/ — Chain actions together
3. Create FLOWS/ — Schedule pipelines on cron
4. Customize SKILLCUSTOMIZATIONS/ — Personalize skill behavior
```

Now PAI can not just *answer questions* about your domain, but *automate work* in it.

---

#### **Phase 5: Professional Context** (As needed)
```
1. Add WORK/ — Client context, proposals, reports
2. Add PROJECTS/ — Project registry
3. Add BUSINESS/ — Brand, company info, templates
```

Professional outputs become context-aware and on-brand.

---

### HOW THEY WORK TOGETHER

This is **not seven independent silos**. They form a **directed graph**:

```
TELOS (Purpose)
  ├── informs GOALS
  ├── informs PROJECTS
  └── informs BUSINESS strategy

DOMAINS (Expertise)
  ├── populated from WORK (client projects)
  ├── populated from TELOS/PROBLEMS (problems you're solving)
  ├── referenced by SKILLCUSTOMIZATIONS (TFContent overrides)
  └── executed via ACTIONS/PIPELINES/FLOWS

PROJECTS
  ├── linked to TELOS/GOALS
  ├── reference DOMAINS expertise
  └── track in WORK context

WORK
  ├── uses BUSINESS templates
  ├── follows BUSINESS brand guidelines
  ├── references DOMAINS for technical context
  └── tracked via PROJECTS
```

**The unified effect:** When you ask PAI a question, it has access to:
- Your identity and preferences (ABOUTME, DAIDENTITY)
- Your strategic context (TELOS)
- Your domain expertise (DOMAINS)
- Your current projects (PROJECTS)
- Your professional context (WORK, BUSINESS)
- Your automation rules (ACTIONS, PIPELINES, FLOWS)
- Your skill customizations (SKILLCUSTOMIZATIONS)

Every answer is **yours**, not generic.

---

### THE DEEPER PHILOSOPHY

Miessler's vision rests on **three principles**:

1. **Context is King**  
   Generic AI is useless. Personalized AI (with deep context) is powerful. This directory structure is a **context capture system**.

2. **Structure Enables Scale**  
   Without structure, personal knowledge becomes scattered and useless. With structure (DOMAINS organized hierarchically, TELOS creating connections), your expertise becomes **computable**.

3. **Progressive Accumulation**  
   You don't need to fill every file on day one. You start simple (ABOUTME, DAIDENTITY) and add detail over time. The system grows with you.

---

### WHAT THIS ENABLES

With this structure properly populated, PAI can:

1. **Write context-aware business proposals** (using BUSINESS templates + WORK client context)
2. **Make strategic recommendations** (by tracing GOALS → MISSIONS → STRATEGIES)
3. **Automate domain-specific workflows** (via ACTIONS/PIPELINES/FLOWS informed by DOMAINS)
4. **Personalize skill behavior** (via SKILLCUSTOMIZATIONS)
5. **Maintain project integrity** (via PROJECTS registry)
6. **Compound expertise over time** (by capturing learnings → TELOS/LEARNED and updating DOMAINS templates)

---

### KEY FILES & THEIR RELATIONSHIPS

| File | Purpose | Used By | Links To |
|------|---------|---------|----------|
| ABOUTME.md | Identity | Every interaction | DAIDENTITY, AISTEERINGRULES |
| TELOS/MISSION.md | Ultimate purpose | Strategic decisions | TELOS/GOALS, PROJECTS, DOMAINS |
| TELOS/GOALS.md | Specific objectives | Project planning | MISSIONS, CHALLENGES, PROJECTS |
| DOMAINS/{domain}/ | Expertise structure | All domain questions | PROJECTS, WORK, TELOS/PROBLEMS |
| DOMAINS/{domain}/templates/ | Reusable starting points | Action/execution | WORK, PROCESSES |
| PROJECTS/ | Project registry | Project-specific context | TELOS/GOALS, WORK, DOMAINS |
| WORK/ | Professional context | Client communication | BUSINESS, PROJECTS, DOMAINS |
| BUSINESS/ | Brand & company | Proposals, marketing | WORK, PROJECTS |
| SKILLCUSTOMIZATIONS/ | Skill overrides | Skill execution | Per-skill configs |
| ACTIONS/PIPELINES/FLOWS | Automation | Scheduled/manual execution | DOMAINS (expertise), WORK (context) |

---

### THE VISION IN ONE SENTENCE

**The USER directory transforms PAI from a generic Q&A system into a personal operating system that knows your identity, purpose, expertise, projects, and workflows—and uses that knowledge to amplify your capabilities.**

This is Miessler's contribution: Not "AI that answers questions," but **"AI that understands you."**