# Agent Orchestration

## Available Agents

### Custom (`.claude/agents/`)

| Agent              | Purpose                                       | When to Use                        |
|--------------------|-----------------------------------------------|------------------------------------|
| architect          | Architecture, contracts, and planning          | New features, refactoring, design  |
| code-reviewer      | Code review                                   | After writing code                 |
| security-reviewer  | Code-level vulnerability detection             | Before commits, auth/input changes |
| frontend-developer | Frontend implementation                        | UI features                        |
| backend-developer  | Backend implementation                         | API/DB features                    |
| business-analyst   | Requirements, process analysis                 | Stakeholder alignment, BRDs        |

## Documentation Structure

All planning and architecture artifacts are committed to git and kept up to date:

```
docs/
├── architecture.md              # single file — system design, components, data flow, tech choices
├── contracts.md                 # BE ↔ FE contracts (plain text, NOT OpenAPI)
├── roadmap.md                   # product roadmap — all features with statuses
└── plans/
    ├── user-auth.md             # implementation plan for a feature
    ├── order-management.md      # implementation plan for a feature
    └── notifications.md         # implementation plan for a feature
```

### `docs/roadmap.md` — Product Roadmap

Single file tracking all features and their statuses. **architect** updates it when starting or completing features.

Statuses: `not started` → `in progress` → `done`

Format:
```markdown
# Product Roadmap

| Feature              | Status       | Plan                              | Notes                    |
|----------------------|--------------|-----------------------------------|--------------------------|
| User authentication  | done         | [plan](plans/user-auth.md)        | Shipped 2026-03-10       |
| Order management     | in progress  | [plan](plans/order-management.md) | Phase 2 of 3             |
| Notifications        | not started  | —                                 | Blocked by order mgmt    |
| Analytics dashboard  | not started  | —                                 | Q3 priority              |
```

### `docs/architecture.md` — Architecture (single file)

System design, component responsibilities, data flow, technology choices with trade-offs. Updated when architectural decisions change.

### `docs/contracts.md` — BE ↔ FE Contracts

Plain-text contracts (NOT OpenAPI). For each endpoint: path, method, auth, request/response shapes, error codes.

Format:
```
## POST /v1/orders

Create a new order.

Auth: Bearer token (required)

Request:
  items        — array of { productId: string, quantity: int }
  deliveryDate — ISO 8601 date, optional
  comment      — string, max 500 chars, optional

Response (success):
  id           — UUID, created order
  status       — "created"
  totalPrice   — decimal, calculated server-side

Errors:
  EMPTY_CART         — items array is empty
  PRODUCT_NOT_FOUND  — one or more productId not found
  INVALID_QUANTITY   — quantity < 1 or > 999
```

### `docs/plans/<feature>.md` — Feature Plans (one per feature)

Each feature gets its own plan file. Plans are committed to git so history is preserved.

## Phased Workflow

Every non-trivial feature goes through three sequential phases. Do NOT skip phases or start implementation before the plan is approved.

### Phase 1 — Analysis & Architecture (parallel)

Launch **business-analyst** and **architect** in parallel:

| Agent                | Artifact                          | Content                                                    |
|----------------------|-----------------------------------|------------------------------------------------------------|
| **business-analyst** | `docs/requirements.md`            | Requirements, acceptance criteria, edge cases, constraints |
| **architect**        | `docs/architecture.md`            | Update system design if needed                             |
| **architect**        | `docs/contracts.md`               | Add/update BE ↔ FE contracts for the feature               |

Both agents work simultaneously — they produce independent artifacts.

### Phase 2 — Planning (sequential)

**architect** reads outputs from Phase 1 and produces:
1. `docs/plans/<feature>.md` — detailed implementation plan
2. Updates `docs/roadmap.md` — set feature status to `in progress`

Feature plan structure:
```markdown
# Feature: Order Management

## Overview
[2-3 sentence summary]

## Tasks

### Phase 1: Foundation

| Task                   | Agent              | Files / Scope          | Depends on | Status      |
|------------------------|--------------------|------------------------|------------|-------------|
| DB schema + migrations | backend-developer  | src/db/migrations/     | —          | not started |
| Component scaffolding  | frontend-developer | src/components/orders/ | —          | not started |
| Auth middleware         | backend-developer  | src/middleware/auth/    | DB schema  | not started |

Parallel: backend-developer (DB) + frontend-developer (scaffolding)
Sequential: Auth middleware waits for DB schema

### Phase 2: Core Logic
...

## Testing Strategy
...
```

