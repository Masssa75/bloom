---
name: ai-dev
description: Test and evaluate AI chat responses using realistic user scenarios. Use when testing AI quality, iterating on system prompts, or validating new features. Includes personas, scenarios, evaluation rubrics, and improvement tracking.
---

# AI-Dev: Collaborative AI Development Workflow

## Overview

AI-Dev is a **human-in-the-loop development workflow** for iteratively improving Bloom's AI chat responses. Claude proposes and executes; the user approves at key checkpoints.

**This is NOT fully autonomous.** User approval is required at decision points.

## When to Use

Invoke with `/ai-dev` or ask to "run the ai-dev workflow" when:
- Improving AI response quality
- Developing new scenario coverage
- Iterating on system prompts or components
- Validating AI behavior after changes

## The Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. PROPOSE SCENARIOS                                       │
│     Claude suggests 3-5 scenarios to test                   │
│     ⏸️  USER PICKS which scenario(s) to run                 │
├─────────────────────────────────────────────────────────────┤
│  2. WRITE SCENARIO                                          │
│     Claude writes full scenario text (persona, message)     │
│     ⏸️  USER APPROVES the scenario text                     │
├─────────────────────────────────────────────────────────────┤
│  3. RUN & EVALUATE                                          │
│     Claude runs scenario, captures response                 │
│     Claude evaluates against rubric, scores response        │
│     Claude presents findings                                │
├─────────────────────────────────────────────────────────────┤
│  4. SUGGEST IMPROVEMENTS                                    │
│     Claude identifies specific improvements                 │
│     ⏸️  USER PICKS which improvements to implement          │
├─────────────────────────────────────────────────────────────┤
│  5. IMPLEMENT                                               │
│     Claude implements approved improvements                 │
│     (system prompt, components, tools, etc.)                │
├─────────────────────────────────────────────────────────────┤
│  6. VERIFY                                                  │
│     Claude re-runs scenario to verify improvement           │
│     Updates dev-log.md with results                         │
│     ⏸️  USER DECIDES: iterate more or move on               │
└─────────────────────────────────────────────────────────────┘
```

**⏸️ = User approval checkpoint**

## Before Starting

Always read `dev-log.md` first to understand:
- Current state of each area (scores, status)
- What improvements have been tried
- What's in the backlog
- What to work on next

## Test Environment

**Test Child:** Alex (ID: `6e702a66-e366-4bb7-8eae-e62cae2b13a0`)
- Duplicate of Michael with all 24 documents
- Safe for experimentation without affecting real data

**Test Account:** `claude-test@bloom.wunderkind.world` / `TestPassword123!`

## Key Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This workflow overview |
| `dev-log.md` | Current state, backlog, history |
| `areas/*.md` | Detailed history per area |
| `scenarios/*.md` | Test scenario scripts |
| `evaluation-rubric.md` | Scoring criteria |

## Development Areas

| Area | Description | Status |
|------|-------------|--------|
| Crisis Response | Teacher in active escalation | Baseline: 8/10 |
| Parent Guidance | Parent seeking advice at home | Not tested |
| Pattern Analysis | Analytical questions about behavior | Not tested |
| Interview Mode | Discovery interviews for new children | Not tested |

## Quick Reference: Components

| Component | When to Use |
|-----------|-------------|
| `<urgent>` | Active crisis, immediate safety |
| `<script>` | Exact words to say in-the-moment |
| `<later>` | Follow-up steps when calm |
| `<insight>` | Key takeaway, explanation |
| `<note>` | Brief context, aside |

## Improvement Categories

When suggesting improvements, categorize them:

1. **System Prompt** - Changes to AI instructions
2. **Component Usage** - How/when components are used
3. **Tool Behavior** - What documents are fetched, how
4. **Response Structure** - Format, length, organization
5. **Content Quality** - Accuracy, specificity, case-awareness
