---
name: scenario-testing
description: Test and evaluate AI chat responses using realistic user scenarios. Use when testing AI quality, iterating on system prompts, or validating new features. Includes personas, scenarios, evaluation rubrics, and improvement tracking.
---

# Scenario Testing Protocol

## Overview

This protocol tests Bloom's AI chat responses by simulating realistic user scenarios. The goal is to evaluate both **content quality** (accuracy, helpfulness, trauma-informed approach) and **presentation quality** (appropriate component usage, formatting).

## When to Use

- After changes to system prompts or AI configuration
- When adding new AI features or tools
- To validate AI responses for specific use cases
- For iterative improvement of response quality
- Before major releases

## Test Environment

**Test Child:** Alex (ID: `6e702a66-e366-4bb7-8eae-e62cae2b13a0`)
- Duplicate of Michael with all 24 documents
- Safe for experimentation without affecting real data
- Same case context as Michael (trauma history, triggers, interventions)

**Test Account:** `claude-test@bloom.wunderkind.world` / `TestPassword123!`

## Testing Workflow

### 1. Select Scenario
Choose from `scenarios/` folder based on what you're testing:
- **Urgent Crisis** - Teacher in active escalation
- **Parent Advice** - Parent seeking general guidance
- **Pattern Analysis** - Questions about behavioral patterns
- **Discovery Interview** - New child onboarding (manual only)

### 2. Run Scenario
Options:
- **Manual**: Copy scenario message, paste in chat UI, observe response
- **Script**: Use `scripts/run-scenario.ts` (may need updates for selectors)

### 3. Evaluate Response
Use the evaluation rubric in `evaluation-rubric.md`:
- Content accuracy (1-10)
- Component usage (appropriate/inappropriate)
- Trauma-informed approach (yes/no with notes)
- Case awareness (did it reference Alex's specific context?)

### 4. Document Results
Record in session logs:
- Scenario run
- Score and observations
- Identified improvements
- Changes made (if any)

### 5. Iterate
If improvements needed:
1. Update system prompt or component definitions
2. Re-run same scenario
3. Compare before/after
4. Document what worked

## Key Files

| File | Purpose |
|------|---------|
| `SKILL.md` | This protocol overview |
| `scenarios/*.md` | Detailed scenario scripts |
| `evaluation-rubric.md` | Scoring criteria |
| `improvement-log.md` | Track changes and their effects |

## Quick Reference

**Personas:**
- Teacher (in-classroom crisis)
- Parent (home behavior questions)
- Therapist (clinical coordination)
- Administrator (policy/documentation)

**Components to check:**
- `<urgent>` - Red card, immediate actions (max 3-4 bullets)
- `<script>` - Blue card, exact words to say
- `<later>` - Collapsible, follow-up steps
- `<insight>` - Green card, key takeaways
- `<note>` - Gray aside, context

**Good response traits:**
- Uses case context (mentions Alex's specific triggers, history)
- Trauma-informed language (safety, regulation, co-regulation)
- Actionable and specific (not generic advice)
- Appropriate urgency level (crisis vs. reflection)
- Cites documents when relevant
