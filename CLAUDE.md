# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Interaction Style

**BLOCKING REQUIREMENT:** Your FIRST action on ANY user message MUST be calling the `AskUserQuestion` tool. Do NOT output text, do NOT read files, do NOT call any other tool before `AskUserQuestion`. The only exception is trivial tasks with exactly one reasonable approach (e.g., "fix this typo", "undo last change").

This applies to ALL request types:
- Feature request → propose architecture/approach variants
- Bug fix → propose fix strategies
- Refactoring → propose refactoring approaches
- Analysis or review → propose scope and depth
- Open-ended question → propose directions to explore
- Unclear request → propose interpretations of what the user might mean

### AskUserQuestion format

Always use the `questions` parameter with structured options — never ask questions as plain text.

Rules:
- 1–4 questions per call, 2–4 `options` each
- `header`: short chip label, max 12 chars (e.g. "Approach", "Scope", "Library")
- `label`: 1–5 words per option
- `description`: explain trade-offs or implications
- Mark your recommended option with `"(Recommended)"` at the end of `label`
- `preview`: use for code snippets, ASCII mockups, or layout comparisons — only when visual diff helps the decision
- `multiSelect: true` when choices are not mutually exclusive
- Users always get an automatic "Other" option with free-text input — do not add one manually

Example call:
```json
{
  "questions": [
    {
      "question": "Which approach should we use for caching?",
      "header": "Approach",
      "multiSelect": false,
      "options": [
        {
          "label": "Redis (Recommended)",
          "description": "Distributed cache, survives restarts, shared across instances"
        },
        {
          "label": "In-memory",
          "description": "Simpler setup, faster reads, but lost on restart and per-instance only"
        }
      ]
    }
  ]
}
```

After the user picks options — execute immediately, don't ask again.

## Committing

Do NOT ask "коммитить?" or "should I commit?" for confirmation. Just do it. The user will say when NOT to commit.

If the change is small and logically belongs to the previous commit (e.g. a quick fix, typo, or minor tweak right after committing) — use `git commit --amend` instead of creating a new commit.

## Custom Commands

- `/refactor <target>` — refactor a file, function, or module
- `/test-driven-development` — implement features using TDD workflow
- `/simplify` — review changed code for reuse, quality, and efficiency

## Agents

Use agents proactively — no user prompt needed for common workflows.

**Always run agents in foreground** (`run_in_background: false`) — the user wants to see agent work in real time.

### Phased workflow (non-trivial features)

1. **Phase 1 — Analysis & Architecture** (parallel): `business-analyst` + `architect` produce requirements, architecture, contracts
2. **Phase 2 — Planning** (sequential): `architect` creates `docs/plans/<feature>.md` with tasks, scopes, and parallelism
3. **Phase 3 — Implementation** (max parallelism): multiple agents of any type run in parallel on non-overlapping tasks

Multiple agents of the same type (e.g., 3× `backend-developer`) can run simultaneously when tasks don't overlap in files/scope.

### Agent reference

| Agent | When to use |
|-------|-------------|
| `architect` | Architecture, contracts, and implementation planning |
| `business-analyst` | Requirements gathering, process analysis |
| `backend-developer` | API/DB features (can run N instances in parallel) |
| `frontend-developer` | UI features (can run N instances in parallel) |
| `code-reviewer` | After writing/modifying code (auto-review) |
| `security-reviewer` | Auth, input handling, API endpoints, payments |
| `security-auditor` | Compliance audits (SOC2, PCI, HIPAA) |
| `silent-failure-hunter` | After implementation — find swallowed errors |
| `performance-optimizer` | Slow code, bundle size, memory leaks |
| `code-simplifier` | After implementation — reduce complexity |

## Skills

| Skill | Purpose |
|-------|---------|
| `agentic-engineering` | Eval-first loop, 15-min decomposition, model routing |
| `autonomous-loops` | Sequential pipelines, PR loops, de-sloppify, DAG orchestration |
| `continuous-learning` | Extract patterns from sessions into learned skills |
| `autonomous-agent-harness` | Crons, dispatch, persistent memory for autonomous operation |
| `test-driven-development` | TDD workflow (RED→GREEN→REFACTOR), enforced by BE/FE agents |
| `legal-advisor` | Contracts, compliance, IP protection, legal risk assessment |
| `prompt-engineer` | Prompt design, optimization, evaluation for LLMs |
| `react` | React/Next.js performance optimization (40+ rules) |
| `kotlin` | Kotlin coroutines, multiplatform, server-side patterns |
| `python` | Type-safe production Python, async patterns |
| `golang` | Concurrent Go, microservices, cloud-native |
| `javascript` | Modern JS (ES2023+), async, performance |
| `ui-ux-designer` | UI/UX design critique + Figma integration (use with Figma URLs) |

## Design System Rules

Spacing scale (only these values): 4, 8, 12, 16, 24, 32, 48, 64
- Padding inside cards: 24
- Gap between elements: 16
- Section spacing: 48

Border radius: 8 (cards), 6 (buttons), 4 (inputs)

Typography:
- H1: Inter Semi Bold 32/40
- H2: Inter Semi Bold 24/32
- Body: Inter Regular 16/24
- Caption: Inter Regular 14/20

All frames MUST use Auto Layout. No manual positioning.
Always set layoutSizingHorizontal = 'FILL' on child frames.
Never use absolute coordinates for layout — only padding and gap.

## Project Overview
<!-- Describe your project here -->

## Tech Stack
<!-- e.g.: Kotlin, Spring Boot, PostgreSQL -->

## Build & Run
<!-- e.g.: ./gradlew build, ./gradlew bootRun -->

## Test
<!-- e.g.: ./gradlew test -->