Task statuses: `not started` → `in progress` → `done`

### Phase 3 — Implementation (maximum parallelism)

**BLOCKING REQUIREMENT:** Implementation agents (**backend-developer**, **frontend-developer**) MUST read their feature plan from `docs/plans/<feature>.md` before starting work. Do NOT implement without an architect's plan.

Launch implementation agents according to the plan. Key rules:

1. **Multiple agents of the same type** can run in parallel when their tasks don't overlap in files/scope
2. **Any agent type** can be parallelized — not just BE + FE, but also multiple backend-developers, multiple frontend-developers, or multiple security-reviewers
3. Each agent receives only its task scope — files it owns and the contracts/architecture it needs
4. Agents MUST NOT edit files outside their assigned scope
5. Agents update task status in `docs/plans/<feature>.md` as they work

```markdown
# GOOD: 4 agents in parallel (2 BE + 2 FE)

1. backend-developer:  DB schema + migrations     (src/db/)
2. backend-developer:  Email service integration   (src/services/email/)
3. frontend-developer: Order list page             (src/pages/orders/)
4. frontend-developer: Notification component      (src/components/notifications/)

# BAD: Sequential when tasks don't overlap

First BE does DB, then BE does email, then FE does orders, then FE does notifications
```

### Keeping artifacts up to date
- Agents update task statuses in `docs/plans/<feature>.md` as they complete work
- When all tasks are done, **architect** sets feature status to `done` in `docs/roadmap.md`
- When contracts change during implementation, **architect** updates `docs/contracts.md`
- Architecture changes require **architect** to update `docs/architecture.md` before implementation continues
- When requirements evolve, **business-analyst** updates `docs/requirements.md`

## Committing Changes

**ALL agents that modify files** MUST commit their changes automatically after completing a task or logical unit of work. Do NOT wait for the user to ask — commit immediately.

Follow git conventions from `.claude/rules/git.md`:
- **Conventional Commits** format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Imperative mood, summary under 72 characters, no period
- Body explains WHY, not WHAT
- One logical change per commit — do NOT batch unrelated tasks

Commit after:
- Completing a task from `docs/plans/<feature>.md`
- Finishing a Red-Green-Refactor TDD cycle (see `test-driven-development` skill)
- Adding/modifying a feature, endpoint, component, or migration
- Updating architecture, contracts, or plan documents
- Any other meaningful change to the codebase

## Immediate Agent Usage

No user prompt needed:

1. Non-trivial feature → **Phase 1–3 workflow** (analyst + architect → architect plans → implementation)
2. Simple bug fix or small change → BE/FE agents directly, follow **test-driven-development** skill
3. Code just written/modified → Use **code-reviewer** agent
4. Security-sensitive code → Use **security-reviewer** agent

## Parallel Execution Rules

1. **Always parallelize independent work** — never run agents sequentially when their tasks don't depend on each other
2. **Same-type agents in parallel** — multiple backend-developers or multiple frontend-developers can run simultaneously on non-overlapping tasks
3. **Cross-type agents in parallel** — BE + FE + security-reviewer can all run at the same time
4. **Non-overlapping scope is mandatory** — each parallel agent must have clearly separated file/directory boundaries to avoid merge conflicts
5. **Phase boundaries are sequential** — Phase 2 waits for Phase 1, Phase 3 waits for Phase 2

```markdown
# GOOD: Phase 1 — analyst + architect in parallel
1. business-analyst:   requirements analysis
2. architect:          system design + contracts

# GOOD: Phase 3 — 5 agents in parallel
1. backend-developer:  user service        (src/services/user/)
2. backend-developer:  order service       (src/services/order/)
3. backend-developer:  notification service (src/services/notification/)
4. frontend-developer: user profile page   (src/pages/profile/)
5. frontend-developer: order dashboard     (src/pages/orders/)

# BAD: Sequential when tasks are independent
First user service, then order service, then notification service...
```
